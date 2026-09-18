<?php

namespace WindowsBuilds\Pub\Controller;

use XF\Pub\Controller\AbstractController;
use XF\Mvc\ParameterBag;

class Builds extends AbstractController
{
    public const VALID_SECTIONS = ['windows11', 'windows10', 'windowsserver', 'edge', 'office365'];
    /** Sections whose builds have permalinks (/builds/<family>/<build>/) and version-line pages. */
    public const WINDOWS_SECTIONS = ['windows11', 'windows10', 'windowsserver'];
    /** Origin of the build-detail bundles (fastapi.service, routers/builds.py). */
    public const DETAIL_API = 'http://127.0.0.1:8000/api/builds';
    /** Windows Help & Support - where "Ask about this build" posts. */
    public const ASK_FORUM_ID = 302;

    /**
     * Route format is `:str<section>/:any<ref>` (routes.xml). The second
     * segment is parsed here, not by the router:
     *   /builds/<family>/                 section index (SPA)
     *   /builds/<family>/<build>/         build permalink, e.g. 26100.9278
     *   /builds/<family>/<tag>/           version line, e.g. 24h2 (server: 2025)
     *   /builds/kb<n>/                    KB alias -> 301 to the build page
     * Anything deeper is a 404 (the .htaccess block still collapses the retired
     * year/month/recent shapes to the section root).
     */
    public function actionIndex(ParameterBag $params)
    {
        $section = $params->section ?: null;
        $ref = trim((string) ($params->ref ?? ''), '/');

        if ($section !== null && preg_match('/^kb(\d{6,7})$/i', $section, $m))
        {
            return $this->redirectKbAlias($m[1]);
        }

        if ($section === null)
        {
            if ($ref !== '')
            {
                throw $this->exception($this->notFound());
            }
            // Bare /builds/ is a distinct landing page (different canonical/meta).
            return $this->renderBuildsPage('windows11', true);
        }

        // Route matching is case-insensitive but the section identifiers are
        // not: /builds/Windows11/ used to fall through to Windows 11 content
        // under a foreign URL with a windows11 canonical. Canonicalize instead.
        $lower = strtolower($section);
        if (!in_array($lower, self::VALID_SECTIONS, true))
        {
            // Unknown sections are soft-404s (they used to render Windows 11
            // content with HTTP 200 + a mismatched canonical).
            throw $this->exception($this->notFound());
        }

        if ($ref === '')
        {
            if ($lower !== $section)
            {
                return $this->redirectPermanently('/builds/' . $lower . '/');
            }
            return $this->renderBuildsPage($lower);
        }

        if (strpos($ref, '/') !== false || !in_array($lower, self::WINDOWS_SECTIONS, true))
        {
            throw $this->exception($this->notFound());
        }

        if (preg_match('/^\d{4,5}\.\d{1,6}$/', $ref))
        {
            if ($lower !== $section)
            {
                return $this->redirectPermanently('/builds/' . $lower . '/' . $ref . '/');
            }
            return $this->renderBuildPage($lower, $ref);
        }

        $refLower = strtolower($ref);
        if (preg_match('/^(\d{2}h\d|\d{4})$/', $refLower))
        {
            if ($lower !== $section || $refLower !== $ref)
            {
                return $this->redirectPermanently('/builds/' . $lower . '/' . $refLower . '/');
            }
            return $this->renderBuildsPage($lower, false, strtoupper($refLower));
        }

        throw $this->exception($this->notFound());
    }

    /**
     * /builds/kb5120998/ -> the newest build a forum title pairs with that KB.
     */
    protected function redirectKbAlias(string $kbNumber)
    {
        $hit = $this->fetchDetailApi('/resolve/kb/' . ltrim($kbNumber, '0'));
        if (!$hit || empty($hit['family']) || empty($hit['build']))
        {
            throw $this->exception($this->notFound());
        }
        return $this->redirectPermanently('/builds/' . $hit['family'] . '/' . $hit['build'] . '/');
    }

