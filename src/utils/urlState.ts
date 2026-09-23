// Filter state <-> URL query-string mapping.
//
// Every control on the tracker (arch, date range, search, sort, view mode,
// per-tab selects) round-trips through the address bar so a filtered view can
// be shared or bookmarked. Only non-default values are written, keeping URLs
// short; parsing validates against each control's real value set so a
// hand-edited or stale link degrades to defaults instead of poisoning state.

import type { SortBy } from '../types';
import { ALL_DATES, MONTH_OPTIONS, ROLLING_60 } from './dateFilter';

export const ARCHITECTURES = ['amd64', 'arm64', 'x86'] as const;
export const PLATFORMS = ['Windows', 'MacOS', 'Linux', 'Android', 'iOS'] as const;
export const SORT_VALUES = [
  'date-desc', 'date-asc', 'build-desc', 'build-asc', 'version-desc', 'version-asc',
] as const;
export const VIEW_MODES = ['timeline', 'grid', 'list'] as const;

export type DownloadFilter = 'All' | 'Download Available' | 'No Downloads';

const DL_VALUES: Record<string, DownloadFilter> = {
  avail: 'Download Available',
  none: 'No Downloads',
};
const DL_PARAMS: Record<DownloadFilter, string | undefined> = {
  All: undefined,
  'Download Available': 'avail',
  'No Downloads': 'none',
};

export interface UrlFilters {
  arch: string;
  month: string;
  year: string;
  insider: boolean;
  sortBy: SortBy;
  buildType?: string;
  /** Update-kind chip (security, preview, …); validated by the caller. */
  kind?: string;
  officeChannel?: string;
  platform: string;
  downloadFilter: DownloadFilter;
  searchQuery: string;
  viewMode: (typeof VIEW_MODES)[number];
}

export const URL_FILTER_DEFAULTS: UrlFilters = {
  arch: 'amd64',
  month: ROLLING_60,
  year: ALL_DATES,
  insider: false,
  sortBy: 'build-desc',
  platform: 'Windows',
  downloadFilter: 'All',
  searchQuery: '',
  viewMode: 'timeline',
};

/** Params that stay meaningful across product tabs (kept on tab switches). */
export const SHARED_URL_PARAMS = ['arch', 'month', 'year', 'insider', 'q', 'sort', 'view'] as const;

const one = (params: URLSearchParams, key: string): string | undefined =>
  params.get(key)?.slice(0, 64) || undefined;

/** Parse a location.search string into validated filter state. */
export function parseUrlFilters(search: string): UrlFilters {
  const params = new URLSearchParams(search);
  const parsed: UrlFilters = { ...URL_FILTER_DEFAULTS };

  const arch = one(params, 'arch');
  if (arch && (ARCHITECTURES as readonly string[]).includes(arch)) parsed.arch = arch;

  const month = one(params, 'month');
  if (month && MONTH_OPTIONS.includes(month)) parsed.month = month;

  const year = one(params, 'year');
  if (year && /^\d{4}$/.test(year)) parsed.year = year;

  parsed.insider = ['1', 'true'].includes(params.get('insider') ?? '');

  const sort = one(params, 'sort');
  if (sort && (SORT_VALUES as readonly string[]).includes(sort)) parsed.sortBy = sort as SortBy;

  const type = one(params, 'type');
  if (type && /^[\w-]{1,20}$/.test(type)) parsed.buildType = type;

  const kind = one(params, 'kind');
  if (kind && /^[a-z]{1,20}$/.test(kind)) parsed.kind = kind;

  const channel = one(params, 'channel');
  if (channel) parsed.officeChannel = channel;

  const platform = one(params, 'platform');
  if (platform && (PLATFORMS as readonly string[]).includes(platform)) parsed.platform = platform;

  const dl = one(params, 'dl');
  if (dl && DL_VALUES[dl]) parsed.downloadFilter = DL_VALUES[dl];

  parsed.searchQuery = one(params, 'q') ?? '';

  const view = one(params, 'view');
  if (view && (VIEW_MODES as readonly string[]).includes(view)) {
    parsed.viewMode = view as (typeof VIEW_MODES)[number];
  }

  return parsed;
}

/**
 * Serialize filter state back to a query string, omitting defaults. Returns ''
 * when every control is at its default so callers can emit a clean URL.
 */
export function serializeUrlFilters(filters: UrlFilters): string {
  const params = new URLSearchParams();
  const d = URL_FILTER_DEFAULTS;

  if (filters.arch !== d.arch) params.set('arch', filters.arch);
  // A rolling window ignores the year outright — never serialize that pair.
  if (filters.month !== d.month) {
    params.set('month', filters.month);
  } else if (filters.year !== d.year) {
    params.set('year', filters.year);
  }
  if (filters.insider) params.set('insider', '1');
  if (filters.sortBy !== d.sortBy) params.set('sort', filters.sortBy);
  if (filters.buildType) params.set('type', filters.buildType);
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.officeChannel) params.set('channel', filters.officeChannel);
  if (filters.platform !== d.platform) params.set('platform', filters.platform);
  const dl = DL_PARAMS[filters.downloadFilter];
  if (dl) params.set('dl', dl);
  if (filters.searchQuery) params.set('q', filters.searchQuery.slice(0, 100));
  if (filters.viewMode !== d.viewMode) params.set('view', filters.viewMode);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
