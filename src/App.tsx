import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/layout/Header';
import { BuildCard } from './components/BuildCard';
import { BuildListItem } from './components/BuildListItem';
import { BuildDetailsModal } from './components/BuildDetailsModal';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { SkeletonBuildItem } from './components/ui/Skeleton';
import { Badge } from './components/ui/Badge';
import { cn } from './utils/cn';
import type { TabType, FilterOptions, WindowsBuild, EdgeBuild, OfficeBuild } from './types';
import { apiService } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function AppContent() {
  // Get initial tab from URL path
  const getInitialTab = (): TabType => {
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
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [filters, setFilters] = useState<FilterOptions>({
    selectedMonth: 'Last 30 Days',
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
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [lastManualRefresh, setLastManualRefresh] = useState<number>(0);

  // Update document metadata based on active tab
  const updatePageMetadata = useCallback((tab: TabType) => {
    const metaData = {
      windows11: {
        title: 'Windows 11 Builds Tracker - Latest Updates & Downloads',
        description: 'Track all Windows 11 builds including Insider Preview, Canary, Dev, Beta and Release channels. Get version history, download links, and AI summaries.',
        keywords: 'Windows 11 builds, Windows 11 insider, Windows 11 preview, Windows 11 updates, Windows 11 24H2, Windows 11 23H2'
      },
      windows10: {
        title: 'Windows 10 Builds Tracker - Version History & Updates',
        description: 'Monitor Windows 10 builds across all channels. Track cumulative updates, feature updates, and insider preview builds with detailed information.',
        keywords: 'Windows 10 builds, Windows 10 updates, Windows 10 insider, Windows 10 22H2, Windows 10 cumulative updates'
      },
      windowsServer: {
        title: 'Windows Server Builds - Server 2022, 2019, 2016 Updates',
        description: 'Track Windows Server builds including Server 2022, Server 2019, and Server 2016. Monitor updates, security patches, and preview builds.',
        keywords: 'Windows Server builds, Windows Server 2022, Windows Server 2019, Server updates, Server insider preview'
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

    // Add structured data
    let jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.setAttribute('type', 'application/ld+json');
      document.head.appendChild(jsonLd);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': data.title,
      'description': data.description,
      'url': baseUrl + tabPaths[tab],
      'applicationCategory': 'UtilitiesApplication',
      'operatingSystem': 'Web Browser',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'WindowsForum',
        'url': 'https://windowsforum.com'
      }
    };

    jsonLd.textContent = JSON.stringify(structuredData);
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
  }, [activeTab, updatePageMetadata]);

  useEffect(() => {
    loadBuilds();
  }, [activeTab, filters]);

  // Auto-refresh every 60 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadBuilds();
    }, 60 * 60 * 1000); // 60 minutes in milliseconds

    return () => clearInterval(interval);
  }, [activeTab, filters]);

  const loadBuilds = async (forceRefresh = false) => {
    // Check if manual refresh is rate limited (60 minutes)
    if (forceRefresh && !loading) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastManualRefresh;
      const sixtyMinutes = 60 * 60 * 1000;

      if (timeSinceLastRefresh < sixtyMinutes) {
        const remainingMinutes = Math.ceil((sixtyMinutes - timeSinceLastRefresh) / (60 * 1000));
        setError(`Please wait ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} before refreshing again`);
        return;
      }

      setLastManualRefresh(now);
    }

    setLoading(true);
    setError(null);

    try {
      setLastUpdated(new Date());
      switch (activeTab) {
        case 'windows11':
        case 'windows10':
        case 'windowsServer':
          const windows = await apiService.fetchWindowsBuilds({ ...filters, tab: activeTab });
          setWindowsBuilds(windows);
          break;
        case 'edge':
          const edge = await apiService.fetchEdgeBuilds({ ...filters, tab: activeTab });
          setEdgeBuilds(edge);
          break;
        case 'office365':
          const office = await apiService.fetchOfficeBuilds({ ...filters, tab: activeTab });
          setOfficeBuilds(office);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load builds');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentBuilds = () => {
    if (activeTab === 'edge') return edgeBuilds;
    if (activeTab === 'office365') return officeBuilds;
    return windowsBuilds;
  };

  // Determine which filter to show based on active tab
  const isEdgeOrOffice = activeTab === 'edge' || activeTab === 'office365';

  const filteredBuilds = getCurrentBuilds().filter(build => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = ((build as any).title || (build as any).Product || '').toLowerCase();
      const buildNum = ((build as any).build_number || (build as any).Version || (build as any).version || '').toLowerCase();
      if (!title.includes(query) && !buildNum.includes(query)) {
        return false;
      }
    }

    // Platform filter for Edge/Office
    if (isEdgeOrOffice && platformFilter !== 'All' && platformFilter) {
      const buildPlatform = (build as any).Platform;
      if (buildPlatform && buildPlatform !== platformFilter) {
        return false;
      }
    }

    // Download availability filter for Edge
    if (activeTab === 'edge' && downloadFilter !== 'All') {
      const hasDownloads = (build as any).Artifacts && (build as any).Artifacts.length > 0;
      if (downloadFilter === 'Download Available' && !hasDownloads) {
        return false;
      }
      if (downloadFilter === 'No Downloads' && hasDownloads) {
        return false;
      }
    }

    return true;
  });

  const tabs = [
    { id: 'windows11', label: 'Windows 11', icon: '🪟', color: 'from-blue-500 to-cyan-500' },
    { id: 'windows10', label: 'Windows 10', icon: '💻', color: 'from-blue-600 to-blue-500' },
    { id: 'windowsServer', label: 'Windows Server', icon: '🖥️', color: 'from-violet-500 to-purple-500' },
    { id: 'edge', label: 'Microsoft Edge', icon: '🌐', color: 'from-cyan-500 to-blue-500' },
    { id: 'office365', label: 'Office 365', icon: '📊', color: 'from-orange-500 to-red-500' },
  ];

  const architectures = ['amd64', 'arm64', 'x86'];
  const platforms = ['Windows', 'MacOS', 'Linux'];
  const downloadFilters = ['All', 'Download Available', 'No Downloads'];
  const months = ['Last 30 Days', 'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors duration-500">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
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
                  'px-6 py-3 rounded-xl font-medium transition-all duration-300',
                  'border-2 backdrop-blur-md',
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg scale-105 border-transparent'
                    : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                )}
                onClick={() => handleTabChange(tab.id as TabType)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{tab.icon}</span>
                  {tab.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

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
          <Card variant="glass" className="mb-6">
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
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => loadBuilds(true)}
                      disabled={loading}
                      className="ml-2"
                      title={lastManualRefresh > 0 ? `Last manual refresh: ${new Date(lastManualRefresh).toLocaleTimeString()}` : 'Refresh data'}
                    >
                      <svg className={cn("w-3 h-3", loading && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Architecture for Windows or Platform for Edge/Office */}
                {isEdgeOrOffice ? (
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

                {!isEdgeOrOffice && (
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

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <Card variant="glass" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="p-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-200">Error loading builds</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadBuilds(true)} className="ml-auto">
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
              <Card variant="glass" className="text-center py-12">
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
                    {isEdgeOrOffice ? 'Platform' : 'Arch'}
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
                    key={(build as any).uuid || (build as any).ReleaseId || index}
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
                    key={(build as any).uuid || (build as any).ReleaseId || index}
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
      <footer className="mt-12 pb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Build information courtesy of{' '}
          <a
            href="https://uupdump.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
          >
            UUPDump.net
          </a>
          {' and '}
          <span className="font-medium">Microsoft Corporation</span>
        </p>
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