    /**
     * GET a JSON document from the detail API. Returns null on 404 and throws a
     * 503 reply on any other failure so the page never renders half-empty.
     */
    protected function fetchDetailApi(string $path): ?array
    {
        $cache = \XF::app()->cache();
        $cacheKey = 'wf_build_api_' . md5($path);
        if ($cache)
        {
            $cached = $cache->fetch($cacheKey);
            if ($cached === '__not_found__')
            {
                return null;
            }
            if (is_array($cached))
            {
                return $cached;
            }
        }

        try
        {
            $response = \XF::app()->http()->client()->get(self::DETAIL_API . $path, [
                'timeout' => 8,
                'connect_timeout' => 2,
                'http_errors' => false,
                'headers' => ['Accept' => 'application/json'],
            ]);
        }
        catch (\Throwable $e)
        {
            \XF::logError('WindowsBuilds detail API unreachable: ' . $e->getMessage());
            throw $this->exception($this->error('The build tracker is temporarily unavailable. Please try again in a minute.', 503));
        }

        $status = $response->getStatusCode();
        if ($status === 404)
        {
            if ($cache)
            {
                $cache->save($cacheKey, '__not_found__', 300);
            }
            return null;
        }
        $data = json_decode((string) $response->getBody(), true);
        if ($status !== 200 || !is_array($data))
        {
            \XF::logError('WindowsBuilds detail API returned ' . $status . ' for ' . $path);
            throw $this->exception($this->error('The build tracker is temporarily unavailable. Please try again in a minute.', 503));
        }
        if ($cache)
        {
            $cache->save($cacheKey, $data, 3600);
        }
        return $data;
    }

    /**
     * The permalink page for one build number.
     */
    protected function renderBuildPage(string $section, string $build)
    {
        $bundle = $this->fetchDetailApi('/build/' . $section . '/' . $build);
        if (!$bundle)
        {
            throw $this->exception($this->notFound());
        }

        $familyLabel = $bundle['family_label'] ?? 'Windows';
        $tag = $bundle['tag'] ?? null;
        $channel = self::channelLabel($bundle['build_type'] ?? '');
        $line = $tag ? ($familyLabel . ' ' . $tag) : $familyLabel;
        $released = !empty($bundle['created']) ? date('F j, Y', (int) $bundle['created']) : null;

        $archList = [];
        $seenArch = [];
        foreach ($bundle['records'] ?? [] as $record)
        {
            $arch = $record['arch'] ?? '';
            if ($arch === '' || isset($seenArch[$arch]))
            {
                continue;
            }
            $seenArch[$arch] = true;
            $archList[] = $record;
        }
        $bundle['downloads'] = $archList;

        $description = sprintf(
            '%s build %s%s%s. Downloads for %s, AI summary, known issues, related builds and every WindowsForum thread about it.',
            $line,
            $build,
            $channel ? ' (' . $channel . ')' : '',
            $released ? ', released ' . $released : '',
            $archList ? implode(' and ', array_map(fn ($r) => $r['arch'], $archList)) : 'all architectures'
        );

        $meta = [
            'title'       => $line . ' build ' . $build . (($bundle['kb'] ?? null) ? ' (' . $bundle['kb'] . ')' : '') . ' — release notes, downloads, known issues',
            'heading'     => $build,
            'description' => $description,
            'keywords'    => implode(', ', array_filter([$familyLabel . ' ' . $build, $line, $bundle['kb'] ?? null, $familyLabel . ' build ' . $build, $channel ? $familyLabel . ' ' . $channel : null])),
            'canonical'   => 'https://windowsforum.com/builds/' . $section . '/' . $build . '/',
            'line'        => $line,
            'channel'     => $channel,
            'released'    => $released,
        ];

        // "Ask about this build" posts into Windows Help & Support. Built from
        // the entity so NodeRoutePrefix emits the real prefix (/302/post-thread
        // was a 404, 2026-08-30).
        $askForum = \XF::em()->find(\XF\Entity\Forum::class, self::ASK_FORUM_ID);

        $bundle['summary_html'] = !empty($bundle['summary']) ? self::summaryToHtml((string) $bundle['summary']) : '';

        $view = $this->view('WindowsBuilds:Build', 'windowsbuilds_build', [
            'askForum'  => $askForum,
            'b'         => $bundle,
            'section'   => $section,
            'meta'      => $meta,
            'seoJsonLd' => $this->buildDetailJsonLd($bundle, $meta, $archList),
            'apiBase'   => self::DETAIL_API_PUBLIC,
        ]);
        $view->setPageParams([
            'pageTitle'       => $meta['title'],
            'pageDescription' => $meta['description'],
        ]);
        return $view;
    }

