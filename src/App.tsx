import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import {
  Apps24Regular,
  Desktop24Regular,
  Globe24Regular,
  Server24Regular,
  WindowApps24Regular,
} from '@fluentui/react-icons';
import type { FluentIcon } from '@fluentui/react-icons';
import { ThemeProvider } from './contexts/ThemeContext';
import { BuildCard } from './components/BuildCard';
import { BuildListItem } from './components/BuildListItem';
import { BuildDetailsModal } from './components/BuildDetailsModal';
import { StaticDownloads } from './components/StaticDownloads';
import { Button } from './components/ui/Button';
import { SkeletonBuildItem } from './components/ui/Skeleton';
import { cn } from './utils/cn';
import type { TabType, FilterOptions, SortBy } from './types';
import { QuickFilterBar } from './components/filters/QuickFilterBar';
import { VersionGuide } from './components/VersionGuide';
import { ReleaseTimeline, timelineRowCount } from './components/ReleaseTimeline';
import { GuidePanel } from './components/GuidePanel';
import {
  UPDATE_KIND_META,
  UPDATE_KINDS,
  filterDays,
  groupReleases,
  isUpdateKind,
  kindCounts,
  recordKinds,
  type UpdateKind,
} from './utils/releaseGroups';import { isWindowsBuild, isEdgeBuild, isOfficeBuild, type BuildRecord } from './utils/typeGuards';
import { buildKey, buildSearchText, buildTime, comparableVersion, buildDateValue, compareVersions } from './utils/buildRecord';
import { ALL_DATES, MONTH_OPTIONS, fromControls, isRollingMonth, matchesDateFilter } from './utils/dateFilter';
import { downloadTarget, OFFICE_DOWNLOAD_CENTER } from './utils/downloads';
import {
  parseUrlFilters,
  serializeUrlFilters,
  SHARED_URL_PARAMS,
  type DownloadFilter,
} from './utils/urlState';
import { buildsQueryDefaults, isWindowsTab, useBuilds } from './hooks/useBuilds';

const getSortBy = (sortBy: SortBy, activeTab: TabType): SortBy => {
  if (activeTab === 'edge') {
    return sortBy === 'date-desc' || sortBy === 'date-asc' || sortBy === 'version-desc' || sortBy === 'version-asc'
      ? sortBy
      : 'version-desc';
  }

  return sortBy === 'version-desc' || sortBy === 'version-asc' ? 'build-desc' : sortBy;
};

/** Exported so tests can reset the cache between renders. */
export const queryClient = new QueryClient({ defaultOptions: { queries: buildsQueryDefaults } });

const TAB_PATHS: Record<TabType, string> = {
  windows11: '/builds/windows11',
  windows10: '/builds/windows10',
  windowsServer: '/builds/windowsserver',
  edge: '/builds/edge',
  office365: '/builds/office365',
};

const PRODUCT_TABS: ReadonlyArray<{
  id: TabType;
  label: string;
  icon: FluentIcon;
  tone: string;
}> = [
  { id: 'windows11', label: 'Windows 11', icon: WindowApps24Regular, tone: 'windows11' },
  { id: 'windows10', label: 'Windows 10', icon: Desktop24Regular, tone: 'windows10' },
  { id: 'windowsServer', label: 'Windows Server', icon: Server24Regular, tone: 'server' },
  { id: 'edge', label: 'Microsoft Edge', icon: Globe24Regular, tone: 'edge' },
  { id: 'office365', label: 'Microsoft 365', icon: Apps24Regular, tone: 'office' },
];

const PAGE_SIZE = 30;

const SELECT_CLASS =
  'h-9 px-2.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm ' +
  'text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const VIEW_OPTIONS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'grid', label: 'Grid' },
  { id: 'list', label: 'List' },
] as const;
type ViewMode = (typeof VIEW_OPTIONS)[number]['id'];

const PANEL = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';

