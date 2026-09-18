<?php

namespace WindowsBuilds\Service;

class Office365
{
    private $app;
    private $cacheFile = '/web/ai/json/office365_builds_cache.json';
    private $cacheTTL = 3600; // 1 hour cache
    private $cabUrl = 'https://officecdn.microsoft.com/pr/wsus/releasehistory.cab';
    /** How far back the merged history cache is allowed to grow. */
    private $historyRetentionDays = 550;
    private $tempDir;

    public function __construct()
    {
        $this->app = \XF::app();

        // Per-process scratch dir: concurrent workers used to share one
        // predictable path, so two simultaneous CAB downloads could interleave
        // writes and feed each other truncated archives.
        // NB: sys_get_tmp_dir() is unavailable in some PHP builds here — fall back.
        $base = '/tmp';
        if (function_exists('sys_get_tmp_dir')) {
            $sysTmp = @sys_get_tmp_dir();
            if ($sysTmp && is_dir($sysTmp) && is_writable($sysTmp)) {
                $base = rtrim($sysTmp, '/');
            }
        }
        $this->tempDir = $base . '/office365_extract_'
            . getmypid() . '_' . bin2hex(random_bytes(4)) . '/';
        if (!is_dir($this->tempDir)) {
            mkdir($this->tempDir, 0700, true);
        }
    }