    /**
     * Public origin of the same API for the page's JS and its JSON links.
     * /api/ on windowsforum.com is XenForo's REST API, so the tracker's
     * endpoints are published on search.windowsforum.com (VITE_API_BASE in
     * /web/windowsbuilds_app/.env.production - keep in step).
     */
    public const DETAIL_API_PUBLIC = 'https://search.windowsforum.com/api/builds';

    /**
     * Model summaries arrive as plain text with markdown links and bold
     * markers. Escape everything first, then turn [text](https://...) into
     * anchors and blank lines into paragraphs - never the other way round.
     */
    public static function summaryToHtml(string $summary): string
    {
        $text = str_replace('**', '', trim($summary));
        $paras = preg_split('/\n\s*\n/', $text) ?: [];
        $out = [];
        foreach ($paras as $para)
        {
            $para = trim($para);
            if ($para === '')
            {
                continue;
            }
            $escaped = htmlspecialchars($para, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $escaped = preg_replace_callback(
                '/\[([^\]]{1,200})\]\((https?:\/\/[^\s)]+)\)/',
                fn ($m) => '<a href="' . $m[2] . '" rel="nofollow noopener" target="_blank">' . $m[1] . '</a>',
                $escaped
            );
            // Bare "(https://...)" leftovers and "utm_source=openai" tails read as noise.
            $escaped = preg_replace('/\s*\((?:<a [^>]*>)?https?:\/\/[^\s)]*(?:<\/a>)?\)/', '', $escaped);
            $out[] = '<p>' . nl2br($escaped) . '</p>';
        }
        return implode('', $out);
    }

    public static function channelLabel(string $buildType): string
    {
        $map = [
            'release'         => 'Release',
            'release-preview' => 'Release Preview',
            'beta'            => 'Beta',
            'dev'             => 'Dev',
            'canary'          => 'Canary',
            'experimental'    => 'Experimental',
            'insider'         => 'Insider',
        ];
        return $map[$buildType] ?? ucfirst($buildType);
    }

    protected function buildDetailJsonLd(array $bundle, array $meta, array $archList): string
    {
        $software = [
            '@type'               => 'SoftwareApplication',
            'name'                => $meta['line'] . ' build ' . $bundle['build'],
            'softwareVersion'     => $bundle['build'],
            'applicationCategory' => 'OperatingSystem',
            'operatingSystem'     => $bundle['family_label'] ?? 'Windows',
            'url'                 => $meta['canonical'],
            'publisher'           => ['@type' => 'Organization', 'name' => 'Microsoft'],
            'offers'              => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'USD'],
        ];
        if (!empty($bundle['created_iso']))
        {
            $software['datePublished'] = $bundle['created_iso'];
        }
        if ($archList)
        {
            $software['processorRequirements'] = implode(', ', array_map(fn ($r) => $r['arch'], $archList));
            if (!empty($archList[0]['download_url']))
            {
                $software['downloadUrl'] = $archList[0]['download_url'];
            }
        }
        if (!empty($bundle['summary']))
        {
            $software['description'] = mb_substr(strip_tags((string) $bundle['summary']), 0, 300);
        }

        $crumbs = [
            ['Builds', 'https://windowsforum.com/builds/'],
            [$bundle['family_label'] ?? 'Windows', 'https://windowsforum.com' . ($bundle['index_url'] ?? '/builds/')],
        ];
        if (!empty($bundle['tag']) && !empty($bundle['tag_url']))
        {
            $crumbs[] = [$bundle['tag'], 'https://windowsforum.com' . $bundle['tag_url']];
        }
        $crumbs[] = [$bundle['build'], $meta['canonical']];
        $crumbItems = [];
        foreach ($crumbs as $i => [$name, $url])
        {
            $crumbItems[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $name, 'item' => $url];
        }

        $data = [
            '@context' => 'https://schema.org',
            '@graph'   => [
                $software,
                ['@type' => 'BreadcrumbList', 'itemListElement' => $crumbItems],
            ],
        ];
        // See buildSeoJsonLd(): HEX flags keep feed text from closing the script block.
        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    }

