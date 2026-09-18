<?php
namespace WindowsBuilds\Widget;

use GuzzleHttp\Client;
use WindowsBuilds\Service\EdgeUpdates;
use WindowsBuilds\Service\Office365;
use WindowsBuilds\Service\ReleaseClassifier;

/**
 * Static build-data access for the /builds SSR shell (the server-rendered
 * list and JSON-LD ItemList). All interactive behaviour lives in the React
 * app (/web/windowsbuilds_app) fed by search.windowsforum.com; this class
 * only shapes UUP Dump / Edge / Office data for SEO output, so everything
 * here is deliberately side-effect free (no LLM calls, no cache writes).
 */
class LatestBuilds
{
    public static function getRedis(): ?\Redis
    {
        return \WindowsForum\SharedRedis::raw();
    }

    public static function extractBuildNumber($buildTitle)
    {
        $buildNum = null;
        if (preg_match('/\((?:[^)]*?)(?P<version>(?:10\\.0\\.)?\\d+\\.\\d+(?:\\.\\d+)?(?:\\.\\d+)?)(?:[^)]*?)\)/i', $buildTitle, $matches)) {
            $buildNum = $matches['version'];
        } elseif (preg_match('/\b(?P<version>(?:10\\.0\\.)?\\d+\\.\\d+(?:\\.\\d+)?(?:\\.\\d+)?)(?!\\w)/i', $buildTitle, $matches)) {
            $buildNum = $matches['version'];
        }
        if ($buildNum !== null && stripos($buildNum, '10.0.') === 0) {
            $buildNum = substr($buildNum, 5);
        }
        return $buildNum;
    }

    public static function normalizeBuildTitle($originalTitle, $buildNumber)
    {
        $title = $originalTitle;
        if (!empty($buildNumber)) {
            $title = preg_replace('/\(' . preg_quote($buildNumber, '/') . '\)\s+' . preg_quote($buildNumber, '/') . '/i', "($buildNumber)", $title);
            $title = preg_replace('/\b' . preg_quote($buildNumber, '/') . '\s+' . preg_quote($buildNumber, '/') . '\b/i', $buildNumber, $title);
        }
        $title = preg_replace('/\s{2,}/', ' ', $title);
        return trim($title);
    }

    /**
     * Coarse, title-only channel label. Full per-build classification (channel +
     * kind + status + sublabel, factoring in build number and release date) is
     * done via ReleaseClassifier::classifyWindows() in fetchBuilds(). This shim
     * delegates to the shared spec so PHP and the Python backend agree.
     */
    public static function getBuildType($buildTitle)
    {
        return ReleaseClassifier::buildTypeForTitle($buildTitle);
    }

    public static function getEdgeBuildType($channel)
    {
        $cls = ReleaseClassifier::classifyEdge($channel);
        return $cls ? $cls['build_type'] : 'release';
    }

    private static function fetchLatestData()
    {
        $apiUrl    = "https://api.uupdump.net/listid.php?sortByDate=1";
        $cacheFile = '/web/ai/json/latest_builds_cache.json';

        // Advisory lock (2026-08 audit): on cache expiry every concurrent web
        // request used to refetch ~1.5 MB and race rename()s. One worker
        // refreshes; the rest fall back to serving stale data.
        $redis = self::getRedis();
        $lockKey = 'wf_builds:uupdump_fetch_lock';
        if ($redis && !$redis->set($lockKey, getmypid(), ['NX', 'EX' => 120]))
        {
            return null;
        }

        try {
            // Bounded timeouts: a bare Client() inherits curl's ~300s stall.
            $client = new Client(['timeout' => 15, 'connect_timeout' => 5]);
            $response = $client->get($apiUrl);
            $responseBody = $response->getBody()->getContents();
            $decodedResponse = json_decode($responseBody, true);
            if (!is_array($decodedResponse)) {
                return null;
            }
            $timestamp = $decodedResponse['timestamp'] ?? time();
            $cacheData = [
                'timestamp' => $timestamp,
                'response'  => $decodedResponse
            ];
            self::writeJsonFileAtomic($cacheFile, $cacheData);
            return $cacheData['response'];
        } catch (\Exception $e) {
            return null;
        } finally {
            if ($redis) {
                try { $redis->del($lockKey); } catch (\Throwable $ignored) {}
            }
        }
    }