function AppContent() {
  const getInitialTab = useCallback((): TabType => {
    const rootElement = document.getElementById('windows-builds-root');
    const section = rootElement?.dataset.section;
    if (section) {
      if (section === 'windowsserver') return 'windowsServer';
      if (['windows11', 'windows10', 'edge', 'office365'].includes(section)) return section as TabType;
    }

    const path = window.location.pathname;
    if (path.includes('/windows11')) return 'windows11';
    if (path.includes('/windows10')) return 'windows10';
    if (path.includes('/windowsserver')) return 'windowsServer';
    if (path.includes('/edge')) return 'edge';
    if (path.includes('/office365')) return 'office365';

    const hash = window.location.hash.slice(1);
    if (hash && ['windows11', 'windows10', 'windowsServer', 'edge', 'office365'].includes(hash)) {
      return hash as TabType;
    }

    return 'windows11';
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  // Filter state is seeded from the query string so a shared/bookmarked URL
  // restores the exact view. Parsing validates every value; anything unknown
  // falls back to the same defaults the raw useState calls used.
  const initialUrl = useMemo(() => parseUrlFilters(window.location.search), []);
  const [filters, setFilters] = useState<FilterOptions>(() => ({
    selectedMonth: initialUrl.month,
    // A rolling window ignores the year outright — mirror the select's rule.
    selectedYear: isRollingMonth(initialUrl.month) ? ALL_DATES : initialUrl.year,
    selectedArch: initialUrl.arch,
    excludeInsider: initialUrl.insider,
    sortBy: getSortBy(initialUrl.sortBy, activeTab),
    buildType: initialUrl.buildType as FilterOptions['buildType'],
    officeChannel: initialUrl.officeChannel,
  }));
  const [platformFilter, setPlatformFilter] = useState(initialUrl.platform);
  const [downloadFilter, setDownloadFilter] = useState<DownloadFilter>(initialUrl.downloadFilter);
  // /builds/<family>/<tag>/ pages arrive with data-tag on the mount point; the
  // tag seeds the search box so the list opens on that version line.
  const initialTag = useMemo(() => document.getElementById('windows-builds-root')?.dataset.tag ?? null, []);
  const [searchQuery, setSearchQuery] = useState(initialUrl.searchQuery || initialTag || '');
  const [viewMode, setViewMode] = useState<ViewMode>(initialUrl.viewMode);
  const [kind, setKind] = useState<UpdateKind | null>(isUpdateKind(initialUrl.kind) ? initialUrl.kind : null);
  const [selectedBuild, setSelectedBuild] = useState<BuildRecord | null>(null);
  const tabRefs = useRef<Partial<Record<TabType, HTMLButtonElement | null>>>({});

  const rollingDates = isRollingMonth(filters.selectedMonth);
  const dateFilter = useMemo(
    () => fromControls(filters.selectedMonth, filters.selectedYear),
    [filters.selectedMonth, filters.selectedYear],
  );

  const query = useBuilds({
    tab: activeTab,
    arch: filters.selectedArch,
    excludeInsider: filters.excludeInsider,
    date: dateFilter,
  });

  const builds = useMemo(() => query.data ?? [], [query.data]);

  const updatePageMetadata = useCallback((tab: TabType) => {
    const metaData = {
      windows11: {
        title: 'Windows 11 Builds Tracker - 26H2, 25H2, Insider & Release Channels',
        description: 'Track every Windows 11 build across the Experimental (formerly Dev), Beta, Release Preview and retail channels, including 26H2 (26300), 25H2 (26200) and 24H2 (26100). Version history, download links, and AI summaries.',
        keywords: 'Windows 11 builds, Windows 11 26H2, Windows 11 25H2, Windows 11 24H2, Windows 11 Experimental, Windows 11 Release Preview, Windows 11 Insider, Windows 11 Canary, Windows 11 enablement package',
      },
      windows10: {
        title: 'Windows 10 Builds Tracker - 22H2 & End of Support',
        description: 'Windows 10 reached end of support on October 14, 2025 (final build 19045.6456). Track the Windows 10 22H2 servicing history and Extended Security Updates (ESU).',
        keywords: 'Windows 10 builds, Windows 10 22H2, Windows 10 end of support, Windows 10 ESU, Windows 10 19045, Windows 10 EOL',
      },
      windowsServer: {
        title: 'Windows Server Builds - Server 2025, 2022 & LTSC',
        description: 'Track Windows Server builds across LTSC and the Annual Channel, including Windows Server 2025 (26100) and Server 2022. Monitor cumulative updates, hotpatch baselines, and Insider previews.',
        keywords: 'Windows Server builds, Windows Server 2025, Windows Server 2022, Server LTSC, Server Annual Channel, Server hotpatch, Server Insider',
      },
      edge: {
        title: 'Microsoft Edge Builds - Stable, Beta, Dev & Canary Versions',
        description: 'Track Microsoft Edge browser builds across all channels. Monitor Stable, Beta, Dev, and Canary releases with download links for all platforms.',
        keywords: 'Microsoft Edge builds, Edge browser versions, Edge Canary, Edge Dev, Edge Beta, Edge stable, Edge downloads',
      },
      office365: {
        title: 'Office 365 & Microsoft 365 Builds - Updates Tracker',
        description: 'Monitor Office 365 and Microsoft 365 builds. Track updates for Current Channel, Monthly Enterprise, Semi-Annual channels with version history.',
        keywords: 'Office 365 builds, Microsoft 365 updates, Office updates, Office version history, Office Current Channel',
      },
    };

    const data = metaData[tab];
    document.title = `${data.title} | WindowsForum`;

    const upsertMeta = (selector: string, create: () => HTMLElement, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = create();
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    upsertMeta('meta[name="description"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      return meta;
    }, data.description);

    upsertMeta('meta[name="keywords"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'keywords');
      return meta;
    }, data.keywords);

    upsertMeta('meta[property="og:title"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      return meta;
    }, data.title);

    upsertMeta('meta[property="og:description"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      return meta;
    }, data.description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://windowsforum.com${TAB_PATHS[tab]}`);

    // JSON-LD is set server-side in templates.xml with the full WebApplication +
    // ItemList payload. Don't overwrite it here — the client-only blob lacks
    // mainEntity.ItemList and would downgrade the rendered DOM.
  }, []);

  const handleTabChange = useCallback((newTab: TabType) => {
    // Re-clicking the current tab used to push a duplicate history entry, so
    // "Back" appeared to do nothing until you pressed it as many times as you
    // had clicked.
    if (newTab === activeTab) return;

    // A modal opened on the previous tab would otherwise stay mounted over the
    // new one, describing a build that is no longer in the list.
    setSelectedBuild(null);
    setActiveTab(newTab);
    // Update kinds differ per product (Edge has no setup/.NET), so start clean.
    setKind(null);

    // Carry only cross-tab params onto the new section URL; per-tab selects
    // (platform, channel, download availability, channel chip) start fresh.
    const incoming = new URLSearchParams(window.location.search);
    const shared = new URLSearchParams();
    for (const key of SHARED_URL_PARAMS) {
      const value = incoming.get(key);
      if (value) shared.set(key, value);
    }
    const qs = shared.toString();
    window.history.pushState({ tab: newTab }, '', `${TAB_PATHS[newTab]}${qs ? `?${qs}` : ''}`);
  }, [activeTab]);

  const handleTabKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: TabType) => {
    const currentIndex = PRODUCT_TABS.findIndex((tab) => tab.id === currentTab);
    if (currentIndex < 0) return;

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % PRODUCT_TABS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + PRODUCT_TABS.length) % PRODUCT_TABS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = PRODUCT_TABS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = PRODUCT_TABS[nextIndex];
    if (!nextTab) return;
    tabRefs.current[nextTab.id]?.focus();
    handleTabChange(nextTab.id);
  }, [handleTabChange]);

  useEffect(() => {
    updatePageMetadata(activeTab);
  }, [activeTab, updatePageMetadata]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setSelectedBuild(null);

      // History entries carry their own query string; restore the filters the
      // URL describes rather than keeping whatever is currently on screen.
      const parsed = parseUrlFilters(window.location.search);
      setFilters((current) => ({
        ...current,
        selectedMonth: parsed.month,
        selectedYear: isRollingMonth(parsed.month) ? ALL_DATES : parsed.year,
        selectedArch: parsed.arch,
        excludeInsider: parsed.insider,
        sortBy: parsed.sortBy,
        buildType: parsed.buildType as FilterOptions['buildType'],
        officeChannel: parsed.officeChannel,
      }));
      setPlatformFilter(parsed.platform);
      setDownloadFilter(parsed.downloadFilter);
      setSearchQuery(parsed.searchQuery);
      setViewMode(parsed.viewMode);
      setKind(isUpdateKind(parsed.kind) ? parsed.kind : null);

      setActiveTab(event.state?.tab ?? getInitialTab());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialTab]);

  // Keep the address bar in sync with filter state. replaceState (not push)
  // so tweaking a dropdown doesn't spam history — tab changes above are the
  // navigation events.
  useEffect(() => {
    const qs = serializeUrlFilters({
      arch: filters.selectedArch,
      month: filters.selectedMonth,
      year: filters.selectedYear,
      insider: filters.excludeInsider,
      sortBy: filters.sortBy,
      buildType: isWindowsTab(activeTab) ? filters.buildType : undefined,
      kind: kind ?? undefined,
      officeChannel: activeTab === 'office365' ? (filters.officeChannel ?? undefined) : undefined,
      platform: activeTab === 'edge' ? platformFilter : 'Windows',
      downloadFilter: activeTab === 'edge' ? downloadFilter : 'All',
      // The version line seeded from /builds/<family>/<tag>/ is already in
      // the path; only a query the visitor typed belongs in ?q=.
      searchQuery: initialTag && searchQuery.trim().toUpperCase() === initialTag.toUpperCase() ? '' : searchQuery,
      viewMode,
    });
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}`);
  }, [activeTab, filters, platformFilter, downloadFilter, searchQuery, viewMode, initialTag, kind]);

  const isEdgeTab = activeTab === 'edge';
  const isOfficeTab = activeTab === 'office365';
  const activeSortBy = getSortBy(filters.sortBy, activeTab);

  const officeChannels = useMemo(
    () => Array.from(new Set(builds.filter(isOfficeBuild).map((b) => b.channel).filter(Boolean))).sort(),
    [builds],
  );

  // Render in pages of 30: 80+ cards at once is ~3,800 DOM nodes and most of
  // the main-thread cost on mobile; the rest arrive on "Show more". The cap
  // is keyed to the list's inputs so any filter change starts over without
  // an effect.
  const listSignature = JSON.stringify([activeTab, filters, platformFilter, downloadFilter, searchQuery, kind, viewMode]);
  const [visible, setVisible] = useState({ signature: listSignature, count: PAGE_SIZE });
  const visibleCount = visible.signature === listSignature ? visible.count : PAGE_SIZE;
  const showMore = () => setVisible({ signature: listSignature, count: visibleCount + PAGE_SIZE });

  const filteredBuilds = useMemo(() => {
    // Anchor relative-date filtering to when the dataset was fetched rather
    // than the wall clock: it keeps renders pure and makes "last N days"
    // describe the data actually on screen (refreshed hourly by the query).
    const now = query.dataUpdatedAt;
    const needle = searchQuery.trim().toLowerCase();

    const matches = builds.filter((build) => {
      if (needle && !buildSearchText(build).toLowerCase().includes(needle)) return false;

      // The channel chips are a *Windows* control — the QuickFilterBar is not
      // even rendered on the Edge/Office tabs. Applying `buildType` to every
      // record meant a channel picked on Windows 11 silently survived the tab
      // switch and hid most Edge/Office builds with no visible filter to clear.
      if (filters.buildType && isWindowsBuild(build) && build.build_type !== filters.buildType) {
        return false;
      }

      if (isEdgeBuild(build) && platformFilter !== 'All' && build.Platform !== platformFilter) {
        return false;
      }

      if (isOfficeBuild(build) && filters.officeChannel && filters.officeChannel !== 'All'
        && build.channel !== filters.officeChannel) {
        return false;
      }

      // Windows dates are filtered server-side by the query parameters; Edge and
      // Office endpoints accept no date params, so they are narrowed here.
      if (!isWindowsBuild(build) && !matchesDateFilter(buildDateValue(build), dateFilter, now)) {
        return false;
      }

      if (isEdgeBuild(build) && downloadFilter !== 'All') {
        const available = downloadTarget(build) !== null;
        if (downloadFilter === 'Download Available' && !available) return false;
        if (downloadFilter === 'No Downloads' && available) return false;
      }

      return true;
    });

    return matches.sort((a, b) => {
      switch (activeSortBy) {
        case 'date-desc': return buildTime(b) - buildTime(a);
        case 'date-asc': return buildTime(a) - buildTime(b);
        case 'version-desc':
        case 'build-desc': return compareVersions(comparableVersion(b), comparableVersion(a));
        case 'version-asc':
        case 'build-asc': return compareVersions(comparableVersion(a), comparableVersion(b));
        default: return 0;
      }
    });
  }, [builds, query.dataUpdatedAt, searchQuery, filters.buildType, filters.officeChannel, platformFilter, downloadFilter, dateFilter, activeSortBy]);

  // Timeline rows merge records that are one release (same KB across 24H2/25H2,
  // one Edge version on five platforms). Kinds are resolved in same-day context,
  // and grid/list filter on the resolved kind so every view agrees.
  const allDays = useMemo(() => groupReleases(filteredBuilds), [filteredBuilds]);
  const counts = useMemo(() => kindCounts(allDays), [allDays]);
  const days = useMemo(() => filterDays(allDays, kind), [allDays, kind]);
  const listBuilds = useMemo(() => {
    if (!kind) return filteredBuilds;
    const kinds = recordKinds(allDays);
    return filteredBuilds.filter((b) => kinds.get(b) === kind);
  }, [filteredBuilds, allDays, kind]);
  const totalRows = days.reduce((n, d) => n + d.groups.length, 0);
  const shownRows = viewMode === 'timeline' ? timelineRowCount(days, visibleCount) : Math.min(visibleCount, listBuilds.length);
  const remaining = viewMode === 'timeline' ? totalRows - shownRows : listBuilds.length - shownRows;

  const channelCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of builds) {
      if (isWindowsBuild(b) && b.build_type) map.set(b.build_type, (map.get(b.build_type) ?? 0) + 1);
    }
    return map;
  }, [builds]);

  const architectures = ['amd64', 'arm64', 'x86'];
  const platforms = ['Windows', 'MacOS', 'Linux', 'Android', 'iOS'];
  const downloadFilters = ['All', 'Download Available', 'No Downloads'];
  const currentYear = new Date().getFullYear();
  const years = [ALL_DATES, ...Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())];

  const sortOptions = isEdgeTab
    ? [
        { value: 'version-desc', label: 'Version high to low' },
        { value: 'version-asc', label: 'Version low to high' },
        { value: 'date-desc', label: 'Newest first' },
        { value: 'date-asc', label: 'Oldest first' },
      ]
    : [
        { value: 'build-desc', label: 'Build high to low' },
        { value: 'build-asc', label: 'Build low to high' },
        { value: 'date-desc', label: 'Newest first' },
        { value: 'date-asc', label: 'Oldest first' },
      ];

  const errorMessage = query.error
    ? query.error.message || 'Failed to load builds'
    : null;

  const modalOpen = selectedBuild !== null;
  const updatedAt = query.isSuccess && query.dataUpdatedAt > 0
    ? new Date(query.dataUpdatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';
  const chipClass = 'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors';
  const chipOn = 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900';
  const chipOff = 'border-gray-300 bg-white text-gray-800 hover:border-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200';
  const availableKinds = UPDATE_KINDS.filter((k) => (counts.get(k) ?? 0) > 0 || k === kind);

  return (
    <>
      {/* `inert` keeps the page behind an open dialog out of the tab order and
          the accessibility tree. The dialog itself is portaled to <body>, so it
          sits outside this subtree and stays interactive. */}
      <div className="wf-app-shell @container" inert={modalOpen}>
        <main className="max-w-[1320px] mx-auto px-3 sm:px-4 py-4 space-y-4">
          {/* One intro line and the search box. The XenForo shell already
              renders the page's single <h1>; the old banner + hero stacked
              three more titles above the data. */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-[15px] text-gray-700 dark:text-gray-300 max-w-2xl">
              Every Windows, Edge and Office update Microsoft ships, grouped by version — each build has its own page.
            </p>
            <div className="w-full sm:w-[22rem]">
              <label htmlFor="build-search" className="sr-only">Search builds</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="build-search"
                  type="search"
                  placeholder="Build, KB or version — e.g. 26100.9550, KB5124010"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <nav aria-label="Product builds">
            <div className="wf-product-tabs" role="tablist" aria-label="Microsoft product builds">
              {PRODUCT_TABS.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    id={`product-tab-${tab.id}`}
                    role="tab"
                    aria-selected={selected}
                    aria-controls="product-panel"
                    tabIndex={selected ? 0 : -1}
                    ref={(element) => {
                      tabRefs.current[tab.id] = element;
                    }}
                    className="wf-product-tab"
                    onClick={() => handleTabChange(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  >
                    <span className={`wf-product-icon wf-product-icon--${tab.tone}`} aria-hidden="true">
                      <Icon />
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <section
            id="product-panel"
            role="tabpanel"
            aria-labelledby={`product-tab-${activeTab}`}
            tabIndex={-1}
            aria-busy={query.isLoading}
            className="focus:outline-none grid gap-4 @5xl:grid-cols-[minmax(0,1fr)_20rem] items-start"
          >
            <div className="space-y-4 min-w-0">
              <VersionGuide tab={activeTab} builds={builds} activeTag={initialTag} loading={query.isLoading} onOpen={setSelectedBuild} />

              <a href="#wf-channels-heading" className="@5xl:hidden flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm">
                <span>
                  <span className="block font-semibold text-gray-900 dark:text-white">Release, Beta, Experimental…?</span>
                  <span className="text-gray-600 dark:text-gray-400">What the channels and update types mean</span>
                </span>
                <span aria-hidden="true" className="text-gray-500">↓</span>
              </a>

              <section aria-labelledby="wf-releases-heading" className={cn(PANEL, 'overflow-hidden')}>
                <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-baseline gap-3">
                      <h2 id="wf-releases-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
                        {viewMode === 'timeline' ? 'Recent releases' : 'All builds'}
                      </h2>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        <span aria-live="polite">{query.isLoading ? 'Loading builds…' : `${listBuilds.length} builds found`}</span>
                        {updatedAt && !query.isLoading && <span> · updated {updatedAt}</span>}
                      </span>
                    </div>
                    <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5" role="group" aria-label="View">
                      {VIEW_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={viewMode === option.id}
                          onClick={() => setViewMode(option.id)}
                          className={cn(
                            'h-8 px-3 rounded-md text-[13px] font-medium',
                            viewMode === option.id
                              ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {availableKinds.length > 1 && (
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by update type">
                      <button type="button" aria-pressed={kind === null} onClick={() => setKind(null)} className={cn(chipClass, kind === null ? chipOn : chipOff)}>
                        Everything
                      </button>
                      {availableKinds.map((k) => {
                        const meta = UPDATE_KIND_META[k];
                        const active = kind === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={active}
                            title={meta.explain}
                            onClick={() => setKind(active ? null : k)}
                            className={cn(chipClass, active ? chipOn : chipOff)}
                          >
                            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', meta.dot)} />
                            {meta.label}
                            <span className="text-xs opacity-70">{counts.get(k) ?? 0}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isWindowsTab(activeTab) && (
                    <QuickFilterBar
                      activeChannel={filters.buildType ?? null}
                      counts={channelCounts}
                      onSelect={(channel) => setFilters({ ...filters, buildType: channel ?? undefined })}
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Filter by date range"
                      value={filters.selectedMonth}
                      onChange={(e) => {
                        const month = e.target.value;
                        // Selecting a rolling window clears the year outright, so the
                        // page can never claim "Last 60 Days" while showing all of 2024.
                        setFilters({
                          ...filters,
                          selectedMonth: month,
                          selectedYear: isRollingMonth(month) ? ALL_DATES : filters.selectedYear,
                        });
                      }}
                      className={SELECT_CLASS}
                    >
                      {MONTH_OPTIONS.map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>

                    <select
                      aria-label="Filter by year"
                      title={rollingDates ? 'Year does not apply to a rolling date range' : undefined}
                      value={rollingDates ? ALL_DATES : filters.selectedYear}
                      disabled={rollingDates}
                      onChange={(e) => setFilters({ ...filters, selectedYear: e.target.value })}
                      className={SELECT_CLASS}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>{year === ALL_DATES ? 'Any year' : year}</option>
                      ))}
                    </select>

                    {isEdgeTab ? (
                      <>
                        <select
                          aria-label="Filter by platform"
                          value={platformFilter}
                          onChange={(e) => setPlatformFilter(e.target.value)}
                          className={SELECT_CLASS}
                        >
                          <option value="All">All platforms</option>
                          {platforms.map((platform) => (
                            <option key={platform} value={platform}>{platform}</option>
                          ))}
                        </select>
                        <select
                          aria-label="Filter by download availability"
                          value={downloadFilter}
                          onChange={(e) => setDownloadFilter(e.target.value as DownloadFilter)}
                          className={SELECT_CLASS}
                        >
                          {downloadFilters.map((filter) => (
                            <option key={filter} value={filter}>{filter === 'All' ? 'With or without download' : filter}</option>
                          ))}
                        </select>
                      </>
                    ) : isOfficeTab ? (
                      <select
                        aria-label="Filter by Office channel"
                        value={filters.officeChannel || 'All'}
                        onChange={(e) => setFilters({ ...filters, officeChannel: e.target.value === 'All' ? undefined : e.target.value })}
                        className={SELECT_CLASS}
                      >
                        <option value="All">All channels</option>
                        {officeChannels.map((channel) => (
                          <option key={channel} value={channel}>{channel}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        aria-label="Filter by architecture"
                        value={filters.selectedArch}
                        onChange={(e) => setFilters({ ...filters, selectedArch: e.target.value })}
                        className={SELECT_CLASS}
                      >
                        {architectures.map((arch) => (
                          <option key={arch} value={arch}>{arch === 'amd64' ? 'x64 (amd64)' : arch}</option>
                        ))}
                      </select>
                    )}

                    {viewMode !== 'timeline' && (
                      <select
                        aria-label="Sort builds"
                        value={activeSortBy}
                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as SortBy })}
                        className={SELECT_CLASS}
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    )}

                    {!isOfficeTab && (
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.excludeInsider}
                          onChange={(e) => setFilters({ ...filters, excludeInsider: e.target.checked })}
                          className="w-4 h-4 accent-blue-600"
                        />
                        Hide pre-release builds
                      </label>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <div className="mx-4 sm:mx-5 mb-4 flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4" role="alert">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-red-900 dark:text-red-200">Error loading builds</h3>
                      <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => query.refetch()} className="ml-auto">
                      Retry
                    </Button>
                  </div>
                )}

                {query.isLoading ? (
                    <div
                      aria-busy="true"
                      aria-label="Loading builds"
                      className="px-4 sm:px-5 pb-5 space-y-3"
                    >
                      {Array.from({ length: 4 }, (_, i) => <SkeletonBuildItem key={`skeleton-${i}`} />)}
                    </div>
                  ) : listBuilds.length === 0 && !errorMessage ? (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-10 text-center">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No builds found</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Try a longer date range, another update type, or a different search.</p>
                    </div>
                  ) : (
                    <div>
                      {viewMode === 'timeline' ? (
                        <ReleaseTimeline days={days} limit={visibleCount} onOpen={setSelectedBuild} />
                      ) : (
                        <div className="border-t border-gray-100 dark:border-gray-800 p-4 sm:p-5">
                          {viewMode === 'list' && (
                            <div className="hidden md:flex items-center gap-2 p-2 mb-2 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              <div className="flex-shrink-0 w-48 lg:w-56 xl:w-64">Build</div>
                              <div className="flex-shrink-0 w-20">Type</div>
                              <div className="flex-shrink-0 w-16 text-center">
                                {isEdgeTab ? 'Platform' : isOfficeTab ? 'Channel' : 'Arch'}
                              </div>
                              <div className="flex-shrink-0 w-20">Date</div>
                              <div className="flex-shrink-0 w-24">Download</div>
                              <div className="flex-grow" />
                              <div className="flex-shrink-0 w-16">Actions</div>
                            </div>
                          )}
                          <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2')}>
                            {listBuilds.slice(0, visibleCount).map((build, index) =>
                              viewMode === 'grid' ? (
                                <BuildCard key={buildKey(build, index)} build={build} onClick={() => setSelectedBuild(build)} />
                              ) : (
                                <BuildListItem key={buildKey(build, index)} build={build} onClick={() => setSelectedBuild(build)} />
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {remaining > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-800 p-3 text-center">
                          <Button variant="ghost" onClick={showMore}>
                            Show more ({remaining} remaining)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
              </section>
            </div>

            <aside className="space-y-4 min-w-0" aria-label="Guide">
              {activeTab === 'windows11' && <StaticDownloads />}
              {/* Microsoft ships no per-build Office installer, so the Download
                  Center is offered once here instead of on every row. */}
              {isOfficeTab && (
                <a
                  href={OFFICE_DOWNLOAD_CENTER}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(PANEL, 'flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline')}
                >
                  Microsoft 365 Download Center
                  <span aria-hidden="true">↗</span>
                </a>
              )}
              <GuidePanel tab={activeTab} builds={builds} />
            </aside>
          </section>
        </main>

        <footer className="max-w-[1320px] mx-auto px-4 pt-2 pb-8 text-center space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Build information courtesy of{' '}
            <a href="https://uupdump.net" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 hover:underline font-medium">
              UUPDump.net
            </a>
            {' and Microsoft. Official downloads: '}
            <a href="https://www.microsoft.com/software-download/windows11" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 hover:underline font-medium">
              Windows 11
            </a>
            {' · '}
            <a href="https://www.microsoft.com/software-download/windows10" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 hover:underline font-medium">
              Windows 10
            </a>
          </p>
          <p className="text-xs max-w-2xl mx-auto leading-relaxed">
            WindowsForum.com is an independent community website and is not affiliated with,
            endorsed by, or sponsored by Microsoft Corporation. Windows is a trademark of the
            Microsoft group of companies.
          </p>
        </footer>
      </div>

      {selectedBuild && (
        <BuildDetailsModal build={selectedBuild} isOpen onClose={() => setSelectedBuild(null)} />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Honours `prefers-reduced-motion` for every framer-motion animation. */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export default App;