    protected function renderBuildsPage($section = 'windows11', $isBareLanding = false, ?string $tag = null)
    {
        // Get React asset files. NOTE: these two lines are rewritten by
        // /web/windowsbuilds_app/update-controller.sh via sed after every SPA
        // deploy — keep the exact `'css' => '/js/WindowsBuilds/index-D6E2XO9B.css'` shape.
        $assets = [
            'css' => '/js/WindowsBuilds/index-D6E2XO9B.css',
            'js' => '/js/WindowsBuilds/index-DtEBLGy3.js',
            'vendor' => '/js/WindowsBuilds/vendor-vVBNBLL0.js',
        ];

        $meta = $this->getSectionMeta($section, $isBareLanding);
        $topBuilds = $this->getTopBuildsForSection($section, $tag ? 60 : 25, $tag);
        if ($tag !== null)
        {
            $meta = $this->applyTagMeta($meta, $section, $tag);
        }
        $seoJsonLd = $this->buildSeoJsonLd($meta, $topBuilds);

        $view = $this->view('WindowsBuilds:Builds', 'windowsbuilds_builds', [
            'reactAssets' => $assets,
            'section'     => $section,
            'tag'         => $tag,
            'meta'        => $meta,
            'topBuilds'   => $topBuilds,
            'seoJsonLd'   => $seoJsonLd,
        ]);
        $view->setPageParams([
            'pageTitle'       => $meta['title'],
            'pageDescription' => $meta['description'],
        ]);
        return $view;
    }

    /**
     * /builds/<family>/<tag>/ — one version line of a family.
     */
    protected function applyTagMeta(array $meta, string $section, string $tag): array
    {
        $family = ['windows11' => 'Windows 11', 'windows10' => 'Windows 10', 'windowsserver' => 'Windows Server'][$section] ?? 'Windows';
        $line = $section === 'windowsserver' && preg_match('/^\d{4}$/', $tag) ? $family . ' ' . $tag : $family . ' ' . $tag;
        $meta['title'] = $line . ' builds — every release, with permalinks';
        $meta['heading'] = $line . ' builds';
        $meta['description'] = 'Every ' . $line . ' build in order, newest first: retail cumulative updates, Release Preview and Insider flights, each with its own permanent page, downloads and forum coverage.';
        $meta['keywords'] = $line . ' builds, ' . $line . ' build numbers, ' . $line . ' cumulative update, ' . $line . ' latest build';
        $meta['canonical'] = 'https://windowsforum.com/builds/' . $section . '/' . strtolower($tag) . '/';
        return $meta;
    }

