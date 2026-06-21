import { useState, useEffect, useCallback, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
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
import type { TabType, FilterOptions, WindowsBuild, EdgeBuild, OfficeBuild } from './types';
import { apiService } from './services/api';
import { QuickFilterBar } from './components/filters/QuickFilterBar';
import { isWindowsBuild, isEdgeBuild, isOfficeBuild, type BuildRecord } from './utils/typeGuards';

const getBuildKey = (build: BuildRecord, index: number) => {
  if (isWindowsBuild(build)) return build.uuid;
  if (isEdgeBuild(build)) return build.ReleaseId || `${build.Product}-${build.Version}-${build.Platform}-${build.Architecture}`;
  return `${build.channel}-${build.version}-${build.build || build.title || index}`;
};

const getSearchText = (build: BuildRecord) => {
  if (isWindowsBuild(build)) {
    return [build.title, build.build_number, build.build, build.arch, build.build_type].filter(Boolean).join(' ');
  }
  if (isEdgeBuild(build)) {
    return [build.Product, build.Version, build.Platform, build.Architecture].filter(Boolean).join(' ');
  }
  return [build.title, build.name, build.build, build.version, build.channel].filter(Boolean).join(' ');
};

const getComparableVersion = (build: BuildRecord) => {
  if (isWindowsBuild(build)) return build.build_number || build.build || '';
  if (isEdgeBuild(build)) return build.Version || '';
  return build.build || build.version || '';
};

const getBuildTime = (build: BuildRecord) => {
  const rawDate = isWindowsBuild(build)
    ? build.created_timestamp || build.created
    : isEdgeBuild(build)
      ? build.PublishedTime
      : build.releaseDate;
  if (!rawDate) return 0;
  const timestamp = typeof rawDate === 'number' ? rawDate * 1000 : new Date(rawDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const compareVersions = (a: string, b: string) => {
  const aParts = a.split(/[^\d]+/).filter(Boolean).map(Number);
  const bParts = b.split(/[^\d]+/).filter(Boolean).map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (aParts[index] || 0) - (bParts[index] || 0);
    if (diff !== 0) return diff;
  }

  return a.localeCompare(b);
};

const shouldKeepByDate = (build: BuildRecord, filters: FilterOptions) => {
  if (isWindowsBuild(build)) return true;
  const buildTime = getBuildTime(build);
  if (!buildTime) return true;

  const currentYearStr = new Date().getFullYear().toString();
  const isCurrentYearOrAll = !filters.selectedYear || filters.selectedYear === 'All' || filters.selectedYear === currentYearStr;

  if (isCurrentYearOrAll && (filters.selectedMonth === 'Last 60 Days' || filters.selectedMonth === 'Last 30 Days')) {
    const days = filters.selectedMonth === 'Last 60 Days' ? 60 : 30;
    return Date.now() - buildTime <= days * 24 * 60 * 60 * 1000;
  }

  const date = new Date(buildTime);
  if (filters.selectedMonth && filters.selectedMonth !== 'All' && filters.selectedMonth !== 'Last 60 Days' && filters.selectedMonth !== 'Last 30 Days') {
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    if (monthName !== filters.selectedMonth) return false;
  }

  if (filters.selectedYear && filters.selectedYear !== 'All') {
    if (String(date.getFullYear()) !== filters.selectedYear) return false;
  }

  return true;
};

const getSortBy = (sortBy: FilterOptions['sortBy'], activeTab: TabType): NonNullable<FilterOptions['sortBy']> => {
  if (activeTab === 'edge') {
    return sortBy === 'date-desc' || sortBy === 'date-asc' || sortBy === 'version-desc' || sortBy === 'version-asc'
      ? sortBy
      : 'version-desc';
  }

  return sortBy === 'version-desc' || sortBy === 'version-asc'
    ? 'build-desc'
    : sortBy || 'build-desc';
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function AppContent() {
  // Get initial tab from URL path or data attribute
  const getInitialTab = useCallback((): TabType => {
    // First check data attribute from XenForo
    const rootElement = document.getElementById('windows-builds-root');
    if (rootElement) {
      const section = rootElement.dataset.section;
      if (section) {
        // Map windowsserver to windowsServer for consistency
        if (section === 'windowsserver') return 'windowsServer';
        if (['windows11', 'windows10', 'edge', 'office365'].includes(section)) {
          return section as TabType;
        }
      }
    }

    // Fallback to URL path
    const path = window.location.pathname;
    if (path.includes('/windows11')) return 'windows11';
    if (path.includes('/windows10')) return 'windows10';
    if (path.includes('/windowsserver')) return 'windowsServer';
    if (path.includes('/edge')) return 'edge';
    if (path.includes('/office365')) return 'office365';

    // Check URL hash for backwards compatibility
    const hash = window.location.hash.slice(1);
    if (hash && ['windows11', 'windows10', 'windowsServer', 'edge', 'office365'].includes(hash)) {
      return hash as TabType;
    }

    return 'windows11';
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [filters, setFilters] = useState<FilterOptions>({
    selectedMonth: 'Last 60 Days',
    selectedYear: new Date().getFullYear().toString(),
    selectedArch: 'amd64',
    excludeInsider: false,
    buildFilter: '',
    sortBy: 'build-desc'
  });
  const [platformFilter, setPlatformFilter] = useState('Windows');
  const [downloadFilter, setDownloadFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [windowsBuilds, setWindowsBuilds] = useState<WindowsBuild[]>([]);
  const [edgeBuilds, setEdgeBuilds] = useState<EdgeBuild[]>([]);
  const [officeBuilds, setOfficeBuilds] = useState<OfficeBuild[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<BuildRecord | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const requestIdRef = useRef(0);

  // Update document metadata based on active tab
  const updatePageMetadata = useCallback((tab: TabType) => {
    const metaData = {
      windows11: {
        title: 'Windows 11 Builds Tracker - 25H2, Insider & Release Channels',
        description: 'Track every Windows 11 build across the Experimental (formerly Dev), Beta, Release Preview and retail channels, including 25H2 (26200) and 24H2 (26100). Version history, download links, and AI summaries.',
        keywords: 'Windows 11 builds, Windows 11 25H2, Windows 11 24H2, Windows 11 Experimental, Windows 11 Release Preview, Windows 11 Insider, Windows 11 Canary, Windows 11 enablement package'
      },
      windows10: {
        title: 'Windows 10 Builds Tracker - 22H2 & End of Support',
        description: 'Windows 10 reached end of support on October 14, 2025 (final build 19045.6456). Track the Windows 10 22H2 servicing history and Extended Security Updates (ESU).',
        keywords: 'Windows 10 builds, Windows 10 22H2, Windows 10 end of support, Windows 10 ESU, Windows 10 19045, Windows 10 EOL'
      },
      windowsServer: {
        title: 'Windows Server Builds - Server 2025, 2022 & LTSC',
        description: 'Track Windows Server builds across LTSC and the Annual Channel, including Windows Server 2025 (26100) and Server 2022. Monitor cumulative updates, hotpatch baselines, and Insider previews.',
        keywords: 'Windows Server builds, Windows Server 2025, Windows Server 2022, Server LTSC, Server Annual Channel, Server hotpatch, Server Insider'
      },
      edge: {
        title: 'Microsoft Edge Builds - Stable, Beta, Dev & Canary Versions',
        description: 'Track Microsoft Edge browser builds across all channels. Monitor Stable, Beta, Dev, and Canary releases with download links for all platforms.',
        keywords: 'Microsoft Edge builds, Edge browser versions, Edge Canary, Edge Dev, Edge Beta, Edge stable, Edge downloads'
      },
      office365: {
        title: 'Office 365 & Microsoft 365 Builds - Updates Tracker',
        description: 'Monitor Office 365 and Microsoft 365 builds. Track updates for Current Channel, Monthly Enterprise, Semi-Annual channels with version history.',
        keywords: 'Office 365 builds, Microsoft 365 updates, Office updates, Office version history, Office Current Channel'
      }
    };

    const data = metaData[tab];

    // Update title
    document.title = data.title + ' | WindowsForum';

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', data.description);

    // Update keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', data.keywords);

    // Update Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', data.title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', data.description);

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const baseUrl = 'https://windowsforum.com/builds';
    const tabPaths = {
      windows11: '/windows11',
      windows10: '/windows10',
      windowsServer: '/windowsserver',
      edge: '/edge',
      office365: '/office365'
    };
    canonical.setAttribute('href', baseUrl + tabPaths[tab]);

    // JSON-LD is set server-side in templates.xml with the full WebApplication +
    // ItemList payload. Don't overwrite it here — the client-only blob lacks
    // mainEntity.ItemList and would downgrade the rendered DOM. SPA tab changes
    // don't trigger a fresh crawl, so the SSR JSON-LD remaining static is fine.
  }, []);

  // Handle tab changes and update URL
  const handleTabChange = useCallback((newTab: TabType) => {
    setActiveTab(newTab);
    updatePageMetadata(newTab);

    // Update URL without page reload
    const tabPaths = {
      windows11: '/builds/windows11',
      windows10: '/builds/windows10',
      windowsServer: '/builds/windowsserver',
      edge: '/builds/edge',
      office365: '/builds/office365'
    };

    const newPath = tabPaths[newTab];
    if (window.history && window.history.pushState) {
      window.history.pushState({ tab: newTab }, '', newPath);
    }
  }, [updatePageMetadata]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
        updatePageMetadata(event.state.tab);
      } else {
        const tab = getInitialTab();
        setActiveTab(tab);
        updatePageMetadata(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Set initial metadata
    updatePageMetadata(activeTab);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab, getInitialTab, updatePageMetadata]);

  const loadBuilds = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'windows11':
        case 'windows10':
        case 'windowsServer': {
          const windows = await apiService.fetchWindowsBuilds({ ...filters, tab: activeTab });
          if (requestId !== requestIdRef.current) return;
          setWindowsBuilds(windows);
          break;
        }
        case 'edge': {
          const edge = await apiService.fetchEdgeBuilds({ ...filters, tab: activeTab });
          if (requestId !== requestIdRef.current) return;
          setEdgeBuilds(edge);
          break;
        }
        case 'office365': {
          const office = await apiService.fetchOfficeBuilds({ ...filters, tab: activeTab });
          if (requestId !== requestIdRef.current) return;
          setOfficeBuilds(office);
          break;
        }
      }
      setLastUpdated(new Date());
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load builds');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab, filters]);

  useEffect(() => {
    loadBuilds();
  }, [loadBuilds]);

  // Auto-refresh every 60 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadBuilds();
    }, 60 * 60 * 1000); // 60 minutes in milliseconds

    return () => clearInterval(interval);
  }, [loadBuilds]);

  const getCurrentBuilds = (): BuildRecord[] => {
    if (activeTab === 'edge') return edgeBuilds;
    if (activeTab === 'office365') return officeBuilds;
    return windowsBuilds;
  };

  // Determine which filter to show based on active tab
  const isEdgeTab = activeTab === 'edge';
  const activeSortBy = getSortBy(filters.sortBy, activeTab);

  const filteredBuilds = getCurrentBuilds().filter(build => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!getSearchText(build).toLowerCase().includes(query)) return false;
    }

    // Channel quick-filter (Experimental / Beta / Release Preview / ...).
    if (filters.buildType && build.build_type && build.build_type !== filters.buildType) {
      return false;
    }

    if (isEdgeBuild(build) && platformFilter !== 'All' && platformFilter) {
      if (build.Platform !== platformFilter) return false;
    }

    if (isOfficeBuild(build) && filters.officeChannel && filters.officeChannel !== 'All') {
      if (build.channel !== filters.officeChannel) return false;
    }

    if (!shouldKeepByDate(build, filters)) return false;

    if (isEdgeBuild(build) && downloadFilter !== 'All') {
      const hasDownloads = Boolean(build.Artifacts?.length);
      if (downloadFilter === 'Download Available' && !hasDownloads) return false;
      if (downloadFilter === 'No Downloads' && hasDownloads) return false;
    }

    return true;
  }).sort((a, b) => {
    switch (activeSortBy) {
      case 'date-desc':
        return getBuildTime(b) - getBuildTime(a);
      case 'date-asc':
        return getBuildTime(a) - getBuildTime(b);
      case 'version-desc':
      case 'build-desc':
        return compareVersions(getComparableVersion(b), getComparableVersion(a));
      case 'version-asc':
      case 'build-asc':
        return compareVersions(getComparableVersion(a), getComparableVersion(b));
      default:
        return 0;
    }
  });

  const tabs = [
    { id: 'windows11', label: 'Windows 11', icon: '🪟', color: 'from-blue-500 to-cyan-500' },
    { id: 'windows10', label: 'Windows 10', icon: '💻', color: 'from-blue-600 to-blue-500' },
    { id: 'windowsServer', label: 'Windows Server', icon: '🖥️', color: 'from-violet-500 to-purple-500' },
    { id: 'edge', label: 'Microsoft Edge', icon: '🌐', color: 'from-cyan-500 to-blue-500' },
    { id: 'office365', label: 'Office 365', icon: '📊', color: 'from-orange-500 to-red-500' },
  ];

  const architectures = ['amd64', 'arm64', 'x86'];
  const platforms = ['Windows', 'MacOS', 'Linux', 'Android', 'iOS'];
  const downloadFilters = ['All', 'Download Available', 'No Downloads'];
  const months = ['Last 60 Days', 'Last 30 Days', 'All', 'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = ['All', ...Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())];
  const officeChannels = Array.from(new Set(officeBuilds.map((build) => build.channel).filter(Boolean))).sort();
  const sortOptions = activeTab === 'edge'
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

  return (
    <div className="wf-app-shell min-h-screen transition-colors duration-300">
      <Header />

      <main className="wf-frost max-w-[1200px] mx-auto my-6 rounded-xl px-4 sm:px-6 py-7">
        {/* Hero Section */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold mb-3 text-blue-600 dark:text-blue-400">
            Real-Time Windows Updates
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Stay informed about the latest Windows, Microsoft Edge, and Office 365 builds with real-time updates and detailed information.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-wrap gap-2 justify-center">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                className={cn(
                  'px-6 py-3 rounded-lg font-semibold transition-colors duration-100',
                  'border',
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white border-transparent card-shadow'
                    : 'glass hover:border-blue-400 text-gray-700 dark:text-gray-200'
                )}
                onClick={() => handleTabChange(tab.id as TabType)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                whileTap={{ scale: 0.97 }}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{tab.icon}</span>
                  {tab.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Static Downloads Section for Windows 11 */}
        {activeTab === 'windows11' && <StaticDownloads />}

        {/* Help Link for Windows Builds */}
        {(activeTab === 'windows11' || activeTab === 'windows10' || activeTab === 'windowsServer') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 flex justify-center"
          >
            <a
              href="https://windowsforum.com/threads/how-to-create-a-windows-iso-using-uupdump-windows-11-24h2.338857/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-medium">How to Create a Windows ISO using UUPDump</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </motion.div>
        )}

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card variant="default" className="mb-6">
            <div className="p-6">
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    List
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search builds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Architecture, Edge platform, or Office channel */}
                {isEdgeTab ? (
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Platforms</option>
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                ) : activeTab === 'office365' ? (
                  <select
                    value={filters.officeChannel || 'All'}
                    onChange={(e) => setFilters({ ...filters, officeChannel: e.target.value === 'All' ? undefined : e.target.value })}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Channels</option>
                    {officeChannels.map(channel => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={filters.selectedArch}
                    onChange={(e) => setFilters({ ...filters, selectedArch: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {architectures.map(arch => (
                      <option key={arch} value={arch}>{arch}</option>
                    ))}
                  </select>
                )}

                {/* Month */}
                <select
                  value={filters.selectedMonth}
                  onChange={(e) => setFilters({ ...filters, selectedMonth: e.target.value })}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>

                {/* Year */}
                <select
                  value={filters.selectedYear}
                  onChange={(e) => setFilters({ ...filters, selectedYear: e.target.value })}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={activeSortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex items-center gap-4 flex-wrap">
                {/* Download filter for Edge */}
                {activeTab === 'edge' && (
                  <select
                    value={downloadFilter}
                    onChange={(e) => setDownloadFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {downloadFilters.map(filter => (
                      <option key={filter} value={filter}>{filter}</option>
                    ))}
                  </select>
                )}

                {activeTab !== 'office365' && (
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

                <Badge variant="info" size="sm">
                  {filteredBuilds.length} builds found
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Channel quick-filter (Windows tabs) */}
        {(activeTab === 'windows11' || activeTab === 'windows10' || activeTab === 'windowsServer') && (
          <QuickFilterBar
            activeChannel={filters.buildType ?? null}
            onSelect={(ch) => setFilters({ ...filters, buildType: ch ?? undefined })}
          />
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <Card variant="default" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="p-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-200">Error loading builds</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadBuilds()} className="ml-auto">
                  Retry
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Builds Grid/List */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              )}
            >
              {[...Array(6)].map((_, i) => (
                <SkeletonBuildItem key={i} />
              ))}
            </motion.div>
          ) : filteredBuilds.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card variant="default" className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No builds found</h3>
                <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or search query</p>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="builds"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* List view header */}
              {viewMode === 'list' && (
                <div className="flex items-center gap-2 p-2 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex-shrink-0 w-48 lg:w-56 xl:w-64">Build</div>
                  <div className="flex-shrink-0 w-20">Type</div>
                  <div className="flex-shrink-0 w-16 text-center">
                    {isEdgeTab ? 'Platform' : activeTab === 'office365' ? 'Channel' : 'Arch'}
                  </div>
                  <div className="flex-shrink-0 w-20">Date</div>
                  <div className="flex-shrink-0 w-24">Download</div>
                  <div className="flex-grow" />
                  <div className="flex-shrink-0 w-16">Actions</div>
                </div>
              )}

              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-2'
              )}>
                {viewMode === 'grid' ? (
                filteredBuilds.map((build, index) => (
                  <BuildCard
                    key={getBuildKey(build, index)}
                    build={build}
                    type={activeTab.includes('edge') ? 'edge' : activeTab.includes('office') ? 'office' : 'windows'}
                    onClick={() => {
                      setSelectedBuild(build);
                      setModalOpen(true);
                    }}
                    index={index}
                  />
                ))
              ) : (
                filteredBuilds.map((build, index) => (
                  <BuildListItem
                    key={getBuildKey(build, index)}
                    build={build}
                    type={activeTab.includes('edge') ? 'edge' : activeTab.includes('office') ? 'office' : 'windows'}
                    onClick={() => {
                      setSelectedBuild(build);
                      setModalOpen(true);
                    }}
                    index={index}
                  />
                ))
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Build Details Modal */}
      {selectedBuild && (
        <BuildDetailsModal
          build={selectedBuild}
          type={activeTab.includes('edge') ? 'edge' : activeTab.includes('office') ? 'office' : 'windows'}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedBuild(null);
          }}
        />
      )}

      {/* Attribution Footer */}
      <footer className="mt-10 pb-10 px-4">
        <div className="wf-frost rounded-xl max-w-[1200px] mx-auto px-6 py-5 text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Build information courtesy of{' '}
            <a
              href="https://uupdump.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              UUPDump.net
            </a>
            {' and '}
            <span className="font-medium">Microsoft Corporation</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Download official Windows directly from{' '}
            <a
              href="https://www.microsoft.com/software-download/windows11"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Microsoft Windows 11
            </a>
            {' | '}
            <a
              href="https://www.microsoft.com/software-download/windows10"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
