# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based Windows Builds Tracker integrated with XenForo as an addon. It
displays Windows 11, Windows 10, Windows Server, Microsoft Edge, and Office 365
builds with filtering and AI-powered summaries, served at `/builds/`.

## Architecture

### Dual-System Integration

**React App** (`/web/windowsbuilds_app/`):
- Standalone React/TypeScript application built with Vite
- Deployed to `/web/public_html/js/WindowsBuilds/`
- Mounted into `#windows-builds-root` in the XenForo template

**XenForo Addon** (`/web/public_html/src/addons/WindowsBuilds/`):
- Controller: `Pub/Controller/Builds.php` — serves the page, hardcodes the hashed asset paths
- Template: `_data/templates.xml` — React mount point, full-width CSS overrides, SSR JSON-LD
- Routes: `_data/routes.xml` — maps `/builds/` to the controller

### Key Integration Points

1. **Asset management**: the build emits hashed CSS/JS; `update-controller.sh` rewrites the controller to match
2. **Theme detection**: the app mirrors XenForo's `data-color-scheme` / `data-variation` on `<html>`
3. **Mount strategy**: `#windows-builds-root` first, falling back to `#root` for standalone testing
4. **JSON-LD**: rendered server-side in `templates.xml`. The client must not overwrite it — the client-only blob lacks `mainEntity.ItemList`

## Toolchain

- **TypeScript 7** — the Go-native port. `tsc -b` typechecks the whole app in <1s.
- **oxlint**, not ESLint. TS 7's `typescript` package exports only
  `{ version, versionMajorMinor }`; the entire `ts.*` compiler API is gone.
  `typescript-eslint` (all released versions, canary included) reads
  `ts.Extension.*` at import time and peer-caps at `typescript < 6.1`. With TS 7
  installed, `npm ci` fails on the peer conflict and `eslint .` crashes on load.
  **Do not "fix" this by downgrading TypeScript.** oxlint parses TS/TSX natively,
  needs no `typescript` dependency, and covers the same rules.
- **Vitest** + Testing Library + jsdom.

### Tracked manifests

`/web/.gitignore` ignores `*.json` repo-wide. Without the negations in this
directory's `.gitignore`, `package.json`, `package-lock.json`, `tsconfig*.json`
and `.oxlintrc.json` are untracked and a fresh clone cannot install or build.
Do not remove those negations.

## Build Commands

```bash
npm ci                  # clean install (resolves without --legacy-peer-deps)
npm run dev             # dev server on port 3000
npm run build           # typecheck + bundle into dist/ — does NOT touch /web/public_html
npm run lint            # oxlint
npm run typecheck       # tsc -b --force
npm test                # vitest run
npm run check           # lint + typecheck + test

npm run build:full      # build + deploy + activate controller
npm run deploy          # copy dist/assets/* into the web root (explicit, never implicit)
npm run update:controller
```

**`npm run build` must never write outside `dist/`.** It used to chain
`npm run deploy`, so an innocuous build mutated the live web root.

## Deployment Process

`build:full` runs build → deploy → `update-controller.sh`.

`update-controller.sh`:
1. Resolves the entry chunk from `dist/.vite/manifest.json` (never `ls -t`)
2. Refuses to activate unless every imported chunk (`vendor-*`, `rolldown-runtime-*`) is on disk
3. Stages the rewrite in a temp file, asserts the `sed` actually matched, gates it behind `php -l`
4. Moves it into place preserving owner and mode — an owner flip on an lsphp-served file 500s the page
5. Backs up to `/var/backups/windowsbuilds/` (never `/tmp`: tmpfs = RAM; never the git-tracked `.bak`)

It **does not purge** superseded assets: opcache may still be serving the previous
controller, which references the previous entry chunk. After confirming `/builds/`
is healthy, run `./update-controller.sh --prune`.

Paths are overridable via `CONTROLLER_PATH` / `ASSETS_DIR` / `BACKUP_DIR` /
`MANIFEST` env vars, so the script can be exercised against a sandbox tree.

## API

Production base is `https://search.windowsforum.com/api/builds` (`.env.production`).
Dev uses `/api/builds` proxied to `http://localhost:8000` (`vite.config.ts`).

The same-origin `https://windowsforum.com/api/builds/*` is **not** this API — it
hits XenForo's own API and returns `no_api_key_in_request`.

| Endpoint | Parameters the server actually accepts |
|---|---|
| `GET /windows` | `version`, `arch`, `month`, `year`, `exclude_insider`, `search`, `use_rolling`, `rolling_days` |
| `GET /edge` | `channel`, `platform`, `architecture`, `exclude_insider` |
| `GET /office365` | `channel`, `search` |
| `POST /summary` | `uuid`, `title`, `build_type` |

