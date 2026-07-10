import { describe, expect, it } from 'vitest';
import { fromControls, toQueryParams, matchesDateFilter, isRollingMonth, ALL_DATES } from './dateFilter';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-07-10T00:00:00Z');

describe('fromControls', () => {
  it('maps the rolling options to a rolling window', () => {
    expect(fromControls('Last 60 Days', '2026')).toEqual({ mode: 'rolling', days: 60 });
    expect(fromControls('Last 30 Days', ALL_DATES)).toEqual({ mode: 'rolling', days: 30 });
  });

  it('ignores the year entirely in rolling mode', () => {
    // The old client resolved ("Last 60 Days", "2024") by dropping the rolling
    // window and sending year=2024 — the UI said 60 days, the list showed 2024.
    // The union makes that state unrepresentable.
    expect(fromControls('Last 60 Days', '2024')).toEqual({ mode: 'rolling', days: 60 });
  });

  it('maps everything else to a calendar filter', () => {
    expect(fromControls('July', '2026')).toEqual({ mode: 'calendar', month: 'July', year: '2026' });
    expect(fromControls(ALL_DATES, ALL_DATES)).toEqual({ mode: 'calendar', month: 'All', year: 'All' });
  });
});

describe('isRollingMonth', () => {
  it('identifies the two rolling options', () => {
    expect(isRollingMonth('Last 60 Days')).toBe(true);
    expect(isRollingMonth('Last 30 Days')).toBe(true);
    expect(isRollingMonth('July')).toBe(false);
    expect(isRollingMonth(ALL_DATES)).toBe(false);
  });
});

describe('toQueryParams', () => {
  it('sends use_rolling for a rolling window and never a year', () => {
    expect(toQueryParams(fromControls('Last 60 Days', '2024')))
      .toEqual({ use_rolling: 'true', rolling_days: '60' });
  });

  it('sends month/year for a calendar filter', () => {
    expect(toQueryParams({ mode: 'calendar', month: 'July', year: '2026' }))
      .toEqual({ month: 'July', year: '2026' });
  });

  it('omits "All" from the query string', () => {
    expect(toQueryParams({ mode: 'calendar', month: ALL_DATES, year: ALL_DATES })).toEqual({});
    expect(toQueryParams({ mode: 'calendar', month: ALL_DATES, year: '2025' })).toEqual({ year: '2025' });
  });
});

describe('matchesDateFilter', () => {
  const rolling60 = { mode: 'rolling', days: 60 } as const;

  it('keeps builds inside the rolling window and drops those outside', () => {
    expect(matchesDateFilter(new Date(NOW - 10 * DAY).toISOString(), rolling60, NOW)).toBe(true);
    expect(matchesDateFilter(new Date(NOW - 59 * DAY).toISOString(), rolling60, NOW)).toBe(true);
    expect(matchesDateFilter(new Date(NOW - 61 * DAY).toISOString(), rolling60, NOW)).toBe(false);
  });

  it('treats a naked date-time as UTC when testing the window boundary', () => {
    // Exactly 60 days back, expressed the way the Edge endpoint expresses it.
    const naked = new Date(NOW - 60 * DAY).toISOString().replace('.000Z', '');
    expect(matchesDateFilter(naked, rolling60, NOW)).toBe(true);
  });

  it('matches calendar month/year in UTC', () => {
    const filter = { mode: 'calendar', month: 'January', year: '2026' } as const;
    expect(matchesDateFilter('2026-01-31T23:30:00Z', filter, NOW)).toBe(true);
    expect(matchesDateFilter('2026-02-01T00:30:00Z', filter, NOW)).toBe(false);
    expect(matchesDateFilter('2025-01-15T00:00:00Z', filter, NOW)).toBe(false);
  });

  it('keeps builds whose date cannot be parsed rather than silently hiding them', () => {
    expect(matchesDateFilter(undefined, rolling60, NOW)).toBe(true);
    expect(matchesDateFilter('garbage', rolling60, NOW)).toBe(true);
  });
});
