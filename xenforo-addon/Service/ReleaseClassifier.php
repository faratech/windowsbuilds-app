<?php

namespace WindowsBuilds\Service;

/**
 * Windows / Edge / Office build classifier.
 *
 * PHP counterpart of fastapi_app/build_classifier.py. Both implement the SAME
 * algorithm over the SAME spec file (fastapi_app/data/build_classification.json),
 * so the XenForo widget + SSR JSON-LD agree with the React app's live FastAPI
 * data. Edit the rules in the JSON, not here.
 */
class ReleaseClassifier
{
    const SPEC_PATH = '/web/fastapi_app/data/build_classification.json';

    private static $spec = null;
    private static $cutoverTs = null;

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
            self::$cutoverTs = strtotime(($spec['cutover_date'] ?? '2026-04-24') . ' 00:00:00');
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
