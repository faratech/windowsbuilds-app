// The builds API hands us dates in three shapes, and only one of them is
// unambiguous:
//
//   created_timestamp  1783410409                  epoch seconds, UTC
//   created            "2026-07-07T07:46:49"       no timezone designator
//   releaseDate        "2026-07-09T21:48:06.833Z"  explicit UTC
//
// ECMA-262 parses a date-*time* string with no offset as **local** time, while
// the backend means UTC — `created_timestamp` and `created` describe the same
// instant. Passing the bare string to `new Date()` therefore shifts every
// Edge/Windows date by the viewer's UTC offset, which silently moves builds
// across the 30/60-day rolling window and renders the wrong calendar day.
// Everything here funnels through `parseBuildDate` so that never happens again.

/** Date-time strings that already carry `Z` or a `±HH:MM` / `±HHMM` offset. */
const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** `YYYY-MM-DDTHH:MM(:SS(.sss)?)?` with no trailing offset. */
const NAKED_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

/**
 * Resolve any build date to epoch milliseconds, or `null` when it is absent or
 * unparseable. Numbers are epoch **seconds** (what UUP Dump emits); naked
 * date-time strings are pinned to UTC rather than the viewer's timezone.
 */
export function parseBuildDate(value?: string | number | null): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return value * 1000;
  }

  const raw = value.trim();
  if (!raw) return null;

  // A bare `YYYY-MM-DD` is already UTC per spec; only the date-*time* form drifts.
  const normalized = NAKED_DATE_TIME.test(raw) && !HAS_TIMEZONE.test(raw) ? `${raw}Z` : raw;

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Epoch millis for sorting. Unparseable dates sort last under `date-desc`. */
export function buildTimestamp(value?: string | number | null): number {
  return parseBuildDate(value) ?? 0;
}

const MONTHS_UTC = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Calendar month/year of an instant, read in UTC. The backend derives its own
 * `month`/`year` fields in UTC, so client-side month filtering has to agree
 * with it or the same build lands in different months on the two code paths.
 */
export function utcMonthName(epochMs: number): string {
  return MONTHS_UTC[new Date(epochMs).getUTCMonth()];
}

export function utcYear(epochMs: number): string {
  return String(new Date(epochMs).getUTCFullYear());
}

/**
 * Render an instant in the viewer's own timezone — correct once the instant
 * itself is right. `now` is injectable so tests need not mock the clock.
 */
export function formatBuildDate(
  value: string | number | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = 'Unknown',
): string {
  const epochMs = parseBuildDate(value);
  if (epochMs === null) return fallback;
  return new Date(epochMs).toLocaleDateString('en-US', options);
}

export const SHORT_DATE: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

export const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};