    /**
     * tmp+rename write so a concurrent reader never sees a torn JSON file.
     */
    private static function writeJsonFileAtomic(string $path, array $data): void
    {
        $tmp = $path . '.' . getmypid() . '.tmp';
        if (file_put_contents($tmp, json_encode($data), LOCK_EX) !== false) {
            rename($tmp, $path);
        }
    }

    public static function fetchBuilds($version, $arch = 'amd64', $month = '', $year = '', $useRolling = false)
    {
        $cacheFile = '/web/ai/json/latest_builds_cache.json';
        $response = '';
        $debugSource = 'Cache Miss';
        $lastPull = time();

        if (file_exists($cacheFile)) {
            $cachedData = json_decode(file_get_contents($cacheFile), true);
            $lastPull = is_array($cachedData) ? ($cachedData['timestamp'] ?? 0) : 0;
            if (time() - $lastPull <= 3600) {
                $response = $cachedData['response'] ?? null;
                $debugSource = 'Cache Hit';
            } else {
                // Serve stale on refresh failure instead of discarding data we
                // just read — an expired cache entry beats an empty page.
                $response = self::fetchLatestData();
                if (!$response) {
                    $response = $cachedData['response'] ?? null;
                    $debugSource = $response ? 'Stale Served' : 'No Data';
                } else {
                    $debugSource = 'Cache Updated';
                }
            }
        } else {
            $response = self::fetchLatestData();
        }

        if (!$response) {
            return [
                'builds' => [],
                'lastPullTime' => $lastPull,
                'debugSource' => $debugSource ?: 'No Data'
            ];
        }

        $allBuilds = $response['response']['builds'] ?? [];
        $filteredBuilds = array_filter($allBuilds, function($build) use ($version, $arch, $month, $year, $useRolling) {
            // Per-record guards: one malformed upstream record must not TypeError
            // the whole SSR list into an empty page.
            if (!is_array($build) || !isset($build['title']) || !is_string($build['title'])) {
                return false;
            }
            if (!isset($build['created']) || !is_numeric($build['created'])) {
                return false;
            }

            $versionMatch = stripos($build['title'], $version) !== false;
            $archMatch = isset($build['arch']) && $build['arch'] === $arch;

            // Use rolling 30-day filter if enabled, otherwise use calendar month/year.
            // Month/year bucketing is done in UTC: upstream timestamps are epoch and
            // the Python backend buckets in UTC, so board-timezone date() would put
            // boundary builds in the wrong month.
            if ($useRolling && ($month === 'Last 30 Days' || ($month === '' && $year === ''))) {
                $thirtyDaysAgo = time() - (30 * 24 * 60 * 60);
                $dateMatch = $build['created'] >= $thirtyDaysAgo;
            } else {
                $monthMatch = !$month || $month === 'All' || gmdate('F', (int)$build['created']) === $month;
                $yearMatch = !$year || $year === 'All' || gmdate('Y', (int)$build['created']) === $year;
                $dateMatch = $monthMatch && $yearMatch;
            }

            return $versionMatch && $archMatch && $dateMatch;
        });

        foreach ($filteredBuilds as &$build) {
            $rawTitle = $build['title'];
            $bNumber = self::extractBuildNumber($rawTitle);
            $build['title'] = self::normalizeBuildTitle($rawTitle, $bNumber);
            $build['build_number'] = $bNumber;
            // $build['created'] is still the epoch here (reformatted below), so the
            // date-aware Experimental/Canary cutover sees the real timestamp.
            $cls = ReleaseClassifier::classifyWindows($rawTitle, $build['build'] ?? $bNumber, $build['created'] ?? null);
            $build['build_type'] = $cls['build_type'];
            $build['branch'] = $cls['branch_sublabel'];
            $build['kind'] = $cls['kind'];
            $build['status'] = $cls['status'];
            $created = $build['created'];
            $build['created_timestamp'] = $created;
            $build['created'] = gmdate('F j, Y', $created);
            $build['month'] = gmdate('F', $created);
            $build['year'] = gmdate('Y', $created);
        }
        unset($build);

        return [
            'builds' => $filteredBuilds,
            'lastPullTime' => $lastPull,
            'debugSource' => $debugSource
        ];
    }