    /**
     * Per-section SEO metadata. Strings mirror those in
     * /web/windowsbuilds_app/src/App.tsx so server and client agree.
     */
    protected function getSectionMeta($section, $isBareLanding = false)
    {
        $base = 'https://windowsforum.com/builds';

        if ($isBareLanding) {
            return [
                'title'       => 'Windows, Edge & Office Builds Tracker - All Microsoft Updates',
                'heading'     => 'Microsoft Builds Tracker',
                'description' => 'Track the latest Windows 11, Windows 10, Windows Server, Microsoft Edge, and Office 365 builds across all channels. Real-time updates, version history, download links, and AI-generated summaries.',
                'keywords'    => 'Windows builds, Microsoft builds tracker, Windows updates, Edge builds, Office 365 updates, Windows 11, Windows 10',
                'canonical'   => $base . '/',
            ];
        }

        $map = [
            'windows11' => [
                'title'       => 'Windows 11 Builds Tracker - 25H2, Insider & Release Channels',
                'heading'     => 'Windows 11 Builds',
                'description' => 'Track every Windows 11 build across the Experimental (formerly Dev), Beta, Release Preview and retail channels, including 25H2 (26200) and 24H2 (26100). Version history, download links, and AI summaries.',
                'keywords'    => 'Windows 11 builds, Windows 11 25H2, Windows 11 24H2, Windows 11 Experimental, Windows 11 Release Preview, Windows 11 Insider, Windows 11 Canary, Windows 11 enablement package',
                'canonical'   => $base . '/windows11/',
            ],
            'windows10' => [
                'title'       => 'Windows 10 Builds Tracker - 22H2 & End of Support',
                'heading'     => 'Windows 10 Builds',
                'description' => 'Windows 10 reached end of support on October 14, 2025 (final build 19045.6456). Track the Windows 10 22H2 servicing history and Extended Security Updates (ESU).',
                'keywords'    => 'Windows 10 builds, Windows 10 22H2, Windows 10 end of support, Windows 10 ESU, Windows 10 19045, Windows 10 EOL',
                'canonical'   => $base . '/windows10/',
            ],
            'windowsserver' => [
                'title'       => 'Windows Server Builds - Server 2025, 2022 & LTSC',
                'heading'     => 'Windows Server Builds',
                'description' => 'Track Windows Server builds across LTSC and the Annual Channel, including Windows Server 2025 (26100) and Server 2022. Monitor cumulative updates, hotpatch baselines, and Insider previews.',
                'keywords'    => 'Windows Server builds, Windows Server 2025, Windows Server 2022, Server LTSC, Server Annual Channel, Server hotpatch, Server Insider',
                'canonical'   => $base . '/windowsserver/',
            ],
            'edge' => [
                'title'       => 'Microsoft Edge Builds - Stable, Beta, Dev & Canary Versions',
                'heading'     => 'Microsoft Edge Builds',
                'description' => 'Track Microsoft Edge browser builds across all channels. Monitor Stable, Beta, Dev, and Canary releases with download links for all platforms.',
                'keywords'    => 'Microsoft Edge builds, Edge browser versions, Edge Canary, Edge Dev, Edge Beta, Edge stable, Edge downloads',
                'canonical'   => $base . '/edge/',
            ],
            'office365' => [
                'title'       => 'Office 365 & Microsoft 365 Builds - Updates Tracker',
                'heading'     => 'Office 365 Builds',
                'description' => 'Monitor Office 365 and Microsoft 365 builds. Track updates for Current Channel, Monthly Enterprise, Semi-Annual channels with version history.',
                'keywords'    => 'Office 365 builds, Microsoft 365 updates, Office updates, Office version history, Office Current Channel',
                'canonical'   => $base . '/office365/',
            ],
        ];

        return $map[$section] ?? $map['windows11'];
    }

