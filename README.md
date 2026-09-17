# Windows Builds Tracker

A React application for tracking Windows, Microsoft Edge, and Office 365 builds.
Deployed inside XenForo at <https://windowsforum.com/builds/>.

## Features

- **Multi-Platform Support**: Windows 11, Windows 10, Windows Server, Microsoft Edge, and Office 365 builds
- **Filtering**: search, release channel, architecture, platform, date range, and sort order
- **Build Details**: per-build information, artifacts, CVEs, and AI-generated summaries
- **Theme**: follows the host XenForo theme (light/dark), falling back to the OS preference

## Tech Stack

- **React 19** + **TypeScript 7** (`tsc` is the Go-native port; `tsc -b` typechecks in well under a second)
- **Vite 8** for dev and production builds
- **TanStack Query 5** for fetching, caching, cancellation, and background refresh
- **Tailwind CSS 4**
- **oxlint** for linting, **Vitest** + Testing Library for tests

> **Why oxlint and not ESLint?** TypeScript 7 ships no JavaScript compiler API —
> `require('typescript')` exposes only `{ version, versionMajorMinor }`. Every
> released `typescript-eslint` (including its canary) reads `ts.Extension.*` at
> import time and peer-caps at `typescript < 6.1`, so it cannot parse this
> project at all — `npm ci` fails on the peer conflict and `eslint .` crashes on
> load. oxlint parses TS/TSX natively with no `typescript` dependency and covers
> the same rule set (eslint core, TS, react, react-hooks, jsx-a11y, import).

## Development

### Prerequisites

- Node.js `^20.19.0 || ^22.13.0 || >=24` (enforced via `engines`)

### Install

```bash
npm ci
```

### Commands

```bash
npm run dev             # dev server on http://localhost:3000
npm run build           # typecheck + production build into dist/ (does NOT deploy)
npm run lint            # oxlint
npm run typecheck       # tsc -b --force
npm test                # vitest run
npm run check           # lint + typecheck + test
npm run preview         # serve the production build locally
```

`npm run build` never writes outside `dist/`. Deployment is explicit — see below.

## API Configuration

Set `VITE_API_BASE` to the builds API root. It defaults to `/api/builds`, which
works when the app is served behind a same-origin reverse proxy. For local
development, the Vite server proxies `/api` to `http://localhost:8000`.

Endpoints and the parameters each one actually accepts:

| Endpoint | Server-side parameters |
|---|---|
| `GET /windows` | `version`, `arch`, `month`, `year`, `exclude_insider`, `search`, `use_rolling`, `rolling_days` |
| `GET /edge` | `channel`, `platform`, `architecture`, `exclude_insider` |
| `GET /office365` | `channel`, `search` |
| `POST /summary` | `uuid`, `title`, `build_type` |

Note `/windows` has **no** `build_type` parameter. Release-channel filtering is
done client-side.

### Response shape

List endpoints return `{ builds: [...], total, cache_time }` — but answer
upstream failures with **HTTP 200** and `{ builds: [], error: "..." }`. The API
client treats a non-empty `error` as fatal, so an outage surfaces as an error
rather than as an empty "No builds found" state.

### Dates

- `created_timestamp` is epoch **seconds**, UTC.
- `created` and `PublishedTime` are ISO strings **with no timezone designator**,
  and the backend means UTC. `new Date(str)` parses those as *local* time.

Always go through `src/utils/dates.ts`.

## Production integration

`npm run build` creates a standalone `dist/` bundle. Hosting integrations are
responsible for copying that bundle and mounting the API; deployment scripts and
server-specific controller updates are intentionally kept outside this public
source tree.

## Project Structure

```
src/
├── components/       # BuildCard, BuildListItem, BuildDetailsModal, ui/, filters/
├── config/           # release channels, static download links
├── contexts/         # ThemeContext (mirrors XenForo's theme)
├── hooks/            # useBuilds — TanStack Query wiring
├── services/         # api.ts — fetch, validate, time out, cancel
├── types/            # shared types and the API response contract
├── utils/            # dates, dateFilter, buildRecord, downloads, cn
├── App.tsx
├── index.css
└── main.tsx
```

`utils/` holds the logic worth trusting: UTC-safe date parsing, the date-filter
union, record-shape derivation, and download-target resolution. All of it is
unit-tested.

## Notes on behaviour worth knowing

- **Release-channel chips are Windows-only.** They are applied to Windows records
  and nothing else, so a channel selected on the Windows tab cannot silently hide
  Edge or Office builds after a tab switch.
- **Date range is a discriminated union.** Selecting a rolling window ("Last 30 /
  60 Days") disables the year select. "Last 60 Days" and "2024" can no longer be
  selected together.
- **Office has no per-build installer.** Office rows deliberately render no
  Download button; the Microsoft 365 Download Center is linked once per tab.
- **Query keys carry only server-side parameters.** Sort order, search text, the
  channel chips, and the Edge/Office selects are resolved locally and issue no
  network request.

## Release Channels

`canary`, `experimental`, `dev`, `beta`, `release-preview`, `insider`,
`release`, `stable`. Microsoft renamed the Dev Channel to Experimental and folded
Canary into it in 2026; `canary` and `dev` remain as historical labels.

## License

No open-source license has been selected yet. Until a license is added, copyright remains with the project owner and reuse is not granted.
