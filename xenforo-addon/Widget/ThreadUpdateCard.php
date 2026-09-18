<?php

declare(strict_types=1);

namespace WindowsBuilds\Widget;

use WindowsBuilds\Pub\Controller\Builds;
use XF\Entity\Thread;
use XF\Widget\AbstractWidget;

/**
 * "Update details" sidebar card: the reverse of the /builds/ page's linked
 * content. A build page has always listed the threads about a build; nothing
 * pointed back, so an article naming KB5120998 gave the reader no route to the
 * update it is about.
 *
 * Everything shown is first-party and already stored: `wf_content_build_ref`
 * (fastapi_app/content_build_index.py) says which build or KB a thread names,
 * `wf_build_kb` carries Microsoft's release-health row for it. No model output,
 * no network call, no per-view API hop.
 *
 * A php_callback widget in `thread_view_sidebar` rather than a thread_view
 * override, for the same reason NewsAuthorship's cards are: thread_view carries
 * 35 enabled template modifications whose <find> strings match the live
 * template, and replacing it would break them silently.
 */
class ThreadUpdateCard
{
	/** Extra references listed under the primary one. */
	public const MAX_SECONDARY = 2;
	/** CVE chips; a security round-up can name dozens. */
	public const MAX_CVES = 6;
	public const CACHE_TTL = 300;

	private const UPDATE_TYPE_LABELS = [
		'B' => 'Security update (Patch Tuesday)',
		'C' => 'Optional preview update',
		'D' => 'Optional preview update',
		'E' => 'Servicing stack update',
		'OOB' => 'Out-of-band update',
	];

	private const FAMILY_LABELS = [
		'windows11' => 'Windows 11',
		'windows10' => 'Windows 10',
		'windowsserver' => 'Windows Server',
	];

	/** @var array<int, array|null> */
	private static array $cache = [];

	public static function render(AbstractWidget $widget)
	{
		$thread = $widget->getContextParams()['thread'] ?? null;
		if (!($thread instanceof Thread) || $thread->discussion_state !== 'visible')
		{
			return '';
		}

		$card = self::cardForThread($thread);
		if (!$card)
		{
			return '';
		}

		return $widget->renderer('windowsbuilds_thread_update_card', [
			'thread' => $thread,
			'card' => $card,
		]);
	}

	/**
	 * @return array|null The rendered card data, or null when this thread names
	 *                    no update that resolves to a real build page.
	 */
	public static function cardForThread(Thread $thread): ?array
	{
		$threadId = (int) $thread->thread_id;
		if (array_key_exists($threadId, self::$cache))
		{
			return self::$cache[$threadId];
		}

		// A reply can add a build reference, so the key follows last_post_date
		// the way the supplements renderer does.
		$cacheKey = 'wf_bl:card:' . $threadId . ':' . (int) $thread->last_post_date;
		$redis = self::redis();
		if ($redis)
		{
			try
			{
				$raw = $redis->get($cacheKey);
				if ($raw !== false)
				{
					$decoded = json_decode((string) $raw, true);
					if (is_array($decoded) && array_key_exists('card', $decoded))
					{
						return self::$cache[$threadId] = $decoded['card'];
					}
				}
			}
			catch (\Throwable $ignored)
			{
			}
		}

		$failed = false;
		try
		{
			$card = self::build($threadId);
		}
		catch (\Throwable $e)
		{
			// Do not cache the absence: one blip would suppress the card for
			// every viewer until the TTL expired.
			$card = null;
			$failed = true;
		}

		if ($redis && !$failed)
		{
			try
			{
				$redis->setex($cacheKey, self::CACHE_TTL, json_encode(['card' => $card]));
			}
			catch (\Throwable $ignored)
			{
			}
		}

		return self::$cache[$threadId] = $card;
	}

	private static function redis(): ?\Redis
	{
		try
		{
			return \WindowsForum\SharedRedis::raw();
		}
		catch (\Throwable $e)
		{
			return null;
		}
	}