    public static function fetchEdgeBuilds($selectedMonth = '', $selectedYear = '', $selectedArch = '', $useRolling = false)
    {
        $edgeService = new EdgeUpdates();
        $channels = ['Stable', 'Beta', 'Dev', 'Canary'];
        $allEdgeBuilds = [];
        $lastPull = time();

        foreach ($channels as $channel) {
            $releases = $edgeService->getChannelBuilds($channel);

            foreach ($releases as $release) {
                $buildInfo = $edgeService->formatBuildInfo($release);

                // Filter by date - rolling 30 days or calendar month/year (UTC).
                $publishedTimestamp = $buildInfo['publishedTimestamp'];
                if ($useRolling && ($selectedMonth === 'Last 30 Days' || ($selectedMonth === '' && $selectedYear === ''))) {
                    $thirtyDaysAgo = time() - (30 * 24 * 60 * 60);
                    $dateMatch = $publishedTimestamp >= $thirtyDaysAgo;
                } else {
                    $monthMatch = !$selectedMonth || $selectedMonth === 'All' || gmdate('F', $publishedTimestamp) === $selectedMonth;
                    $yearMatch = !$selectedYear || $selectedYear === 'All' || gmdate('Y', $publishedTimestamp) === $selectedYear;
                    $dateMatch = $monthMatch && $yearMatch;
                }

                // Map Edge platform/architecture combinations
                $archMatch = true;
                if ($selectedArch) {
                    $platform = strtolower($buildInfo['platform']);
                    $arch = strtolower($buildInfo['architecture']);

                    switch ($selectedArch) {
                        case 'amd64': // Windows x64
                            $archMatch = ($platform === 'windows' && in_array($arch, ['x64', 'x86_64']));
                            break;
                        case 'x86': // Windows x86
                            $archMatch = ($platform === 'windows' && $arch === 'x86');
                            break;
                        case 'arm64': // Windows ARM64
                            $archMatch = ($platform === 'windows' && $arch === 'arm64');
                            break;
                        case 'macos':
                            $archMatch = ($platform === 'macos');
                            break;
                        case 'linux':
                            $archMatch = ($platform === 'linux');
                            break;
                        case 'android':
                            $archMatch = ($platform === 'android');
                            break;
                        case 'ios':
                            $archMatch = ($platform === 'ios');
                            break;
                        default:
                            $archMatch = true;
                    }
                }

                if ($dateMatch && $archMatch) {
                    $allEdgeBuilds[] = [
                        'uuid' => md5($channel . $buildInfo['version'] . $buildInfo['platform'] . $buildInfo['architecture']),
                        'title' => "Microsoft Edge {$channel} {$buildInfo['version']} ({$buildInfo['platform']} {$buildInfo['architecture']})",
                        'version' => $buildInfo['version'],
                        'build_number' => $buildInfo['version'],
                        'channel' => $channel,
                        'platform' => $buildInfo['platform'],
                        'architecture' => $buildInfo['architecture'],
                        'arch' => $buildInfo['architecture'],
                        'created' => $buildInfo['published'],
                        'created_timestamp' => $publishedTimestamp,
                        'month' => gmdate('F', $publishedTimestamp),
                        'year' => gmdate('Y', $publishedTimestamp),
                        'artifacts' => $buildInfo['artifacts'],
                        'cves' => $buildInfo['cves'],
                        'build_type' => self::getEdgeBuildType($channel)
                    ];
                }
            }
        }

        // Newest first. The old version_compare() sort mixed channels (Canary 153
        // would always outrank a Stable shipped yesterday); recency is what the
        // tracker means by ordering.
        usort($allEdgeBuilds, function($a, $b) {
            return $b['created_timestamp'] <=> $a['created_timestamp'];
        });

        return [
            'builds' => $allEdgeBuilds,
            'lastPullTime' => $lastPull,
            'debugSource' => 'Edge API'
        ];
    }