    /**
     * Fetch the latest builds for a section, normalized for the server-rendered
     * list and the JSON-LD ItemList. Returns [] on any backend failure so the
     * page never blocks on upstream.
     */
    protected function getTopBuildsForSection($section, $limit = 25, ?string $tag = null)
    {
        try {
            switch ($section) {
                case 'windows11':
                case 'windows10':
                case 'windowsserver':
                    $label = $section === 'windows11' ? 'Windows 11'
                        : ($section === 'windows10' ? 'Windows 10' : 'Windows Server');
                    // A version line lists its whole history, not the last 30 days.
                    $data = $tag
                        ? \WindowsBuilds\Widget\LatestBuilds::fetchBuilds($label, 'amd64', 'All', 'All', false)
                        : \WindowsBuilds\Widget\LatestBuilds::fetchBuilds($label, 'amd64', 'Last 30 Days', date('Y'), true);
                    break;
                case 'edge':
                    $data = \WindowsBuilds\Widget\LatestBuilds::fetchEdgeBuilds('Last 30 Days', date('Y'), 'amd64', true);
                    break;
                case 'office365':
                    $data = \WindowsBuilds\Widget\LatestBuilds::fetchOfficeBuilds('Last 30 Days', date('Y'), '', '', true);
                    break;
                default:
                    return [];
            }
        } catch (\Throwable $e) {
            \XF::logError('WindowsBuilds SSR top-builds fetch failed: ' . $e->getMessage());
            return [];
        }

        $builds = array_values($data['builds'] ?? []);

        $isWindows = in_array($section, self::WINDOWS_SECTIONS, true);
        $tagNeedle = $tag !== null ? strtolower($tag) : null;
        $normalized = [];
        $seenBuild = [];
        foreach ($builds as $build) {
            $number = (string) ($build['build_number'] ?? $build['build'] ?? '');
            if ($tagNeedle !== null) {
                $title = strtolower((string) ($build['title'] ?? ''));
                $matches = strpos($title, $tagNeedle) !== false
                    || ($section === 'windowsserver' && strpos($title, 'server ' . $tagNeedle) !== false)
                    || (self::tagForBase($section, $number) === strtoupper($tagNeedle));
                if (!$matches) {
                    continue;
                }
                if ($number !== '' && isset($seenBuild[$number])) {
                    continue; // one row per build number on a version-line page
                }
                $seenBuild[$number] = true;
            }
            $ts = $build['created_timestamp'] ?? null;
            if (!$ts && isset($build['created']) && is_numeric($build['created'])) {
                $ts = (int) $build['created'];
            }
            if (!$ts && !empty($build['releaseDate'])) {
                $parsed = strtotime($build['releaseDate']);
                if ($parsed !== false) {
                    $ts = $parsed;
                }
            }
            if (!$ts) {
                // A build with no usable date is still listed; it just sorts last.
                $ts = 0;
            }
            if ($number === '') {
                $number = (string) ($build['version'] ?? '');
            }
            $permalink = ($isWindows && preg_match('/^\d{4,5}\.\d{1,6}$/', $number))
                ? '/builds/' . $section . '/' . $number . '/'
                : '';
            $normalized[] = [
                'name'      => $build['title'] ?? '',
                'version'   => $number,
                'ts'        => (int) $ts,
                'url'       => $this->buildLinkForBuild($build),
                'permalink' => $permalink,
            ];
        }

        usort($normalized, function ($a, $b) {
            return $b['ts'] <=> $a['ts'];
        });
        $normalized = array_slice($normalized, 0, $limit);

        $items = [];
        foreach ($normalized as $row) {
            $items[] = [
                'name'          => $row['name'],
                'version'       => $row['version'],
                'datePublished' => $row['ts'] ? gmdate('c', $row['ts']) : '',
                'url'           => $row['url'],
                'permalink'     => $row['permalink'],
            ];
        }
        return $items;
    }

    /**
     * Version line of a build from its UUP title (NNHN tag, or "Server 2025"),
     * falling back to the base map. Shared with /wf-builds.php.
     */
    public static function tagForTitle(string $section, string $title, string $build): ?string
    {
        if (preg_match('/\b(\d{2}H\d)\b/i', $title, $m)) {
            return strtoupper($m[1]);
        }
        if ($section === 'windowsserver' && preg_match('/Windows Server[, ]+(?:version )?(\d{4})/i', $title, $m)) {
            return $m[1];
        }
        return self::tagForBase($section, $build);
    }