	private static function build(int $threadId): ?array
	{
		// Joining xf_post is what keeps a deleted or merged post from holding a
		// card open: the indexer only re-reads posts that are new or edited, and
		// neither soft-deletion nor a thread merge touches last_edit_date, so
		// the rows outlive the content that justified them.
		$rows = \XF::db()->fetchAll(
			"SELECT r.kind, r.value, r.family, r.build, r.origin,
					r.renderable, r.family_confident, r.channel, r.build_kind, r.created,
					k.kb, k.kb_url, k.kb_title, k.release_date, k.update_type,
					k.servicing, k.known_issues_json, k.none_known, k.fetched_at,
				s.state AS kb_link_state, s.checked_at AS kb_link_checked,
				s.final_url AS kb_link_alt
			 FROM wf_content_build_ref AS r
			 INNER JOIN xf_post AS p
				ON (p.post_id = r.post_id AND p.thread_id = r.thread_id AND p.message_state = 'visible')
			 INNER JOIN xf_thread AS t ON t.thread_id = r.thread_id
			 LEFT JOIN wf_build_kb AS k ON (k.family = r.family AND k.build = r.build)
			 LEFT JOIN wf_kb_link_state AS s ON s.kb = r.value
			 WHERE r.thread_id = ? AND r.tier = 'exact'
			   AND r.kind IN ('kb', 'build')
			   -- A KB with no build row still identifies a real update: Microsoft's
			   -- release-health tables only list supported releases, so older KBs
			   -- age out of wf_build_kb while the article is still about them.
			   AND (r.kind = 'kb' OR (r.family IS NOT NULL AND r.build IS NOT NULL))
			 ORDER BY r.is_first DESC, (r.origin = 'title') DESC, r.family_confident DESC,
					  (r.family IS NOT NULL) DESC,
					  -- An article is about a contemporaneous update; a KB from
					  -- years earlier is a passing reference, not the subject.
					  (k.release_date IS NOT NULL
					   AND ABS(DATEDIFF(FROM_UNIXTIME(t.post_date), k.release_date)) > 400) ASC,
					  (k.kb IS NOT NULL) DESC, r.renderable DESC, k.release_date DESC, r.value",
			[$threadId]
		);

		$seen = [];
		$refs = [];
		foreach ($rows AS $row)
		{
			$key = $row['family'] === null
				? 'kb/' . $row['value']
				: $row['family'] . '/' . $row['build'];
			if (isset($seen[$key]))
			{
				continue;
			}
			$seen[$key] = true;
			$refs[] = self::reference($row);
		}

		$cves = self::cves($threadId);
		$primary = array_shift($refs);

		if (!$primary)
		{
			// No update to show. A security article that names CVEs but no KB
			// still has something concrete to offer.
			return $cves['items']
				? ['primary' => null, 'secondary' => [], 'cves' => $cves]
				: null;
		}

		return [
			'primary' => $primary,
			'secondary' => array_slice($refs, 0, self::MAX_SECONDARY),
			'cves' => $cves,
		];
	}

	/**
	 * kb_link_check.py (daily) probes every support.microsoft.com KB link the
	 * card can emit -- both the KB-only synthesized URLs and wf_build_kb's
	 * release-health ones. 'dead' (a retired topic, or an Insider flight
	 * whose page is not published yet) shows the KB as plain text; 'catalog'
	 * (the help page is gone but the Update Catalog still serves the
	 * packages) links the catalog search; 'archive' (packages gone too, but
	 * the wayback availability API vouched for a snapshot, stored in
	 * kb_link_alt) links the Internet Archive copy. The weekly recheck flips
	 * dead/catalog back when Microsoft publishes. The 60-day window fails
	 * toward linking if the prober stops running.
	 */
	private static function linkState(array $row): ?string
	{
		$state = $row['kb_link_state'] ?? null;
		if ($state !== 'dead' && $state !== 'catalog' && $state !== 'archive')
		{
			return null;
		}

		return (int) ($row['kb_link_checked'] ?? 0) > time() - 60 * 86400
			? $state
			: null;
	}

	/** Snapshot URLs come from our own prober; validate the shape anyway. */
	private static function archiveUrl(array $row): ?string
	{
		$url = (string) ($row['kb_link_alt'] ?? '');

		return preg_match('#^https?://web\.archive\.org/web/\d{6,14}/#', $url)
			? $url
			: null;
	}

