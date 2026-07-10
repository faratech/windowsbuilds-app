import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { TabType } from '../types';
import type { DateFilter } from '../utils/dateFilter';
import type { BuildRecord } from '../utils/typeGuards';

/**
 * Auto-refresh cadence. The old implementation paired a 60-minute `setInterval`
 * with a 60-minute bespoke response cache. The interval fired a hair *before*
 * the cache entry expired, so every other refresh was absorbed by the cache and
 * the data actually turned over roughly every two hours — while the "Updated
 * HH:MM:SS" label was rewritten on the cache hit, claiming otherwise.
 */
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const WINDOWS_TABS = new Set<TabType>(['windows11', 'windows10', 'windowsServer']);
export const isWindowsTab = (tab: TabType): boolean => WINDOWS_TABS.has(tab);

export interface BuildsQueryInput {
  tab: TabType;
  arch: string;
  excludeInsider: boolean;
  date: DateFilter;
}

/**
 * Query keys carry **only** what the server actually varies on. Search text,
 * sort order, the channel chips, the Edge platform/download selects and the
 * Office channel select are all resolved locally, so changing any of them must
 * not evict the cache or issue a request. That was the single biggest source of
 * redundant traffic: picking a sort order refetched the whole build list.
 */
export function useBuilds(input: BuildsQueryInput): UseQueryResult<BuildRecord[], Error> {
  const { tab, arch, excludeInsider, date } = input;

  const windowsQuery = useQuery({
    queryKey: ['builds', 'windows', tab, arch, excludeInsider, date],
    queryFn: ({ signal }) => apiService.fetchWindowsBuilds({ tab, arch, excludeInsider, date }, signal),
    enabled: isWindowsTab(tab),
  });

  // Edge and Office endpoints take no date parameters; their results are filtered
  // client-side, so neither `date` nor `arch` belongs in their key.
  const edgeQuery = useQuery({
    queryKey: ['builds', 'edge', excludeInsider],
    queryFn: ({ signal }) => apiService.fetchEdgeBuilds({ excludeInsider }, signal),
    enabled: tab === 'edge',
  });

  const officeQuery = useQuery({
    queryKey: ['builds', 'office365'],
    queryFn: ({ signal }) => apiService.fetchOfficeBuilds(signal),
    enabled: tab === 'office365',
  });

  if (tab === 'edge') return edgeQuery as UseQueryResult<BuildRecord[], Error>;
  if (tab === 'office365') return officeQuery as UseQueryResult<BuildRecord[], Error>;
  return windowsQuery as UseQueryResult<BuildRecord[], Error>;
}

export const buildsQueryDefaults = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
  refetchInterval: REFRESH_INTERVAL_MS,
  refetchOnWindowFocus: false,
} as const;