    /**
     * Version line for a build base when the UUP title carries no NNHN tag.
     * Mirrors BASE_TAGS in fastapi_app/build_detail.py — keep in step.
     */
    public static function tagForBase(string $section, string $build): ?string
    {
        $base = explode('.', $build, 2)[0];
        if ($section === 'windowsserver') {
            $server = ['26100' => '2025', '20348' => '2022', '17763' => '2019', '14393' => '2016'];
            return $server[$base] ?? null;
        }
        $client = [
            '26300' => '26H2', '28000' => '26H1', '26200' => '25H2', '26100' => '24H2',
            '22631' => '23H2', '22621' => '22H2', '19045' => '22H2', '19044' => '21H2',
            '19043' => '21H1', '19042' => '20H2', '19041' => '2004',
        ];
        return $client[$base] ?? null;
    }

    /**
     * Best available outbound link for a normalized build: UUP Dump's per-UUID
     * download page for Windows, the first artifact for Edge. Office builds have
     * no per-build installer link, so they render unlinked.
     */
    protected function buildLinkForBuild(array $build): string
    {
        if (!empty($build['uuid']) && preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', (string) $build['uuid'])) {
            return 'https://uupdump.net/selectlang.php?id=' . urlencode((string) $build['uuid']);
        }
        foreach ((array) ($build['artifacts'] ?? []) as $artifact) {
            $url = $artifact['url'] ?? '';
            if (is_string($url) && preg_match('#^https://#i', $url)) {
                return $url;
            }
        }
        return '';
    }

    /**
     * Build a WebApplication + ItemList JSON-LD blob as an encoded string.
     * Template emits it via {$seoJsonLd|raw} inside a <script> tag.
     */
    protected function buildSeoJsonLd(array $meta, array $topBuilds)
    {
        $itemListElements = [];
        foreach ($topBuilds as $i => $item) {
            if (empty($item['name'])) {
                continue;
            }
            $entry = [
                '@type'    => 'ListItem',
                'position' => $i + 1,
                'name'     => $item['name'],
            ];
            if (!empty($item['version'])) {
                $software = [
                    '@type'         => 'SoftwareApplication',
                    'name'          => $item['name'],
                    'softwareVersion' => $item['version'],
                    'applicationCategory' => 'OperatingSystem',
                ];
                // Linking list items to a real page (UUP dump / artifact URL)
                // lets crawlers treat them as destinations rather than labels.
                $target = !empty($item['permalink']) ? 'https://windowsforum.com' . $item['permalink'] : ($item['url'] ?? '');
                if (!empty($target)) {
                    $entry['url'] = $target;
                    $software['url'] = $target;
                }
                if (!empty($item['datePublished'])) {
                    $software['datePublished'] = $item['datePublished'];
                }
                $entry['item'] = $software;
            }
            $itemListElements[] = $entry;
        }

        $data = [
            '@context'            => 'https://schema.org',
            '@type'               => 'WebApplication',
            'name'                => $meta['title'],
            'description'         => $meta['description'],
            'url'                 => $meta['canonical'],
            'applicationCategory' => 'UtilitiesApplication',
            'operatingSystem'     => 'Web Browser',
            'offers'              => [
                '@type'         => 'Offer',
                'price'         => '0',
                'priceCurrency' => 'USD',
            ],
            'publisher' => [
                '@type' => 'Organization',
                'name'  => 'WindowsForum',
                'url'   => 'https://windowsforum.com',
            ],
        ];

        if ($itemListElements) {
            $data['mainEntity'] = [
                '@type'           => 'ItemList',
                'name'            => $meta['heading'],
                'numberOfItems'   => count($itemListElements),
                'itemListElement' => $itemListElements,
            ];
        }

        // Emitted raw into <script type="application/ld+json"> via {$seoJsonLd|raw}.
        // Feed-sourced name/version can contain "</script>"; JSON_HEX_TAG (and the
        // companion flags) escape < > & ' " so a feed value can't break out of the
        // script block. Do NOT re-add JSON_UNESCAPED_SLASHES — it un-escapes the "/"
        // in "</script>" and reopens the XSS.
        return json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        );
    }
}
