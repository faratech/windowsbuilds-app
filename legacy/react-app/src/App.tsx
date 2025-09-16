import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { BuildsContainer } from './components/BuildsContainer';
import { FilterBar } from './components/FilterBar';
import { TabNavigation } from './components/TabNavigation';
import { SearchBar } from './components/SearchBar';
import { BuildType, FilterState, TabType } from './types';
import { Box, Fab, Zoom, useScrollTrigger } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTheme } from './contexts/ThemeContext';
import { motion } from 'framer-motion';
import './styles/App.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function ScrollTop() {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={trigger}>
      <Fab
        onClick={handleClick}
        color="primary"
        size="small"
        aria-label="scroll back to top"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>
  );
}

function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <Fab
      onClick={toggleTheme}
      size="small"
      aria-label="toggle theme"
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 72,
        zIndex: 1000,
        bgcolor: theme => theme.palette.mode === 'light' ? '#1a1a1a' : '#ffffff',
        color: theme => theme.palette.mode === 'light' ? '#ffffff' : '#1a1a1a',
        '&:hover': {
          bgcolor: theme => theme.palette.mode === 'light' ? '#2d2d2d' : '#f0f0f0',
        }
      }}
    >
      <motion.div
        animate={{ rotate: mode === 'dark' ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </motion.div>
    </Fab>
  );
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('windows11');
  const [filters, setFilters] = useState<FilterState>({
    month: 'Last 30 Days',
    year: 'All',
    architecture: 'amd64',
    buildType: null,
    searchTerm: '',
    excludeInsider: false,
    channel: '',
    application: ''
  });

  // Update page title based on active tab
  useEffect(() => {
    const titles: Record<TabType, string> = {
      windows11: 'Windows 11 Builds - Latest Updates & Version History',
      windows10: 'Windows 10 Builds - Latest Updates & Version History',
      windowsServer: 'Windows Server Builds - Latest Updates',
      office: 'Microsoft Office Builds - Update Channels',
      edge: 'Microsoft Edge Builds - All Channels'
    };
    
    document.title = titles[activeTab] || 'Windows Builds Tracker';
  }, [activeTab]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleQuickFilter = (filterType: BuildType | 'latest' | 'reset') => {
    if (filterType === 'reset') {
      setFilters(prev => ({
        ...prev,
        buildType: null,
        searchTerm: '',
        excludeInsider: false
      }));
    } else if (filterType === 'latest') {
      setFilters(prev => ({ ...prev, buildType: 'latest' as any }));
    } else {
      setFilters(prev => ({ ...prev, buildType: filterType }));
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        transition: 'background-color 0.3s ease'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <SearchBar 
          value={filters.searchTerm}
          onChange={(searchTerm) => handleFilterChange({ searchTerm })}
          onQuickFilter={handleQuickFilter}
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <FilterBar 
          filters={filters}
          activeTab={activeTab}
          onFilterChange={handleFilterChange}
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <BuildsContainer 
          activeTab={activeTab}
          filters={filters}
        />
      </motion.div>

      <ScrollTop />
      <ThemeToggle />
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;