// A single, non-contradictory description of "which dates do I want?".
//
// The old UI let you pick "Last 60 Days" *and* the year 2024 at the same time.
// The API client silently resolved that by dropping the rolling window and
// sending `year=2024`, so the page said "Last 60 Days" while showing all of
// 2024. Modelling the choice as a discriminated union makes that state
// unrepresentable: you are either in a rolling window or on a calendar, never
// both. `fromControls` is the one place the raw <select> values are interpreted.

import { parseBuildDate, utcMonthName, utcYear } from './dates';

export type DateFilter =
  | { mode: 'rolling'; days: 30 | 60 }
  | { mode: 'calendar'; month: string; year: string };

export const ROLLING_60 = 'Last 60 Days';
export const ROLLING_30 = 'Last 30 Days';
export const ALL_DATES = 'All';

export const MONTH_OPTIONS = [
  ROLLING_60,
  ROLLING_30,
  ALL_DATES,
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** True when the month <select> value denotes a rolling window, not a month. */
export const isRollingMonth = (month: string): boolean =>
  month === ROLLING_60 || month === ROLLING_30;

/**
 * Interpret the month/year <select> pair. In rolling mode the year is ignored
 * outright — the UI disables it — so no contradictory state can reach the API.
 */
export function fromControls(month: string, year: string): DateFilter {
  if (month === ROLLING_60) return { mode: 'rolling', days: 60 };
  if (month === ROLLING_30) return { mode: 'rolling', days: 30 };
  return { mode: 'calendar', month, year };
}

/**
 * Server query parameters for a date filter. Only the Windows endpoint accepts
 * these; Edge and Office are filtered client-side against the same union.
 */
export function toQueryParams(filter: DateFilter): Record<string, string> {
  if (filter.mode === 'rolling') {
    return { use_rolling: 'true', rolling_days: String(filter.days) };
  }

  const params: Record<string, string> = {};
  if (filter.month !== ALL_DATES) params.month = filter.month;
  if (filter.year !== ALL_DATES) params.year = filter.year;
  return params;
}

/**
 * Client-side predicate, used for Edge and Office (whose endpoints have no date
 * parameters). Builds with an unparseable date are kept rather than silently
 * dropped — a missing timestamp is a data gap, not a filter miss.
 */
export function matchesDateFilter(
  value: string | number | null | undefined,
  filter: DateFilter,
  now: number,
): boolean {
  const epochMs = parseBuildDate(value);
  if (epochMs === null) return true;

  if (filter.mode === 'rolling') {
    return now - epochMs <= filter.days * 24 * 60 * 60 * 1000;
  }

  if (filter.month !== ALL_DATES && utcMonthName(epochMs) !== filter.month) return false;
  if (filter.year !== ALL_DATES && utcYear(epochMs) !== filter.year) return false;
  return true;
}
