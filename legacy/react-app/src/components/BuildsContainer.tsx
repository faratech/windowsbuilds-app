import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Container, 
  Grid, 
  Typography, 
  Box, 
  Button,
  Paper,
  Fade,
  Stack,
  LinearProgress,
  Alert
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import { BuildCard } from './BuildCard';
import { BuildModal } from './BuildModal';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { buildsApi } from '../services/api';
import { FilterState, TabType, Build } from '../types';

interface BuildsContainerProps {
  activeTab: TabType;
  filters: FilterState;
}

export const BuildsContainer: React.FC<BuildsContainerProps> = ({ activeTab, filters }) => {
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['builds', activeTab, filters],
    queryFn: () => buildsApi.fetchBuilds(activeTab, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const filteredBuilds = useMemo(() => {
    if (!data?.builds) return [];
    
    let builds = [...data.builds];
    
    // Apply client-side filtering for search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      builds = builds.filter(build => 
        build.title.toLowerCase().includes(searchLower) ||
        build.build_number?.toLowerCase().includes(searchLower) ||
        build.version?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply build type filter
    if (filters.buildType && filters.buildType !== 'latest') {
      builds = builds.filter(build => build.build_type === filters.buildType);
    }
    
    // Apply "latest only" filter
    if (filters.buildType === 'latest') {
      const latestByType = new Map<string, Build>();
      builds.forEach(build => {
        const existing = latestByType.get(build.build_type);
        if (!existing || build.created_timestamp > existing.created_timestamp) {
          latestByType.set(build.build_type, build);
        }
      });
      builds = Array.from(latestByType.values());
    }
    
    return builds;
  }, [data, filters]);

  const handleViewDetails = (build: Build) => {
    setSelectedBuild(build);
    setModalOpen(true);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'windows11': return 'Windows 11 Builds';
      case 'windows10': return 'Windows 10 Builds';
      case 'windowsServer': return 'Windows Server Builds';
      case 'office': return 'Microsoft Office Builds';
      case 'edge': return 'Microsoft Edge Builds';
      default: return 'Builds';
    }
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'windows11':
      case 'windows10':
      case 'windowsServer':
        return '🪟';
      case 'office':
        return '📄';
      case 'edge':
        return '🌐';
      default:
        return '📦';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load builds" onRetry={() => refetch()} />;
  }

  const isEdge = activeTab === 'edge';

  return (
    <>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3,
            background: theme => theme.palette.mode === 'light' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 2
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{getTabIcon()}</span>
                {getTabTitle()}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
                {filteredBuilds.length} builds found
                {data?.lastPullTime && (
                  <span>
                    {' '}• Last updated: {new Date(data.lastPullTime * 1000).toLocaleString()}
                  </span>
                )}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isFetching}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                }
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Paper>

        {isFetching && (
          <Fade in={isFetching}>
            <LinearProgress 
              sx={{ 
                mb: 2,
                borderRadius: 1,
                height: 6,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                }
              }} 
            />
          </Fade>
        )}

        <AnimatePresence mode="wait">
          {filteredBuilds.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '2rem'
                  }
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No builds found
                </Typography>
                <Typography variant="body2">
                  No builds match your current filters. Try adjusting your search criteria or refresh the data.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => refetch()}
                  sx={{ mt: 2 }}
                >
                  Refresh Data
                </Button>
              </Alert>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Grid container spacing={3}>
                {filteredBuilds.map((build, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={build.uuid}>
                    <BuildCard 
                      build={build}
                      index={index}
                      isEdge={isEdge}
                      onViewDetails={handleViewDetails}
                    />
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>

      {/* Build Details Modal */}
      {selectedBuild && (
        <BuildModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setTimeout(() => setSelectedBuild(null), 300);
          }}
          build={selectedBuild}
        />
      )}
    </>
  );
};