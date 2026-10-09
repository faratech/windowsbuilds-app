<?php

namespace WindowsBuilds\Service;

/**
 * Windows / Edge / Office build classifier.
 *
 * PHP counterpart of fastapi_app/build_classifier.py. Both implement the SAME
 * algorithm over the SAME spec file (fastapi_app/data/build_classification.json),
 * so the XenForo widget + SSR JSON-LD agree with the React app's live FastAPI
 * data. Verified release-health/Flight Hub identities from the local atomic
 * catalog override these static fallback rules.
 */
class ReleaseClassifier
{
    const SPEC_PATH = '/web/fastapi_app/data/build_classification.json';

    private static $spec = null;
    private static $cutoverTs = null;

    private static $catalog = [];
    private static $catalogKey = null;

    /** Same atomic, verified snapshot used by the API. No request-time network. */
    public static function catalog(): array
    {
        $path = getenv('MICROSOFT_RELEASES_FILE') ?: '/var/lib/windowsbuilds/microsoft-releases.json';
        clearstatcache(true, $path);
        $key = $path . ':' . (@filemtime($path) ?: 0) . ':' . (@filesize($path) ?: 0);
        if ($key !== self::$catalogKey) {
            $raw = @file_get_contents($path);
            $data = $raw ? json_decode($raw, true) : null;
            if (is_array($data) && ($data['schema_version'] ?? null) === 1 && is_array($data['sources'] ?? null)) {
                self::$catalog = $data;
                self::$catalogKey = $key;
            }
        }
        return self::$catalog;
    }

    public static function generation(): string
    {
        return (self::catalog()['generation'] ?? 'fallback') . ':' . gmdate('Y-m-d');
    }

    public static function publicBuild(string $family, string $build): ?array
    {
        $source = self::catalog()['sources'][$family] ?? [];
        $entry = $source['builds'][$build] ?? null;
        if (!$entry || $entry['release_date'] > gmdate('Y-m-d') || ($source['lines'][$entry['tag']]['availability_date'] ?? '') > gmdate('Y-m-d')) { return null; }
        return $entry;
    }

    public static function versionTag(string $family, string $title, string $build): ?string
    {
        $public = self::publicBuild($family, $build);
        if ($public) { return $public['tag']; }
        $catalog = self::catalog();
        $flights = $family === 'windows11' ? ($catalog['sources']['flights']['flights'][$build] ?? []) : [];
        if ($flights) {
            return $flights[count($flights) - 1]['tag'];
        }
        $fallback = [
            'windows11' => ['26300' => '26H2', '28000' => '26H1', '26200' => '25H2', '26100' => '24H2', '22631' => '23H2', '22621' => '22H2', '22000' => '21H2'],
            'windows10' => ['19045' => '22H2', '19044' => '21H2', '19043' => '21H1', '19042' => '20H2', '19041' => '2004'],
            'windowsserver' => ['26100' => '2025', '20348' => '2022', '17763' => '2019', '14393' => '2016'],
        ];
        $bases = $catalog['sources'][$family]['bases'] ?? ($fallback[$family] ?? []);
        $mapped = $bases[self::baseOf($build)] ?? null;
        if ($mapped !== null || $family === 'windowsserver') {
            return $mapped;
        }
        return preg_match('/\b(\d{2}H[12])\b/i', $title, $m) ? strtoupper($m[1]) : null;
    }

    public static function lineTags(string $family): array
    {
        $path = getenv('BUILD_LINES_FILE') ?: '/web/fastapi_app/data/build_lines.json';
        $baseline = json_decode(@file_get_contents($path) ?: '{}', true) ?: [];
        $tags = array_keys(array_merge($baseline[$family] ?? [], self::catalog()['sources'][$family]['lines'] ?? []));
        if ($family === 'windows11') {
            foreach (self::catalog()['sources']['flights']['flights'] ?? [] as $flights) {
                foreach ($flights as $flight) {
                    if (!empty($flight['tag'])) { $tags[] = $flight['tag']; }
                }
            }
        }
        $tags = array_values(array_unique($tags));
        rsort($tags, SORT_NATURAL);
        return $tags;
    }

