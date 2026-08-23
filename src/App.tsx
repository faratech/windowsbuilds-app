import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  Apps24Regular,
  Desktop24Regular,
  Globe24Regular,
  Server24Regular,
  WindowApps24Regular,
} from '@fluentui/react-icons';
import type { FluentIcon } from '@fluentui/react-icons';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/layout/Header';
import { BuildCard } from './components/BuildCard';
import { BuildListItem } from './components/BuildListItem';
import { BuildDetailsModal } from './components/BuildDetailsModal';
import { StaticDownloads } from './components/StaticDownloads';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { SkeletonBuildItem } from './components/ui/Skeleton';
import { Badge } from './components/ui/Badge';
import { cn } from './utils/cn';
import type { TabType, FilterOptions, SortBy } from './types';
import { QuickFilterBar } from './components/filters/QuickFilterBar';
import { isWindowsBuild, isEdgeBuild, isOfficeBuild, type BuildRecord } from './utils/typeGuards';
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
  { id: 'office365', label: 'Office 365', icon: Apps24Regular, tone: 'office' },
];

const SELECT_CLASS =
  'px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

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
  const [searchQuery, setSearchQuery] = useState(initialUrl.searchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialUrl.viewMode);
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
        title: 'Windows 11 Builds Tracker - 25H2, Insider & Release Channels',
        description: 'Track every Windows 11 build across the Experimental (formerly Dev), Beta, Release Preview and retail channels, including 25H2 (26200) and 24H2 (26100). Version history, download links, and AI summaries.',
        keywords: 'Windows 11 builds, Windows 11 25H2, Windows 11 24H2, Windows 11 Experimental, Windows 11 Release Preview, Windows 11 Insider, Windows 11 Canary, Windows 11 enablement package',
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
      officeChannel: activeTab === 'office365' ? (filters.officeChannel ?? undefined) : undefined,
      platform: activeTab === 'edge' ? platformFilter : 'Windows',
      downloadFilter: activeTab === 'edge' ? downloadFilter : 'All',
      searchQuery,
      viewMode,
    });
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}`);
  }, [activeTab, filters, platformFilter, downloadFilter, searchQuery, viewMode]);

  const isEdgeTab = activeTab === 'edge';
  const isOfficeTab = activeTab === 'office365';
  const activeSortBy = getSortBy(filters.sortBy, activeTab);

  const officeChannels = useMemo(
    () => Array.from(new Set(builds.filter(isOfficeBuild).map((b) => b.channel).filter(Boolean))).sort(),
    [builds],
  );

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

  return (
    <>
      {/* `inert` keeps the page behind an open dialog out of the tab order and
          the accessibility tree. The dialog itself is portaled to <body>, so it
          sits outside this subtree and stays interactive. */}
      <div className="wf-app-shell min-h-screen transition-colors duration-300" inert={modalOpen}>
        <Header />

        <main className="wf-frost max-w-[1200px] mx-auto my-6 rounded-xl px-4 sm:px-6 py-7">
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-4xl font-bold mb-3 text-blue-600 dark:text-blue-400">
              Real-Time Windows Updates
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Stay informed about the latest Windows, Microsoft Edge, and Office 365 builds with real-time updates and detailed information.
            </p>
          </motion.div>

          <nav className="mb-6" aria-label="Product builds">
            <div className="wf-product-tabs" role="tablist" aria-label="Microsoft product builds">
              {PRODUCT_TABS.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;

                return (
                  <motion.button
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
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className={`wf-product-icon wf-product-icon--${tab.tone}`} aria-hidden="true">
                      <Icon />
                    </span>
                    <span>{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </nav>

          <section
            id="product-panel"
            role="tabpanel"
            aria-labelledby={`product-tab-${activeTab}`}
            tabIndex={0}
            aria-busy={query.isLoading}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-lg"
          >
            {activeTab === 'windows11' && <StaticDownloads />}

          {isWindowsTab(activeTab) && (
            <div className="mb-4 flex justify-center">
              <a
                href="https://windowsforum.com/windows-tutorials.305/how-to-create-a-windows-iso-using-uupdump-windows-11-24h2.338857/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-medium">How to Create a Windows ISO using UUPDump</span>
              </a>
            </div>
          )}

          {/* Microsoft ships no per-build Office installer, so the Download Center
              is offered once here instead of on every row. */}
          {isOfficeTab && (
            <div className="mb-4 flex justify-center">
              <a
                href={OFFICE_DOWNLOAD_CENTER}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="font-medium">Microsoft 365 Download Center</span>
              </a>
            </div>
          )}

          <Card variant="default" className="mb-6">
            <div className="p-6">
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                  {query.isSuccess && query.dataUpdatedAt > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Updated {new Date(query.dataUpdatedAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                    size="sm"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    size="sm"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    List
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <label htmlFor="build-search" className="sr-only">Search builds</label>
                  <input
                    id="build-search"
                    type="search"
                    placeholder="Search builds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {isEdgeTab ? (
                  <select
                    aria-label="Filter by platform"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="All">All Platforms</option>
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                ) : isOfficeTab ? (
                  <select
                    aria-label="Filter by Office channel"
                    value={filters.officeChannel || 'All'}
                    onChange={(e) => setFilters({ ...filters, officeChannel: e.target.value === 'All' ? undefined : e.target.value })}
                    className={SELECT_CLASS}
                  >
                    <option value="All">All Channels</option>
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
                      <option key={arch} value={arch}>{arch}</option>
                    ))}
                  </select>
                )}

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
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

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
              </div>

              <div className="mt-4 flex items-center gap-4 flex-wrap">
                {isEdgeTab && (
                  <select
                    aria-label="Filter by download availability"
                    value={downloadFilter}
                    onChange={(e) => setDownloadFilter(e.target.value as DownloadFilter)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {downloadFilters.map((filter) => (
                      <option key={filter} value={filter}>{filter}</option>
                    ))}
                  </select>
                )}

                {!isOfficeTab && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.excludeInsider}
                      onChange={(e) => setFilters({ ...filters, excludeInsider: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Exclude Insider Builds</span>
                  </label>
                )}

                {/* Announcing "0 builds found" while the skeletons are still up
                    is both wrong and, with aria-live, spoken aloud. */}
                <Badge variant="info" size="sm">
                  <span aria-live="polite">
                    {query.isLoading ? 'Loading builds…' : `${filteredBuilds.length} builds found`}
                  </span>
                </Badge>
              </div>
            </div>
          </Card>

          {isWindowsTab(activeTab) && (
            <QuickFilterBar
              activeChannel={filters.buildType ?? null}
              onSelect={(channel) => setFilters({ ...filters, buildType: channel ?? undefined })}
            />
          )}

          {errorMessage && (
            <div className="mb-6">
              <Card variant="default" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <div className="p-6 flex items-center gap-3" role="alert">
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200">Error loading builds</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => query.refetch()} className="ml-auto">
                    Retry
                  </Button>
                </div>
              </Card>
            </div>
          )}

          <AnimatePresence mode="wait">
            {query.isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-busy="true"
                aria-label="Loading builds"
                className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4')}
              >
                {Array.from({ length: 6 }, (_, i) => <SkeletonBuildItem key={`skeleton-${i}`} />)}
              </motion.div>
            ) : filteredBuilds.length === 0 && !errorMessage ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card variant="default" className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No builds found</h3>
                  <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or search query</p>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="builds" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {viewMode === 'list' && (
                  <div className="hidden md:flex items-center gap-2 p-2 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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

                <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-2')}>
                  {filteredBuilds.map((build, index) =>
                    viewMode === 'grid' ? (
                      <BuildCard key={buildKey(build, index)} build={build} onClick={() => setSelectedBuild(build)} />
                    ) : (
                      <BuildListItem key={buildKey(build, index)} build={build} onClick={() => setSelectedBuild(build)} />
                    ),
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </section>
        </main>

        <footer className="mt-10 pb-10 px-4">
          <div className="wf-frost rounded-xl max-w-[1200px] mx-auto px-6 py-5 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Build information courtesy of{' '}
              <a href="https://uupdump.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                UUPDump.net
              </a>
              {' and '}
              <span className="font-medium">Microsoft Corporation</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Download official Windows directly from{' '}
              <a href="https://www.microsoft.com/software-download/windows11" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Microsoft Windows 11
              </a>
              {' | '}
              <a href="https://www.microsoft.com/software-download/windows10" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Windows 10
              </a>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 max-w-2xl mx-auto leading-relaxed">
              WindowsForum.com is an independent community website and is not affiliated with,
              endorsed by, or sponsored by Microsoft Corporation. Windows is a trademark of the
              Microsoft group of companies.
            </p>
          </div>
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
