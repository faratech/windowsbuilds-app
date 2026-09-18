<?php

namespace WindowsBuilds\Service;

use GuzzleHttp\Client;

class EdgeUpdates
{
    private $client;
    private $cacheFile = '/web/ai/json/edge_builds_cache.json';
    private $cacheTTL = 3600; // 1 hour cache
    /** How far back merged release history is allowed to grow. */
    private $historyRetentionDays = 550;
    
    public function __construct()
    {
        $this->client = new Client();
    }
    
    public function getLatestBuilds($view = 'both')
    {
        $cacheData = $this->getCachedData();
        
        if ($cacheData && (time() - ($cacheData['timestamp'] ?? 0) <= $this->cacheTTL)) {
            return $cacheData['data'] ?? [];
        }

        // Get existing cached data to preserve historical entries
        // Even if cache is expired, we want to preserve the historical data
        $existingProducts = [];
        if ($cacheData && isset($cacheData['data'])) {
            foreach ($cacheData['data'] as $product) {
                if (!empty($product['Product'])) {
                    $existingProducts[$product['Product']] = $product;
                }
            }
        }
        
        // Fetch from both consumer and enterprise endpoints
        $consumerUrl = 'https://edgeupdates.microsoft.com/api/products';
        $enterpriseUrl = 'https://edgeupdates.microsoft.com/api/products?view=enterprise';
        
        $productMap = $existingProducts; // Start with existing data
        
        try {
            // Fetch consumer data
            $consumerResponse = $this->client->get($consumerUrl);
            $consumerData = json_decode($consumerResponse->getBody()->getContents(), true);

            // Fetch enterprise data
            $enterpriseResponse = $this->client->get($enterpriseUrl);
            $enterpriseData = json_decode($enterpriseResponse->getBody()->getContents(), true);

            // A truncated/failed response decodes to null; iterating it would
            // spam warnings and silently drop every product.
            if (!is_array($consumerData) || !is_array($enterpriseData)) {
                throw new \RuntimeException('Edge updates API returned invalid JSON');
            }
            
            // Process enterprise data first (has more builds)
            foreach ($enterpriseData as $product) {
                $productName = $product['Product'] ?? '';
                if ($productName === '') {
                    continue;
                }
                $this->mergeProductReleases($productMap, $productName, $product);
            }

            // Process consumer data (may have additional channels like Canary)
            foreach ($consumerData as $product) {
                $productName = $product['Product'] ?? '';
                if ($productName === '') {
                    continue;
                }
                $this->mergeProductReleases($productMap, $productName, $product);
            }

            // Sort releases by version for each product
            foreach ($productMap as &$product) {
                if (!empty($product['Releases']) && is_array($product['Releases'])) {
                    usort($product['Releases'], function($a, $b) {
                        return version_compare($b['ProductVersion'], $a['ProductVersion']);
                    });

                    // Bound history growth: the merge used to keep every release
                    // ever seen, so every expired-TTL request re-parsed and
                    // re-wrote an ever-larger JSON file. Mirror Office365's
                    // rolling window; unparseable timestamps are kept.
                    $cutoff = time() - ($this->historyRetentionDays * 86400);
                    $product['Releases'] = array_values(array_filter(
                        $product['Releases'],
                        function($release) use ($cutoff) {
                            $ts = strtotime((string) ($release['PublishedTime'] ?? '')) ?: 0;
                            return $ts === 0 || $ts >= $cutoff;
                        }
                    ));
                }
            }
            unset($product);

            $allProducts = array_values($productMap);
            $this->saveCacheData($allProducts);

            return $allProducts;
        } catch (\Exception $e) {
            // Return cached data if available, even if expired
            if ($cacheData) {
                return $cacheData['data'] ?? [];
            }
            return [];
        }
    }
    
