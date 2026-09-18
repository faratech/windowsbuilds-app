<?php

namespace WindowsBuilds;

use XF\AddOn\AbstractSetup;

class Setup extends AbstractSetup
{
    use \XF\AddOn\StepRunnerInstallTrait;
    use \XF\AddOn\StepRunnerUninstallTrait;
    use \XF\AddOn\StepRunnerUpgradeTrait;

    /** Marker comments wrapping the addon's .htaccess block (idempotent installs). */
    protected const HTACCESS_BEGIN = '# BEGIN WindowsBuilds SEO Redirects';
    protected const HTACCESS_END = '# END WindowsBuilds SEO Redirects';
    /** Pre-marker heading used by older installs; upgraded in place. */
    protected const HTACCESS_LEGACY_MARKER = '# WindowsBuilds SEO Redirects';

    public function installStep1()
    {
        $this->createAiBuildSummariesTable();
        $this->createContentBuildRefTables();
        $this->syncHtaccessBlock();
    }

    public function upgrade1000011Step1()
    {
        $this->createAiBuildSummariesTable();
        $this->syncHtaccessBlock();
    }

    public function upgrade1000021Step1()
    {
        $this->createContentBuildRefTables();
    }

    /**
     * The summaries table is shared with the FastAPI backend
     * (fastapi_app/routers/builds.py reads/writes it), hence no uninstall drop:
     * removing this add-on must not orphan the backend's cache.
     */
    private function createAiBuildSummariesTable()
    {
        $this->db()->query("
            CREATE TABLE IF NOT EXISTS ai_build_summaries (
                build_type VARCHAR(50) NOT NULL,
                uuid VARCHAR(255) NOT NULL,
                summary TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (build_type, uuid),
                INDEX (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    /**
     * Reverse index: which build or KB a thread/post names. Written by
     * fastapi_app/content_build_index.py and read by the "Update details"
     * sidebar card; canonical DDL lives beside it in ops/sql/wf_content_build_ref.sql.
     *
     * Shared with the FastAPI backend, so like ai_build_summaries it is never
     * dropped on uninstall: removing this add-on must not orphan the index.
     */
    private function createContentBuildRefTables()
    {
        $this->db()->query("
            CREATE TABLE IF NOT EXISTS wf_content_build_ref (
                ref_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                thread_id INT UNSIGNED NOT NULL,
                post_id INT UNSIGNED NOT NULL,
                node_id INT UNSIGNED NOT NULL,
                is_first TINYINT(1) NOT NULL DEFAULT 0,
                kind ENUM('kb','build','tag','cve') NOT NULL,
                value VARCHAR(24) NOT NULL,
                family VARCHAR(16) NULL,
                build VARCHAR(24) NULL,
                renderable TINYINT(1) NOT NULL DEFAULT 0,
                family_confident TINYINT(1) NOT NULL DEFAULT 1,
                channel VARCHAR(32) NULL,
                build_kind VARCHAR(32) NULL,
                created INT UNSIGNED NULL,
                tier ENUM('exact','line') NOT NULL,
                origin ENUM('title','body') NOT NULL,
                post_date INT UNSIGNED NOT NULL,
                first_seen INT UNSIGNED NOT NULL,
                updated_at INT UNSIGNED NOT NULL,
                PRIMARY KEY (ref_id),
                UNIQUE KEY uniq_post_kind_value (post_id, kind, value),
                KEY idx_thread (thread_id, tier),
                KEY idx_kind_value (kind, value),
                KEY idx_family_build (family, build, tier),
                KEY idx_post_date (post_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        $this->db()->query("
            CREATE TABLE IF NOT EXISTS wf_kb_link_state (
                kb VARCHAR(12) NOT NULL,
                state ENUM('ok','dead','blocked','catalog','archive') NOT NULL,
                checked_at INT UNSIGNED NOT NULL,
                final_url VARCHAR(255) NULL,
                PRIMARY KEY (kb),
                KEY idx_state_checked (state, checked_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        $this->db()->query("
            CREATE TABLE IF NOT EXISTS wf_content_build_ref_state (
                state_id TINYINT UNSIGNED NOT NULL,
                last_post_id INT UNSIGNED NOT NULL DEFAULT 0,
                last_edit_at INT UNSIGNED NOT NULL DEFAULT 0,
                resolver_fingerprint VARCHAR(64) NOT NULL DEFAULT '',
                updated_at INT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY (state_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    /**
     * Ensure the .htaccess carries the current redirect block: legacy
     * /pages/Builds URLs, bare-prefix and section trailing slashes, deep links
     * from the retired year/month URL scheme collapsing to their section root,
     * and the legacy `office` section name.
     *
     * Writes are atomic (tmp + rename) with a timestamped backup beside the
     * file; a previously unmarked legacy block is replaced by the marked one.
     */
    private function syncHtaccessBlock(): void
    {
        $htaccessPath = \XF::getRootDirectory() . '/.htaccess';
        if (!file_exists($htaccessPath) || !is_writable($htaccessPath)) {
            return;
        }

        $current = (string) file_get_contents($htaccessPath);
        if (strpos($current, self::HTACCESS_BEGIN) !== false) {
            return; // already installed
        }

        // Legacy installs used an unmarked block; excise it before re-adding.
        $legacyPos = strpos($current, self::HTACCESS_LEGACY_MARKER);
        if ($legacyPos !== false) {
            $end = strpos($current, "\n\n", $legacyPos);
            $end = ($end === false) ? strlen($current) : $end;
            $current = substr_replace($current, '', $legacyPos, $end - $legacyPos);
        } else {
            $current = rtrim($current) . "\n";
        }

        $block = self::HTACCESS_BEGIN . "\n"
            . "# Redirect /pages/Builds* -> /builds*\n"
            . "RewriteRule ^pages/Builds(.*)\$ /builds\$1 [R=301,L]\n"
            . "# Bare /builds needs an explicit slash: httpjet does not apply DirectorySlash.\n"
            . "RewriteRule ^builds\$ /builds/ [R=301,L]\n"
            . "# Canonical section roots all include a trailing slash.\n"
            . "RewriteRule ^builds/(windows11|windows10|windowsserver|edge|office365)\$ /builds/\$1/ [R=301,L]\n"
            . "# Build permalinks (26100.9278) and version lines (24h2, server 2025) are real\n"
            . "# routes since 2026-08-29: add their trailing slash, then let them through.\n"
            . "RewriteRule ^builds/(windows11|windows10|windowsserver)/(\\d{4,5}\\.\\d{1,6}|\\d{2}[hH]\\d|\\d{4})\$ /builds/\$1/\$2/ [R=301,L]\n"
            . "# Every other deep link (the retired year/month/recent scheme) still collapses\n"
            . "# to the section root.\n"
            . "RewriteRule ^builds/(windows11|windows10|windowsserver|edge|office365)/(?!(?:\\d{4,5}\\.\\d{1,6}|\\d{2}[hH]\\d|\\d{4})/\$).+\$ /builds/\$1/ [R=301,L]\n"
            . "# Legacy 'office' section name.\n"
            . "RewriteRule ^builds/office(/.*)?\$ /builds/office365/ [R=301,L]\n"
            . self::HTACCESS_END . "\n";

        // Insert ahead of the main XenForo rules when they can be found.
        $xfPos = strpos($current, '# XenForo');
        $updated = ($xfPos !== false)
            ? substr_replace($current, $block . "\n", $xfPos, 0)
            : $current . "\n" . $block;

        $tmp = $htaccessPath . '.wb-tmp-' . getmypid();
        // Snapshot the ORIGINAL file before swapping it in - backing up after
        // the rename would archive the new content and protect nothing.
        if (file_exists($htaccessPath)) {
            @copy($htaccessPath, $htaccessPath . '.wb-bak');
        }
        if (file_put_contents($tmp, $updated, LOCK_EX) !== false) {
            rename($tmp, $htaccessPath);
        }
    }

    public function uninstallStep1()
    {
        $htaccessPath = \XF::getRootDirectory() . '/.htaccess';
        if (!file_exists($htaccessPath) || !is_writable($htaccessPath)) {
            return;
        }

        $current = (string) file_get_contents($htaccessPath);
        $begin = strpos($current, self::HTACCESS_BEGIN);
        if ($begin === false) {
            return;
        }
        $endMarker = strpos($current, self::HTACCESS_END, $begin);
        $end = ($endMarker === false)
            ? strpos($current, "\n\n", $begin)
            : $endMarker + strlen(self::HTACCESS_END);
        if ($end === false) {
            $end = strlen($current);
        }

        $tmp = $htaccessPath . '.wb-tmp-' . getmypid();
        if (file_put_contents($tmp, substr_replace($current, '', $begin, $end - $begin), LOCK_EX) !== false) {
            rename($tmp, $htaccessPath);
        }
    }
}
