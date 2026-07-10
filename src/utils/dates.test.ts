import { describe, expect, it } from 'vitest';
import { parseBuildDate, buildTimestamp, utcMonthName, utcYear } from './dates';

describe('parseBuildDate', () => {
  it('reads epoch seconds as UTC', () => {
    // Live payload: created_timestamp 1783410409 <-> created "2026-07-07T07:46:49"
    expect(parseBuildDate(1783410409)).toBe(1783410409 * 1000);
    expect(new Date(parseBuildDate(1783410409)!).toISOString()).toBe('2026-07-07T07:46:49.000Z');
  });

  it('pins a timezone-less date-time to UTC, not the viewer timezone', () => {
    // The whole point: `new Date("2026-07-07T07:46:49")` is LOCAL time per
    // ECMA-262, so on any non-UTC host this used to disagree with the epoch
    // field describing the same instant.
    expect(parseBuildDate('2026-07-07T07:46:49')).toBe(parseBuildDate(1783410409));
  });

  it('agrees with the epoch field for the Edge PublishedTime shape', () => {
    expect(new Date(parseBuildDate('2026-07-09T20:15:00')!).toISOString())
      .toBe('2026-07-09T20:15:00.000Z');
  });

  it('honours an explicit Z or numeric offset', () => {
    expect(new Date(parseBuildDate('2026-07-09T21:48:06.833Z')!).toISOString())
      .toBe('2026-07-09T21:48:06.833Z');
    expect(new Date(parseBuildDate('2026-07-09T21:48:06+02:00')!).toISOString())
      .toBe('2026-07-09T19:48:06.000Z');
  });

  it('leaves a date-only string alone (already UTC per spec)', () => {
    expect(new Date(parseBuildDate('2026-07-09')!).toISOString()).toBe('2026-07-09T00:00:00.000Z');
  });

  it('returns null for absent or unparseable values', () => {
    expect(parseBuildDate(undefined)).toBeNull();
    expect(parseBuildDate(null)).toBeNull();
    expect(parseBuildDate('')).toBeNull();
    expect(parseBuildDate('not a date')).toBeNull();
    expect(parseBuildDate(0)).toBeNull();
    expect(parseBuildDate(Number.NaN)).toBeNull();
  });
});

describe('buildTimestamp', () => {
  it('collapses missing dates to 0 so they sort last under date-desc', () => {
    expect(buildTimestamp(undefined)).toBe(0);
    expect(buildTimestamp('2026-07-09T20:15:00')).toBeGreaterThan(0);
  });
});

describe('utc calendar helpers', () => {
  it('reads month and year in UTC, matching the backend', () => {
    // 23:30 UTC on 31 Jan is still February for anyone at UTC+1 — the backend
    // says January, so must we.
    const epochMs = Date.parse('2026-01-31T23:30:00Z');
    expect(utcMonthName(epochMs)).toBe('January');
    expect(utcYear(epochMs)).toBe('2026');
  });
});