    public function __destruct()
    {
        // Best-effort cleanup of this process's scratch dir. Recursive:
        // extraction creates nested subdirectories, which a flat glob+unlink
        // left behind (per-PID 0700 dirs leaked in /tmp until tmpwatch).
        if ($this->tempDir && is_dir($this->tempDir)) {
            $it = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($this->tempDir, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($it as $item) {
                $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
            }
            @rmdir($this->tempDir);
        }
    }
    
    public function getLatestBuilds()
    {
        $cacheData = $this->getCachedData();
        
        if ($cacheData && (time() - ($cacheData['timestamp'] ?? 0) <= $this->cacheTTL)) {
            return $cacheData['data'] ?? [];
        }
        
        // Get existing cached data to preserve historical entries
        // Even if cache is expired, we want to preserve the historical data
        $existingBuilds = [];
        if ($cacheData && isset($cacheData['data'])) {
            foreach ($cacheData['data'] as $build) {
                // Create a unique key based on build identifiers
                $key = $this->getBuildKey($build);
                $existingBuilds[$key] = $build;
            }
        }
        
        try {
            // Download and extract CAB file
            $newBuilds = $this->fetchAndExtractCabData();
            
            if ($newBuilds) {
                // Merge new builds with existing historical data
                $allBuilds = $this->mergeBuildsWithHistory($existingBuilds, $newBuilds);
                $this->saveCacheData($allBuilds);
                return $allBuilds;
            }
        } catch (\Exception $e) {
            error_log("Office365 service error: " . $e->getMessage());
        }
        
        // Return cached data if available, even if expired
        if ($cacheData) {
            return $cacheData['data'] ?? [];
        }
        
        return [];
    }
    
    private function fetchAndExtractCabData()
    {
        // Download CAB file
        $cabFile = $this->tempDir . 'releasehistory.cab';
        
        try {
            $client = $this->app->http()->client();
            // Bounded timeouts (2026-08 audit): XF's shared client sets none,
            // so a hung CDN connection blocked the whole request.
            $response = $client->get($this->cabUrl, [
                'timeout' => 15,
                'connect_timeout' => 5,
            ]);
            $status = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : 0;
            $cabContent = $response->getBody()->getContents();

            if ($status !== 200) {
                throw new \Exception("Unexpected HTTP status {$status}");
            }
            if (empty($cabContent)) {
                throw new \Exception("Downloaded CAB file is empty");
            }
            if (strlen($cabContent) < 1024 || substr($cabContent, 0, 4) !== 'MSCF') {
                // Truncated/proxy-mangled body: reject before extraction rather
                // than silently degrading to yesterday's cache.
                throw new \Exception("Downloaded CAB failed sanity check (size " . strlen($cabContent) . ", magic missing)");
            }

            file_put_contents($cabFile, $cabContent);
            
            if (!file_exists($cabFile) || filesize($cabFile) === 0) {
                throw new \Exception("Failed to save CAB file or file is empty");
            }
        } catch (\Exception $e) {
            error_log("Office365: Failed to download CAB file: " . $e->getMessage());
            throw new \Exception("Failed to download Office 365 update data: " . $e->getMessage());
        }
        
        // Extract XML from CAB file
        $xmlFile = $this->tempDir . 'ReleaseHistory.xml';  // Use correct case
        
        // Try cabextract first since it's most reliable
        if ($this->extractWithSystemCabextract($cabFile, $xmlFile)) {
            // Successfully extracted with cabextract
        } elseif ($this->extractWithExtractCab($cabFile, $xmlFile)) {
            // Successfully extracted with ExtractCab.php
        } elseif ($this->extractCabWithPhp($cabFile, $xmlFile)) {
            // Successfully extracted with PHP
        } else {
            error_log("Office365: All extraction methods failed, using fallback cache");
        }
        
        if (!file_exists($xmlFile)) {
            // Cleanup CAB file and return empty array to trigger fallback
            @unlink($cabFile);
            error_log("Office365: Failed to extract XML from CAB file using all available methods");
            return [];
        }
        
        // Parse XML content
        $xmlContent = @file_get_contents($xmlFile);
        
        // Validate XML content before parsing
        if (empty($xmlContent)) {
            // Cleanup and return empty array to trigger fallback
            @unlink($cabFile);
            @unlink($xmlFile);
            error_log("Office365: Extracted XML file is empty");
            return [];
        }
        
        // Use libxml_use_internal_errors to suppress warnings
        $previousUseErrors = libxml_use_internal_errors(true);
        libxml_clear_errors();
        
        // Try to parse the XML - handle potential namespace issues
        $xml = @simplexml_load_string($xmlContent, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NOBLANKS);
        
        // Check for errors
        $errors = libxml_get_errors();
        libxml_use_internal_errors($previousUseErrors);
        
        if (!$xml || !empty($errors)) {
            $errorMessage = "Failed to parse XML content";
            if (!empty($errors)) {
                $firstError = reset($errors);
                $errorMessage .= ": " . $firstError->message;
            }
            
            // Log the first 500 characters of XML for debugging
            error_log("Office365: XML parsing failed. " . $errorMessage);
            error_log("Office365: First 500 chars of XML: " . substr($xmlContent, 0, 500));
            
            // Cleanup and return empty array to trigger fallback
            @unlink($cabFile);
            @unlink($xmlFile);
            return [];
        }
        
        try {
            $builds = $this->parseOfficeBuilds($xml);
        } catch (\Exception $e) {
            error_log("Office365: Failed to parse Office builds: " . $e->getMessage());
            $builds = [];
        }
        
        // Cleanup temporary files
        @unlink($cabFile);
        @unlink($xmlFile);
        
        return $builds;
    }
    
    private function parseOfficeBuilds($xml)
    {
        $builds = [];
        
        if (!isset($xml->UpdateChannel)) {
            return $builds;
        }
        
        foreach ($xml->UpdateChannel as $channel) {
            $channelAttributes = $channel->attributes();
            $channelName = (string)$channelAttributes->Name;
            $channelId = (string)$channelAttributes->ID;
            $channelDisplayName = (string)$channelAttributes->DisplayName;
            
            if (!isset($channel->Update)) {
                continue;
            }
            
            foreach ($channel->Update as $update) {
                $build = $this->parseUpdate($update, $channelName, $channelId, $channelDisplayName);
                if ($build) {
                    $builds[] = $build;
                }
            }
        }
        
        // Sort by release date descending (newest first)
        usort($builds, function($a, $b) {
            return $b['release_date_timestamp'] - $a['release_date_timestamp'];
        });
        
        return $builds;
    }
    
    private function extractCabWithPhp($cabFile, $xmlFile)
    {
        // PHP-based CAB extraction using binary parsing
        // CAB files have a specific header format we can parse
        
        $cabData = file_get_contents($cabFile);
        if (!$cabData) {
            return false;
        }
        
        // CAB file signature should be 'MSCF' at the beginning
        if (substr($cabData, 0, 4) !== 'MSCF') {
            return false;
        }
        
        // Look for XML content in the CAB file
        // Office CAB files often store XML as compressed data
        // For this specific CAB file, we can search for the XML content pattern
        
        // Try to find XML declaration or Office-specific tags
        $xmlStart = strpos($cabData, '<?xml');
        if ($xmlStart === false) {
            $xmlStart = strpos($cabData, '<ReleaseHistory');
        }
        
        if ($xmlStart === false) {
            return false;
        }
        
        // Find the end of the XML
        $xmlEnd = strpos($cabData, '</ReleaseHistory>');
        if ($xmlEnd === false) {
            return false;
        }
        
        $xmlEnd += strlen('</ReleaseHistory>');
        $xmlContent = substr($cabData, $xmlStart, $xmlEnd - $xmlStart);
        
        // Clean up any null bytes or extra characters
        $xmlContent = trim($xmlContent);
        $xmlContent = str_replace("\0", "", $xmlContent);
        
        // Validate XML
        $testXml = simplexml_load_string($xmlContent);
        if (!$testXml) {
            return false;
        }
        
        // Save the extracted XML
        return file_put_contents($xmlFile, $xmlContent) !== false;
    }
    
    private function extractWithExtractCab($cabFile, $xmlFile)
    {
        try {
            // Use our custom ExtractCab class
            require_once __DIR__ . '/ExtractCab.php';
            $extractor = new ExtractCab();
            
            // Try to extract files
            $extractedFiles = $extractor->extract($cabFile, $this->tempDir);
            
            // Look for the XML file in extracted files
            foreach ($extractedFiles as $file) {
                if (basename($file) === 'ReleaseHistory.xml') {
                    // Copy to expected location
                    return copy($file, $xmlFile);
                }
            }
            
            // If no files were extracted, try the list method to get file info
            // and use our built-in extraction methods
            $files = $extractor->listFiles($cabFile);
            
            if (!empty($files)) {
                // Files exist but extraction failed, probably due to compression
                // Fall back to other methods
                return false;
            }
            
        } catch (\Exception $e) {
            error_log("ExtractCab error: " . $e->getMessage());
        }
        
        return false;
    }
    
    private function getBuildKey($build)
    {
        // Create unique key for each build to prevent duplicates
        // Use build number, version, channel, and pub_time for uniqueness
        return md5(
            ($build['build_number'] ?? '') . 
            ($build['version'] ?? '') . 
            ($build['channel_name'] ?? '') . 
            ($build['pub_time'] ?? '')
        );
    }
    
    /**
     * Best-effort epoch for either record shape (PHP's own or the Python
     * backend's, which carries `releaseDate` instead of timestamps).
     */
    private static function buildTs(array $build): int
    {
        foreach (['release_date_timestamp', 'created_timestamp'] as $k) {
            if (!empty($build[$k])) {
                return (int) $build[$k];
            }
        }
        foreach (['pub_time', 'releaseDate'] as $k) {
            if (!empty($build[$k])) {
                $ts = strtotime((string) $build[$k]);
                if ($ts) {
                    return $ts;
                }
            }
        }
        return 0;
    }

    private function mergeBuildsWithHistory($existingBuilds, $newBuilds)
    {
        // Start with existing historical data
        $buildMap = $existingBuilds;

        // Add new builds (will overwrite existing if same key)
        foreach ($newBuilds as $newBuild) {
            $key = $this->getBuildKey($newBuild);
            $buildMap[$key] = $newBuild;
        }

        // Bound history growth: the merge used to keep every build ever seen,
        // growing the JSON cache without limit. Keep a generous rolling window.
        $cutoff = time() - ($this->historyRetentionDays * 86400);
        $buildMap = array_filter($buildMap, function($build) use ($cutoff) {
            $ts = self::buildTs((array) $build);
            return $ts === 0 || $ts >= $cutoff;
        });

        // Convert back to array and sort by release date
        $allBuilds = array_values($buildMap);
        usort($allBuilds, function($a, $b) {
            return self::buildTs((array) $b) <=> self::buildTs((array) $a);
        });

        return $allBuilds;
    }
    
    private function parseUpdate($update, $channelName, $channelId, $channelDisplayName)
    {
        $attributes = $update->attributes();
        
        if (!$attributes) {
            return null;
        }
        
        $latest = (string)$attributes->Latest === 'True';
        $version = (string)$attributes->Version;
        $legacyVersion = (string)$attributes->LegacyVersion;
        $buildNumber = (string)$attributes->Build;
        $pubTime = (string)$attributes->PubTime;
        
        // Skip if essential data is missing
        if (empty($buildNumber) || empty($pubTime)) {
            return null;
        }
        
        $releaseDateTimestamp = strtotime($pubTime);
        if (!$releaseDateTimestamp) {
            return null;
        }
        
        // Determine Office application/suite based on channel
        $application = $this->determineOfficeApplication($channelDisplayName, $version);
        
        // Classify build type based on channel (prefer the human display name so
        // the shared spec sees e.g. "Semi-Annual Enterprise Channel (Preview)").
        $buildType = self::getOfficeBuildType($channelDisplayName ?: $channelName);
        
        // Generate unique UUID for this build
        $uuid = md5($buildNumber . $version . $channelName . $pubTime);
        
        return [
            'uuid' => $uuid,
            'title' => $this->formatBuildTitle($application, $version, $buildNumber, $channelDisplayName),
            'build_number' => $buildNumber,
            'version' => $version,
            'legacy_version' => $legacyVersion,
            'channel' => $channelDisplayName ?: $channelName,
            'channel_name' => $channelName,
            'channel_id' => $channelId,
            'platform' => 'Windows', // Office updates are primarily Windows-focused
            'application' => $application,
            'latest' => $latest,
            // gmdate (UTC) — must agree with the Python co-writer's bucketing
            // near month/year boundaries.
            'release_date' => gmdate('F j, Y', $releaseDateTimestamp),
            'release_date_timestamp' => $releaseDateTimestamp,
            'month' => gmdate('F', $releaseDateTimestamp),
            'year' => gmdate('Y', $releaseDateTimestamp),
            'pub_time' => $pubTime,
            'build_type' => $buildType,
            'created' => gmdate('F j, Y', $releaseDateTimestamp), // For consistency with Windows builds
            'created_timestamp' => $releaseDateTimestamp,
            'arch' => 'x86_64', // Default Office architecture
            'summary_tooltip' => "Loading summary…"
        ];
    }
    
    private function determineOfficeApplication($channelDisplayName, $version)
    {
        // Determine Office application based on channel display name and version patterns
        $channelLower = strtolower($channelDisplayName);
        $versionLower = strtolower($version);
        
        // Check for specific Office versions first
        if (strpos($channelLower, '2024') !== false || strpos($versionLower, 'ltsb2024') !== false) {
            return 'Office 2024';
        } elseif (strpos($channelLower, '2021') !== false || strpos($versionLower, 'ltsb2021') !== false) {
            return 'Office 2021';
        } elseif (strpos($channelLower, '2019') !== false || strpos($versionLower, 'ltsb2018') !== false) {
            return 'Office 2019';
        } elseif (strpos($channelLower, 'perpetual') !== false) {
            // Handle perpetual versions
            if (strpos($versionLower, 'ltsb2024') !== false) {
                return 'Office 2024 (Perpetual)';
            } elseif (strpos($versionLower, 'ltsb2021') !== false) {
                return 'Office 2021 (Perpetual)';
            } elseif (strpos($versionLower, 'ltsb2018') !== false) {
                return 'Office 2019 (Perpetual)';
            } else {
                return 'Office Perpetual';
            }
        } elseif (strpos($channelLower, 'enterprise') !== false) {
            return 'Microsoft 365 Enterprise';
        } elseif (strpos($channelLower, 'current') !== false) {
            return 'Microsoft 365 Current';
        } elseif (strpos($channelLower, 'preview') !== false) {
            return 'Microsoft 365 Preview';
        } elseif (strpos($channelLower, 'monthly') !== false) {
            return 'Microsoft 365 Monthly';
        } elseif (strpos($channelLower, 'semi-annual') !== false) {
            return 'Microsoft 365 Semi-Annual';
        } else {
            return 'Microsoft Office';
        }
    }
    
    private function formatBuildTitle($application, $version, $buildNumber, $channelDisplayName)
    {
        $title = $application;
        
        // Add version if it's meaningful and different from build number
        if ($version && $version !== $buildNumber && !is_numeric($version)) {
            $title .= " {$version}";
        } elseif (is_numeric($version)) {
            // Version like 2508 means Year 25, Month 08
            $year = '20' . substr($version, 0, 2);
            $month = substr($version, 2);
            $title .= " ({$year}-{$month})";
        }
        
        $title .= " Build {$buildNumber}";
        
        return $title;
    }
    
    /**
     * Map an Office channel (display name or raw Name attr) to a build_type.
     * Delegates to the shared spec via ReleaseClassifier so PHP and the Python
     * backend classify Office channels identically.
     */
    public static function getOfficeBuildType($channelName)
    {
        return ReleaseClassifier::classifyOffice($channelName);
    }
    
    public function getChannelBuilds($channel = null, $application = null)
    {
        $allBuilds = $this->getLatestBuilds();
        
        if (!$channel && !$application) {
            return $allBuilds;
        }
        
        return array_filter($allBuilds, function($build) use ($channel, $application) {
            $channelMatch = !$channel || strcasecmp($build['channel'], $channel) === 0;
            $appMatch = !$application || stripos($build['application'], $application) !== false;
            
            return $channelMatch && $appMatch;
        });
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
        // tmp+rename: a concurrent reader (PHP or the Python backend) must never
        // observe a half-written JSON file.
        $tmp = $this->cacheFile . '.' . getmypid() . '.tmp';
        if (file_put_contents($tmp, json_encode(['timestamp' => time(), 'data' => $data]), LOCK_EX) !== false) {
            rename($tmp, $this->cacheFile);
        }
    }
    
    /**
     * Get all available Office channels for dropdown filtering
     */
    public function getAllChannels()
    {
        $builds = $this->getLatestBuilds();
        $channels = [];
        
        foreach ($builds as $build) {
            $channel = $build['channel'] ?? '';
            if ($channel && !in_array($channel, $channels)) {
                $channels[] = $channel;
            }
        }
        
        // Sort channels in logical order
        $channelOrder = [
            'Current Channel',
            'Current Channel (Preview)', 
            'Monthly Enterprise Channel',
            'Semi-Annual Enterprise Channel',
            'Semi-Annual Enterprise Channel (Preview)',
            'Office 2024 Perpetual Enterprise',
            'Office 2021 Perpetual Enterprise',
            'Office 2019 Perpetual Enterprise'
        ];
        
        $sortedChannels = [];
        foreach ($channelOrder as $channel) {
            if (in_array($channel, $channels)) {
                $sortedChannels[] = $channel;
            }
        }
        
        // Add any channels not in our predefined order
        foreach ($channels as $channel) {
            if (!in_array($channel, $sortedChannels)) {
                $sortedChannels[] = $channel;
            }
        }
        
        return $sortedChannels;
    }
    
    /**
     * Get all available Office applications for filtering
     */
    public function getAllApplications()
    {
        $builds = $this->getLatestBuilds();
        $applications = [];
        
        foreach ($builds as $build) {
            $application = $build['application'] ?? '';
            if ($application && !in_array($application, $applications)) {
                $applications[] = $application;
            }
        }
        
        sort($applications);
        return $applications;
    }
    
    /**
     * Extract CAB file using system cabextract utility
     * This is the most reliable method when shell execution is available
     */
    private function extractWithSystemCabextract($cabFile, $xmlFile)
    {
        // Locate the binary without shelling out where possible.
        $cabextractPath = null;
        foreach (['/usr/bin/cabextract', '/bin/cabextract', '/usr/local/bin/cabextract'] as $candidate) {
            if (is_file($candidate) && is_executable($candidate)) {
                $cabextractPath = $candidate;
                break;
            }
        }

        if (!$cabextractPath) {
            error_log("Office365: cabextract utility not found");
            return false;
        }

        $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
        if (!function_exists('exec') || in_array('exec', $disabled, true)) {
            error_log("Office365: exec() unavailable; cannot run cabextract");
            return false;
        }

        $extractDir = dirname($xmlFile) . '/';
        $cabFileName = basename($cabFile);

        $oldCwd = getcwd();
        chdir(dirname($cabFile));

        try {
            $output = [];
            $command = escapeshellarg($cabextractPath)
                . ' -d ' . escapeshellarg($extractDir)
                . ' ' . escapeshellarg($cabFileName) . ' 2>&1';
            exec($command, $output, $returnCode);
            error_log("Office365: cabextract rc=$returnCode: " . substr(implode("\n", $output), 0, 200));
        } finally {
            // Never leave the worker parked in the scratch dir, even on failure.
            if ($oldCwd) {
                chdir($oldCwd);
            }
        }

        if ($returnCode !== 0 || !file_exists($xmlFile)) {
            error_log("Office365: cabextract did not produce $xmlFile");
            return false;
        }

        // Verify the XML content
        $xmlContent = (string) file_get_contents($xmlFile, false, null, 0, 200);
        if (strpos($xmlContent, '<?xml') === false && strpos($xmlContent, '<ReleaseHistory') === false) {
            error_log("Office365: Extracted file doesn't contain valid XML");
            return false;
        }

        error_log("Office365: cabextract succeeded - extracted " . filesize($xmlFile) . " bytes to $xmlFile");
        return true;
    }
}