	private static function reference(array $row): array
	{
		if ($row['family'] === null)
		{
			$kb = strtoupper((string) $row['value']);
			$linkState = self::linkState($row);

			return [
				'family' => null,
				'family_label' => null,
				'build' => null,
				'renderable' => false,
				'permalink' => null,
				'tag' => null,
				'tag_url' => null,
				'kb' => $kb,
				'kb_url' => $linkState === 'catalog'
					? 'https://www.catalog.update.microsoft.com/Search.aspx?q=' . $kb
					: ($linkState === 'archive'
						? self::archiveUrl($row)
						: ($linkState === 'dead'
							? null
							: 'https://support.microsoft.com/help/' . substr($kb, 2))),
				'kb_title' => $linkState === 'archive'
					? 'Archived copy - Internet Archive'
					: null,
				'release_date' => null,
				'release_display' => null,
				'update_type_label' => null,
				'servicing' => null,
				'channel' => null,
				'build_kind' => null,
				'created_display' => null,
				'issue_count' => 0,
				'none_known' => false,
				'checked_display' => null,
				'checked_iso' => null,
			];
		}

		$family = (string) $row['family'];
		$build = (string) $row['build'];
		$tag = Builds::tagForBase($family, $build);
		// wf_build_kb carries release-health rows back to 2015 but the build page
		// renders from the UUP cache, so a resolved build is not necessarily a
		// linkable one. Never emit a permalink we know 404s.
		$renderable = (int) ($row['renderable'] ?? 0) === 1;
		// The KB is right but our data only knows it under a product the article
		// is not about; show the update without claiming the product.
		$confident = (int) ($row['family_confident'] ?? 1) === 1;

		return [
			'family' => $family,
			'family_label' => $confident ? (self::FAMILY_LABELS[$family] ?? $family) : null,
			'build' => $build,
			'renderable' => $renderable,
			'permalink' => $renderable ? '/builds/' . $family . '/' . $build . '/' : null,
			'tag' => $tag,
			'tag_url' => ($renderable && $tag) ? '/builds/' . $family . '/' . strtolower($tag) . '/' : null,
			'kb' => $row['kb'] ? (string) $row['kb'] : null,
			'kb_url' => (!$row['kb_url'] || self::linkState($row) === 'dead')
				? null
				: (string) $row['kb_url'],
			'kb_title' => $row['kb_title'] ? (string) $row['kb_title'] : null,
			'release_date' => self::dateValue($row['release_date'] ?? null),
			'release_display' => self::dateDisplay($row['release_date'] ?? null),
			'update_type_label' => self::updateTypeLabel($row['update_type'] ?? null),
			'servicing' => $row['servicing'] ? (string) $row['servicing'] : null,
			// Shown when release-health has no row, so the card is never just a
			// build number and a link.
			'channel' => $row['channel'] ? (string) $row['channel'] : null,
			'build_kind' => $row['build_kind'] ? (string) $row['build_kind'] : null,
			'created_display' => ($row['created'] ?? null)
				? date('M j, Y', (int) $row['created'])
				: null,
			'issue_count' => self::issueCount($row),
			'none_known' => (int) ($row['none_known'] ?? 0) === 1,
			// When we last read Microsoft's KB article. The release date says
			// when the update shipped; this says how current the card itself is,
			// which is what tells a reader the known-issues list is not stale.
			'checked_display' => ($row['fetched_at'] ?? null)
				? date('M j, Y', (int) $row['fetched_at'])
				: null,
			'checked_iso' => ($row['fetched_at'] ?? null)
				? gmdate('Y-m-d', (int) $row['fetched_at'])
				: null,
		];
	}

	/** MySQL DATE columns can hold '0000-00-00', which strtotime() rejects. */
	private static function dateValue($value): ?string
	{
		$value = (string) $value;

		return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && $value !== '0000-00-00'
			? $value
			: null;
	}

	private static function dateDisplay($value): ?string
	{
		$date = self::dateValue($value);
		if ($date === null)
		{
			return null;
		}
		$stamp = strtotime($date);

		return $stamp ? date('M j, Y', $stamp) : null;
	}

	private static function issueCount(array $row): int
	{
		$raw = $row['known_issues_json'] ?? null;
		if (!is_string($raw) || $raw === '')
		{
			return 0;
		}
		$decoded = json_decode($raw, true);

		return is_array($decoded) ? count($decoded) : 0;
	}

	/** Mirrors update_type_label() in fastapi_app/build_kb.py - keep in step. */
	public static function updateTypeLabel($updateType): ?string
	{
		if (!is_string($updateType) || trim($updateType) === '')
		{
			return null;
		}
		// Microsoft's values are "2026-08 B", "2026-08 D" and "2025-12 OOB" -- the
		// suffix is what carries the meaning, and a bare "OOB" never occurs
		// (0 of 1,944 rows; 302 end in it).
		$key = strtoupper(trim($updateType));
		if (preg_match('/(?:^|\s)(OOB|[A-E])$/', $key, $m))
		{
			return self::UPDATE_TYPE_LABELS[$m[1]] ?? $updateType;
		}

		return $updateType;
	}

	private static function cves(int $threadId): array
	{
		$rows = \XF::db()->fetchAllColumn(
			"SELECT DISTINCT value FROM wf_content_build_ref
			 WHERE thread_id = ? AND kind = 'cve' AND tier = 'exact'
			 ORDER BY value DESC
			 LIMIT " . (self::MAX_CVES + 1),
			[$threadId]
		);
		$more = count($rows) > self::MAX_CVES;
		$rows = array_slice($rows, 0, self::MAX_CVES);

		$out = [];
		foreach ($rows AS $cve)
		{
			// NVD, not MSRC. The MSRC update guide only covers Microsoft's own
			// products, but this index extracts every CVE a thread names --
			// Rockwell, Fortinet, Zimbra, Linux kernel and the rest. Sampling 25
			// live CVEs against MSRC's own SUG API returned 404 for 10 of them,
			// so 40% of these links were dead. NVD carries every published CVE,
			// Microsoft's included.
			$out[] = [
				'id' => $cve,
				'url' => 'https://nvd.nist.gov/vuln/detail/' . rawurlencode($cve),
			];
		}

		return ['items' => $out, 'more' => $more];
	}
}