    private static function verifiedClassification(string $title, string $build, $createdTs): ?array
    {
        $lower = strtolower($title);
        if (strpos($lower, 'windows 11') === false || strpos($lower, '.net') !== false) { return null; }
        $explicit = strpos($lower, 'insider preview') !== false || strpos($lower, 'windows insider') !== false;
        if (self::publicBuild('windows11', $build) && !$explicit) {
            return ['build_type' => 'release', 'branch_sublabel' => null];
        }
        $flights = self::catalog()['sources']['flights']['flights'][$build] ?? [];
        if ($flights) {
            $choices = [];
            foreach ($flights as $flight) {
                $choices[json_encode([$flight['channel'], $flight['branch']])] = $flight;
            }
            if (count($choices) === 1) {
                $flight = reset($choices);
                return ['build_type' => $flight['channel'], 'branch_sublabel' => $flight['branch']];
            }
            return ['build_type' => 'insider', 'branch_sublabel' => null];
        }
        // The official 2026-08-27 26H2 RP announcement is outside Flight Hub's
        // Experimental table. Confirmed public builds above take precedence.
        if (strpos($build, '26300.') === 0 && $createdTs && (float) $createdTs >= strtotime('2026-08-27T00:00:00Z')) {
            return ['build_type' => 'release-preview', 'branch_sublabel' => null];
        }
        return null;
    }

    private static function spec(): array
    {
        if (self::$spec === null) {
            $path = getenv('BUILD_CLASSIFICATION_SPEC') ?: self::SPEC_PATH;
            $json = @file_get_contents($path);
            self::$spec = $json ? (json_decode($json, true) ?: []) : [];
        }
        return self::$spec;
    }

    private static function cutoverTs(): int
    {
        if (self::$cutoverTs === null) {
            $spec = self::spec();
            self::$cutoverTs = strtotime(($spec['cutover_date'] ?? '2026-04-24') . ' 00:00:00 UTC');
        }
        return self::$cutoverTs;
    }

    private static function baseOf($build): string
    {
        if (!$build) {
            return '';
        }
        $b = (string) $build;
        if (strpos($b, '10.0.') === 0) {
            $b = substr($b, 5);
        }
        $parts = explode('.', $b);
        return $parts[0];
    }

    private static function detectKind(string $lowerTitle)
    {
        foreach (self::spec()['kinds'] ?? [] as $rule) {
            foreach ($rule['any'] as $tok) {
                if (strpos($lowerTitle, $tok) !== false) {
                    return $rule['kind'];
                }
            }
        }
        return null;
    }

    /**
     * @return array{build_type:string, branch_sublabel:?string, kind:?string, status:?string}
     */
    public static function classifyWindows($title, $build = '', $createdTs = null): array
    {
        $w = self::spec()['windows'] ?? [];
        $lower = strtolower((string) $title);
        $kind = self::detectKind($lower);

        $isInsider = false;
        foreach ($w['insider_markers'] ?? [] as $m) {
            if (strpos($lower, $m) !== false) {
                $isInsider = true;
                break;
            }
        }

        $channel = $w['default_channel'] ?? 'release';
        $sublabel = null;

        if ($isInsider) {
            $base = self::baseOf($build);
            $entry = $w['exact_base_map'][$base] ?? null;
            if (!$entry) {
                $prefixes = array_keys($w['prefix_base_map'] ?? []);
                usort($prefixes, function ($a, $b) {
                    return strlen($b) - strlen($a);
                });
                foreach ($prefixes as $pfx) {
                    if ($base !== '' && strpos($base, $pfx) === 0) {
                        $entry = $w['prefix_base_map'][$pfx];
                        break;
                    }
                }
            }
            if ($entry) {
                $isPost = $createdTs !== null && (float) $createdTs >= self::cutoverTs();
                $channel = $isPost ? $entry['post'] : $entry['pre'];
                $sublabel = $entry['sublabel'] ?? null;
            } else {
                $channel = $w['default_insider_channel'] ?? 'insider';
            }
        }

        $verified = self::verifiedClassification((string) $title, (string) $build, $createdTs);
        if ($verified) {
            $channel = $verified['build_type'];
            $sublabel = $verified['branch_sublabel'];
        }

        $status = (strpos($lower, 'windows 10') !== false && !$isInsider) ? 'eol' : null;

        return [
            'build_type' => $channel,
            'branch_sublabel' => $sublabel,
            'kind' => $kind,
            'status' => $status,
        ];
    }

    /**
     * @return ?array{build_type:string}  null if the product is a non-browser artifact
     */
    public static function classifyEdge($product)
    {
        $e = self::spec()['edge'] ?? [];
        $p = strtolower(trim((string) $product));
        if ($p === '' || in_array($p, $e['ignore_products'] ?? [], true)) {
            return null;
        }
        return ['build_type' => $e['product_to_channel'][$p] ?? 'release'];
    }

    public static function classifyOffice($channelName): string
    {
        $o = self::spec()['office'] ?? [];
        $c = strtolower((string) $channelName);
        foreach ($o['channel_to_type'] ?? [] as $rule) {
            foreach ($rule['any'] as $tok) {
                if (strpos($c, $tok) !== false) {
                    return $rule['type'];
                }
            }
        }
        return $o['default_type'] ?? 'release';
    }

    /** Coarse, title-only channel label. */
    public static function buildTypeForTitle($title): string
    {
        return self::classifyWindows($title, '', null)['build_type'];
    }
}
