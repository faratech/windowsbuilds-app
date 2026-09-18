<?php

namespace WindowsBuilds\Service;

use XF\Service\AbstractService;

class Sitemap extends AbstractService
{
    /**
     * Generate sitemap entries for /builds/ section pages, version lines and
     * build permalinks. Every URL matches the `:str<section>/:any<ref>` route
     * in _data/routes.xml as the controller parses it; other shapes
     * (?selectedYear=, /recent/) have no handler and would 404.
     *
     * @return array
     */
    public function getBuildsForSitemap()
    {
        $entries = [];
        $now = date('c');

        $entries[] = [
            'loc'        => 'https://windowsforum.com/builds/',
            'lastmod'    => $now,
            'changefreq' => 'hourly',
            'priority'   => '1.0',
        ];

        $sections = [
            ['path' => 'windows11',     'changefreq' => 'daily',  'priority' => '0.9'],
            ['path' => 'windows10',     'changefreq' => 'daily',  'priority' => '0.9'],
            ['path' => 'windowsserver', 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['path' => 'edge',          'changefreq' => 'daily',  'priority' => '0.9'],
            ['path' => 'office365',     'changefreq' => 'daily',  'priority' => '0.8'],
        ];

        foreach ($sections as $section) {
            $entries[] = [
                'loc'        => 'https://windowsforum.com/builds/' . $section['path'] . '/',
                'lastmod'    => $now,
                'changefreq' => $section['changefreq'],
                'priority'   => $section['priority'],
            ];
        }

        foreach ($this->getPermalinkEntries() as $entry) {
            $entries[] = $entry;
        }

        return $entries;
    }

    /**
     * Version-line pages and build permalinks (routes since 2026-08-29):
     * /builds/<family>/<tag>/ and /builds/<family>/<build>/ for every build the
     * UUP Dump cache lists in the last two years, one URL per build number.
     * Read from the on-disk cache only - never a network call from a cron.
     */
    protected function getPermalinkEntries(): array
    {
        $families = [
            'windows11'     => ['label' => 'Windows 11',     'lines' => ['26h2', '26h1', '25h2', '24h2', '23h2', '22h2']],
            'windows10'     => ['label' => 'Windows 10',     'lines' => ['22h2', '21h2', '21h1']],
            'windowsserver' => ['label' => 'Windows Server', 'lines' => ['2025', '2022', '2019']],
        ];
        $entries = [];
        foreach ($families as $path => $family) {
            foreach ($family['lines'] as $line) {
                $entries[] = [
                    'loc'        => 'https://windowsforum.com/builds/' . $path . '/' . $line . '/',
                    'lastmod'    => date('c'),
                    'changefreq' => 'daily',
                    'priority'   => '0.8',
                ];
            }
        }

        $cacheFile = '/web/ai/json/latest_builds_cache.json';
        if (!is_readable($cacheFile)) {
            return $entries;
        }
        $data = json_decode((string) file_get_contents($cacheFile), true);
        $builds = $data['response']['builds'] ?? ($data['response']['response']['builds'] ?? []);
        if (!is_array($builds)) {
            return $entries;
        }

        $cutoff = time() - 2 * 365 * 86400;
        $seen = [];
        $rows = [];
        foreach ($builds as $build) {
            $number = (string) ($build['build'] ?? '');
            $created = (int) ($build['created'] ?? 0);
            if (!preg_match('/^\d{4,5}\.\d{1,6}$/', $number) || $created < $cutoff) {
                continue;
            }
            $title = strtolower((string) ($build['title'] ?? ''));
            $path = null;
            foreach ($families as $candidate => $family) {
                if (strpos($title, strtolower($family['label'])) !== false) {
                    $path = $candidate;
                    break;
                }
            }
            if ($path === null) {
                continue;
            }
            $key = $path . '/' . $number;
            if (isset($seen[$key])) {
                $seen[$key] = max($seen[$key], $created);
                continue;
            }
            $seen[$key] = $created;
        }
        arsort($seen);
        foreach (array_slice($seen, 0, 3000, true) as $key => $created) {
            $rows[] = [
                'loc'        => 'https://windowsforum.com/builds/' . $key . '/',
                'lastmod'    => date('c', $created),
                'changefreq' => $created > time() - 30 * 86400 ? 'daily' : 'monthly',
                'priority'   => $created > time() - 30 * 86400 ? '0.7' : '0.5',
            ];
        }
        return array_merge($entries, $rows);
    }

    /**
     * Generate XML sitemap content
     *
     * @return string
     */
    public function generateSitemapXml()
    {
        $entries = $this->getBuildsForSitemap();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($entries as $entry) {
            $xml .= '  <url>' . "\n";
            $xml .= '    <loc>' . htmlspecialchars($entry['loc']) . '</loc>' . "\n";
            $xml .= '    <lastmod>' . $entry['lastmod'] . '</lastmod>' . "\n";
            $xml .= '    <changefreq>' . $entry['changefreq'] . '</changefreq>' . "\n";
            $xml .= '    <priority>' . $entry['priority'] . '</priority>' . "\n";
            $xml .= '  </url>' . "\n";
        }

        $xml .= '</urlset>';

        return $xml;
    }

    /**
     * Save sitemap to file. Default path is the URL advertised in robots.txt:
     * https://windowsforum.com/builds/sitemap.xml -> /web/public_html/builds/sitemap.xml
     *
     * @param string $filepath
     * @return bool
     */
    public function saveSitemapToFile($filepath = null)
    {
        if (!$filepath) {
            // Sitemap.php lives at <docroot>/src/addons/WindowsBuilds/Service/
            // — walk 4 levels up to get the document root reliably (independent
            // of XF CLI bootstrap state).
            $docRoot = dirname(__DIR__, 4);
            $dir = $docRoot . '/builds';
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            $filepath = $dir . '/sitemap.xml';
        }

        $xml = $this->generateSitemapXml();

        // tmp+rename: a crawler fetching mid-write must never see a truncated
        // sitemap.
        $tmp = $filepath . '.' . getmypid() . '.tmp';
        if (file_put_contents($tmp, $xml, LOCK_EX) === false) {
            return false;
        }
        return rename($tmp, $filepath);
    }
}
