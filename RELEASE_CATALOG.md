# Microsoft release catalog

The build guide selects the latest **public** OS build for each version. Optional
public previews remain eligible and are labelled. The timeline continues to show
public and Insider builds. Version support, release channel and update kind are
separate facts; a public optional preview is not an Insider Release Preview flight.

## Source and refresh contract

`/web/fastapi_app/microsoft_releases.py` publishes schema version 1 to
`/var/lib/windowsbuilds/microsoft-releases.json`. Python and the XenForo
`WindowsBuilds/Service/ReleaseClassifier.php` read this same local snapshot.
Requests never fetch Microsoft documentation themselves.

The existing `build-kb-refresh` task in `fastapi.service` runs after its 60-second
startup delay, then every two hours. It fetches:

- [Windows 11 release information](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information)
- [Windows 10 release information](https://learn.microsoft.com/en-us/windows/release-health/release-information)
- [Windows Server release information](https://learn.microsoft.com/en-us/windows/release-health/windows-server-release-info)
- [Flight Hub](https://learn.microsoft.com/en-us/windows-insider/flight-hub/)

Release tables provide public build identities, official release dates, KBs and
support dates. KB-less initial GA rows are retained. Flight Hub provides exact
Insider channels and version associations. The narrowly scoped 26300 Release
Preview fallback follows Microsoft's August 27, 2026 announcement; confirmed
public builds take precedence. Unnamed Future Platforms flights stay unnamed.

Each source updates independently. Failed downloads or incomplete lifecycle
parses retain that source's last verified section. Publication uses a file lock
and an atomic rename. Readers retain their last valid snapshot on invalid
replacement. The repository's `fastapi_app/data/build_lines.json` is the startup
fallback; the KB mirror can still provide public builds during a first-run outage.
Verification age is exposed, and the guide marks data older than 24 hours as stale.

Support derives from UTC dates: Home/Pro and Enterprise/Education are separate;
Server mainstream and extended support are separate. 26H1 remains a hardware
exception. Windows 10 ESU and client LTSC servicing do not extend regular support;
LTSC lifecycle exceptions are stored separately in `servicing_exceptions`.

## API and rendering

`GET /api/builds/lines/<family>` retains `latest` for existing consumers and adds
nullable `latest_public`. Microsoft-only builds have no UUP UUID or download.
Their existing build pages can render from the catalog even without a KB row.
A bare Microsoft row with no forum coverage retains the existing noindex policy.

Windows records add `version_tag`, `release_date`, and `update_type`. The React
app uses these for labels, search and timeline presentation. UUP creation times
remain available for feed filtering. Calendar release dates render in UTC without
inventing a publication time. The guide, news ribbon, PHP build-page description,
and JSON-LD use official release dates.

Both authorized AI summary generators use the same verified identity and KB
facts. Summary storage keys use the product (`windows`, `edge`, `office`), while
release channels remain separate metadata. No bulk summary regeneration runs on
catalog refresh.

API and PHP caches include catalog generation and the UTC date. On content or
lifecycle-day changes, the job also invalidates build-page guest entries, HTTPJet
build tags/shared head fragments, the ribbon file, and Cloudflare build prefixes.
An incomplete purge receipt remains pending and is retried on the next refresh.

## Validation and deployment

Backend checks run from `/web/fastapi_app`:

```sh
python3.14 -m pytest -q tests/test_microsoft_releases.py tests/test_build_detail.py tests/test_build_kb.py tests/test_content_build_index.py
python3.14 build_kb.py --once --no-enrich --dry-run
```

Frontend checks run here: `npm run check` and `npm run build`. A build only writes
`dist/`. Copy all built assets to `/web/public_html/js/WindowsBuilds/`, preserving
previous assets until activation is verified. Run `update-controller.sh` with
`CONTROLLER_PATH` pointing to the owned controller, then `npm run deploy:addon`.
Regenerate the scoped WindowsBuilds hash manifest and rebuild the add-on when XML
changes; restart `httpjet-lsphp.service`. Copy the generated hash manifest back to
the owned add-on. Activate backend code through a guarded `fastapi.service`
restart: hold applicable cron locks, verify no active publication/desktop work,
and check `/deepz`. This deployment does not require restarting aiapi.

Verify public APIs, PHP pages and JSON-LD at origin and Cloudflare edge, then
observe the scheduled refresh in the journal. Browser checks on this host must
resolve both windowsforum.com and search.windowsforum.com to their public edge
IPs: `/etc/hosts` otherwise pins them to loopback and Chrome blocks the public
page's private-network fetch.

## September 30, 2026 deployment and rollback

The add-on version stays unchanged. The rollback backup is
`/var/backups/windowsbuilds/release-catalog-20260930T205949/`. It contains the prior
owned frontend/add-on source, deployed add-on/assets/ribbon endpoint, and the six
backend files touched by the catalog integration. `microsoft_releases.py` and
`RELEASE_CATALOG.md` are new files. Two 28020.3112 cached captions had incorrect
Experimental labels; their previous values and database states are preserved in
`summary-corrections.json` alongside the other verification artifacts.

For rollback, restore only these task-owned files, restore matching assets and
controller together, rebuild WindowsBuilds XML/hashes, and perform the same
guarded backend/PHP activation and scoped cache purge. Restore caption keys/rows
only if they still equal the corrected value; preserve later concurrent edits.
Do not restore or stage unrelated ScreenshotAI changes. Quarantine the new
runtime catalog if reverting to the old readers, and retain the backup for review.