    private function mergeProductReleases(&$productMap, $productName, $newProduct)
    {
        if (!isset($productMap[$productName])) {
            $productMap[$productName] = $newProduct;
        } else {
            // Merge releases, preserving historical data
            $existingReleases = $productMap[$productName]['Releases'] ?? [];
            $newReleases = $newProduct['Releases'] ?? [];
            
            // Create a map of existing releases
            $releaseMap = [];
            foreach ($existingReleases as $release) {
                $key = $this->getReleaseKey($release);
                $releaseMap[$key] = $release;
            }
            
            // Add new releases (only unique ones)
            foreach ($newReleases as $release) {
                $key = $this->getReleaseKey($release);
                if (!isset($releaseMap[$key])) {
                    $releaseMap[$key] = $release;
                }
            }
            
            $productMap[$productName]['Releases'] = array_values($releaseMap);
        }
    }
    
    private function getReleaseKey($release)
    {
        // Create unique key for each release
        return $release['ProductVersion'] . '_' . 
               $release['Platform'] . '_' . 
               $release['Architecture'] . '_' .
               ($release['ReleaseId'] ?? '');
    }
    
    public function getChannelBuilds($channel = 'Stable', $platform = null, $architecture = null)
    {
        $allBuilds = $this->getLatestBuilds();
        
        foreach ($allBuilds as $product) {
            if ($product['Product'] === $channel) {
                $releases = $product['Releases'] ?? [];
                
                if ($platform || $architecture) {
                    $releases = array_filter($releases, function($release) use ($platform, $architecture) {
                        $platformMatch = !$platform || $release['Platform'] === $platform;
                        $archMatch = !$architecture || $release['Architecture'] === $architecture;
                        return $platformMatch && $archMatch;
                    });
                }
                
                return array_values($releases);
            }
        }
        
        return [];
    }
    
    public function getAllChannels()
    {
        $allBuilds = $this->getLatestBuilds();
        $channels = [];
        
        foreach ($allBuilds as $product) {
            if (isset($product['Product']) && $product['Product'] !== 'EdgeUpdate') {
                $channels[] = $product['Product'];
            }
        }
        
        return $channels;
    }
    
    public function formatBuildInfo($release)
    {
        $info = [
            'version' => $release['ProductVersion'] ?? 'Unknown',
            'platform' => $release['Platform'] ?? 'Unknown',
            'architecture' => $release['Architecture'] ?? 'Unknown',
            'published' => isset($release['PublishedTime']) ? 
                date('F j, Y', strtotime($release['PublishedTime'])) : 'Unknown',
            'publishedTimestamp' => isset($release['PublishedTime']) ? 
                strtotime($release['PublishedTime']) : 0,
            'cves' => $release['CVEs'] ?? [],
            'artifacts' => []
        ];
        
        if (isset($release['Artifacts'])) {
            foreach ($release['Artifacts'] as $artifact) {
                $info['artifacts'][] = [
                    'type' => $artifact['ArtifactName'] ?? 'Unknown',
                    'url' => $artifact['Location'] ?? '',
                    'size' => isset($artifact['SizeInBytes']) ? 
                        $this->formatBytes($artifact['SizeInBytes']) : 'Unknown',
                    'sizeBytes' => $artifact['SizeInBytes'] ?? 0,
                    'hash' => $artifact['Hash'] ?? ''
                ];
            }
        }
        
        return $info;
    }
    
    private function getCachedData()
    {
        if (file_exists($this->cacheFile)) {
            $data = json_decode(file_get_contents($this->cacheFile), true);
            return $data;
        }
        return null;
    }
    
    private function saveCacheData($data)
    {
        // tmp+rename so a concurrent reader never sees a torn JSON file.
        $tmp = $this->cacheFile . '.' . getmypid() . '.tmp';
        if (file_put_contents($tmp, json_encode(['timestamp' => time(), 'data' => $data]), LOCK_EX) !== false) {
            rename($tmp, $this->cacheFile);
        }
    }
    
    private function formatBytes($bytes)
    {
        // Negative/garbage input would produce false/NaN output.
        if (!is_numeric($bytes) || $bytes <= 0) return '0 B';

        $k = 1024;
        $sizes = ['B', 'KB', 'MB', 'GB'];
        // Clamp the exponent so multi-TB values can't index past the list.
        $i = min((int) floor(log($bytes) / log($k)), count($sizes) - 1);

        return round($bytes / pow($k, $i), 2) . ' ' . $sizes[$i];
    }
}