    /**
     * Office builds come from releasehistory.cab, but the cache file at
     * /web/ai/json/office365_builds_cache.json is shared with the Python
     * backend (fastapi_app), which writes a leaner record shape:
     *   Python: {id,title,build,version,channel,build_type,releaseDate,latest}
     *   PHP:    {... uuid,title,channel_name,application,created_timestamp,...}
     * Read both: derive created_timestamp from releaseDate when the Python
     * shape is on disk instead of failing every date filter and returning 0 rows.
     */
    private static function officeTimestamp(array $build): int
    {
        if (!empty($build['created_timestamp'])) {
            return (int) $build['created_timestamp'];
        }
        if (!empty($build['pub_time'])) {
            $ts = strtotime($build['pub_time']);
            if ($ts) {
                return $ts;
            }
        }
        if (!empty($build['releaseDate'])) {
            // ISO strings from the backend are UTC ("...Z" or offset-less).
            $ts = strtotime($build['releaseDate'] . (preg_match('/(Z|[+-]\d{2}:?\d{2})$/', $build['releaseDate']) ? '' : ' UTC'));
            if ($ts) {
                return $ts;
            }
        }
        return 0;
    }

    public static function fetchOfficeBuilds($selectedMonth = '', $selectedYear = '', $selectedChannel = '', $selectedApplication = '', $useRolling = false)
    {
        $officeService = new Office365();
        $allOfficeBuilds = [];
        $lastPull = time();

        try {
            $builds = $officeService->getLatestBuilds();
        } catch (\Throwable $e) {
            error_log("Error fetching Office builds: " . $e->getMessage());
            $builds = [];
        }

        // Per-build try/catch: a single malformed record must not abort the loop.
        foreach ($builds as $build) {
            try {
                $publishedTimestamp = self::officeTimestamp($build);
                if ($useRolling && ($selectedMonth === 'Last 30 Days' || ($selectedMonth === '' && $selectedYear === ''))) {
                    $thirtyDaysAgo = time() - (30 * 24 * 60 * 60);
                    $dateMatch = $publishedTimestamp >= $thirtyDaysAgo;
                } else {
                    $monthMatch = !$selectedMonth || $selectedMonth === 'All' || gmdate('F', $publishedTimestamp) === $selectedMonth;
                    $yearMatch = !$selectedYear || $selectedYear === 'All' || gmdate('Y', $publishedTimestamp) === $selectedYear;
                    $dateMatch = $monthMatch && $yearMatch;
                }

                $channelMatch = !$selectedChannel || $selectedChannel === 'All'
                    || strcasecmp($build['channel'] ?? '', $selectedChannel) === 0;
                $appMatch = !$selectedApplication || $selectedApplication === 'All'
                    || stripos($build['application'] ?? '', $selectedApplication) !== false;

                if ($dateMatch && $channelMatch && $appMatch) {
                    $build['created_timestamp'] = $publishedTimestamp;
                    $build['created'] = $publishedTimestamp ? gmdate('F j, Y', $publishedTimestamp) : '';
                    $build['month'] = $publishedTimestamp ? gmdate('F', $publishedTimestamp) : '';
                    $build['year'] = $publishedTimestamp ? gmdate('Y', $publishedTimestamp) : '';
                    $build['uuid'] = $build['uuid']
                        ?? md5(($build['build_number'] ?? $build['build'] ?? '') . ($build['version'] ?? '') . ($build['channel'] ?? '') . ($build['releaseDate'] ?? ''));
                    $allOfficeBuilds[] = $build;
                }
            } catch (\Throwable $e) {
                error_log("Office build skipped: " . $e->getMessage());
                continue;
            }
        }

        usort($allOfficeBuilds, function($a, $b) {
            return ($b['created_timestamp'] ?? 0) <=> ($a['created_timestamp'] ?? 0);
        });

        return [
            'builds' => $allOfficeBuilds,
            'lastPullTime' => $lastPull,
            'debugSource' => 'Office CAB API'
        ];
    }
}
