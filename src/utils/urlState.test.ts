import { describe, expect, it } from 'vitest';
import {
  parseUrlFilters,
  serializeUrlFilters,
  URL_FILTER_DEFAULTS,
  type UrlFilters,
} from './urlState';

describe('parseUrlFilters', () => {
  it('returns defaults for an empty search string', () => {
    expect(parseUrlFilters('')).toEqual(URL_FILTER_DEFAULTS);
    expect(parseUrlFilters('?')).toEqual(URL_FILTER_DEFAULTS);
  });

  it('parses a fully-populated link', () => {
    const parsed = parseUrlFilters(
      '?arch=arm64&month=March&year=2025&insider=1&sort=date-asc&type=beta' +
        '&channel=Current%20Channel&platform=MacOS&dl=avail&q=26100&view=list',
    );
    expect(parsed).toEqual({
      arch: 'arm64',
      month: 'March',
      year: '2025',
      insider: true,
      sortBy: 'date-asc',
      buildType: 'beta',
      officeChannel: 'Current Channel',
      platform: 'MacOS',
      downloadFilter: 'Download Available',
      searchQuery: '26100',
      viewMode: 'list',
    });
  });

  it('rejects values outside each control\'s real value set', () => {
    const parsed = parseUrlFilters('?arch=mips&month=Octember&year=20x5&sort=chaos&view=table&dl=sometimes');
    expect(parsed.arch).toBe(URL_FILTER_DEFAULTS.arch);
    expect(parsed.month).toBe(URL_FILTER_DEFAULTS.month);
    expect(parsed.year).toBe(URL_FILTER_DEFAULTS.year);
    expect(parsed.sortBy).toBe(URL_FILTER_DEFAULTS.sortBy);
    expect(parsed.viewMode).toBe(URL_FILTER_DEFAULTS.viewMode);
    expect(parsed.downloadFilter).toBe('All');
  });

  it('caps absurdly long inputs instead of trusting them', () => {
    const parsed = parseUrlFilters(`?q=${'a'.repeat(500)}&channel=${'x'.repeat(500)}`);
    expect(parsed.searchQuery.length).toBeLessThanOrEqual(100);
    expect(parsed.officeChannel!.length).toBeLessThanOrEqual(64);
  });
});

describe('serializeUrlFilters', () => {
  it('emits an empty string when everything is default', () => {
    expect(serializeUrlFilters({ ...URL_FILTER_DEFAULTS })).toBe('');
  });

  it('omits defaults and round-trips through parse', () => {
    const state: UrlFilters = {
      ...URL_FILTER_DEFAULTS,
      arch: 'arm64',
      year: '2024',
      insider: true,
      sortBy: 'version-desc',
      platform: 'Linux',
      downloadFilter: 'No Downloads',
      searchQuery: 'canary',
      viewMode: 'list',
    };
    const qs = serializeUrlFilters(state);
    expect(qs).not.toBe('');
    // Only non-defaults present.
    expect(qs).not.toContain('month=');
    expect(qs).toContain('year=2024');
    // Round-trip equality.
    expect(parseUrlFilters(qs)).toEqual(state);
  });

  it('never serializes a rolling month together with a year', () => {
    const qs = serializeUrlFilters({ ...URL_FILTER_DEFAULTS, month: 'Last 30 Days', year: '2024' });
    // URLSearchParams encodes spaces as '+', which parses back identically.
    expect(qs).toBe('?month=Last+30+Days');
    expect(qs).not.toContain('year');
  });

  it('maps the download filter to its short param', () => {
    expect(serializeUrlFilters({ ...URL_FILTER_DEFAULTS, downloadFilter: 'Download Available' })).toBe('?dl=avail');
  });
});