`/windows` has **no** `build_type` parameter — FastAPI silently ignored it.
Channel filtering is client-side.

### Hard-won API facts

- **HTTP 200 can mean failure.** `fastapi_app/routers/builds.py` answers upstream
  errors with `200 {"builds": [], "error": "..."}`. `api.ts` treats a non-empty
  `error` as fatal; do not go back to `data.builds || []`.
- **Timezone-less dates mean UTC.** `created` / `PublishedTime` look like
  `"2026-07-07T07:46:49"`, and `created_timestamp` proves the backend means UTC.
  ECMA-262 parses that form as *local* time. Everything goes through
  `src/utils/dates.ts`; never call `new Date(str)` on an API date directly.
- **`build_type` for `/summary`** is the product (`windows` | `edge` | `office`)
  and forms the backend Redis cache key `{product}build_summary:{uuid}`. Renaming
  those strings orphans every cached summary.

## Component Architecture

- `App.tsx` — tabs, filters, list/grid, history sync
- `hooks/useBuilds.ts` — TanStack Query wiring. **Query keys carry only server-side
  parameters.** Sort, search, channel chips, platform and Office-channel selects are
  local; putting them in a key turns every click into a network round-trip.
- `services/api.ts` — fetch, response validation, 15s timeout, cancellation
- `components/ui/Modal.tsx` — portaled to `<body>`, `role="dialog"` + `aria-modal`,
  focus trap, focus restore, scroll lock that preserves scroll position
- `utils/` — `dates`, `dateFilter`, `buildRecord`, `downloads`. Unit-tested; put
  logic here rather than in components.

### Invariants worth preserving

- **Product is derived from the record, not the active tab.** `buildProduct(build)`.
  Deriving from `activeTab` let an open modal relabel a Windows build as Edge.
- **Channel chips apply to Windows records only.** Otherwise a channel picked on
  Windows silently hides Edge/Office builds with no visible control to clear it.
- **The date filter is a discriminated union** (`utils/dateFilter.ts`). Rolling mode
  disables the year select, so "Last 60 Days" + "2024" is unrepresentable.
- **Office has no per-build download.** `downloadTarget()` returns `null` for Office;
  the Download Center is linked once per tab.
- **`openExternal()` for every outbound link** — HTTPS-only, always
  `noopener,noreferrer`. `Artifacts[].Location` is upstream Microsoft data.
- **The app shell gets `inert` while a dialog is open**; the dialog is portaled out.

## Theme Synchronization

`ThemeContext` watches XenForo's `<html>` attributes (`data-color-scheme`,
`data-variation`, `class`) via `MutationObserver`, falls back to the
`xf_style_variation` cookie, then to `prefers-color-scheme`. It writes
`data-wf-theme` and `.dark` onto `<html>` — which is why the portaled modal still
picks up dark mode.

## XenForo Cache Management

After template or route changes:

```bash
cd /web/public_html && php cmd.php xf:rebuild-master-data
```

## Common Issues and Solutions

1. **`npm ci` fails / `npm run lint` crashes** — something reintroduced `typescript-eslint`. See *Toolchain*.
2. **Asset paths mismatch** — run `npm run update:controller` after deploying.
3. **404s on `vendor-*.js` right after a deploy** — the entry chunk imports its siblings relatively; deploy copies all of `dist/assets/*`. Never prune during activation.
4. **Template not updating** — rebuild XenForo master data.
5. **Dates off by hours** — something bypassed `utils/dates.ts`.
6. **Width constraints** — check the template's CSS overrides.
7. **Forum navbar/sidebar looks "squeezed" (icons glued to text) on /builds/** — someone reintroduced `@import "tailwindcss"` whole. This stylesheet loads globally on the XF page and preflight's `* { margin: 0 }` flattens the forum chrome (bug fixed 2026-08-28). `src/index.css` must import theme+utilities only, with preflight re-applied scoped to `#windows-builds-root` + `.wf-modal-layer`; any new portal wrapper joins that scope list. Same rule in win11store_app.
8. **Template edit deployed (addon-rebuild ran, compiled files fresh) but pages still serve the old markup** — the httpjet capsule snapshot holds the old `<head>`/shell and survives `purge_all`. Purge it explicitly: `curl 'http://127.0.0.1/lscache_purge.php?tag=xf_capsule,xf_capsule_shell' -H 'Host: windowsforum.com'`.
