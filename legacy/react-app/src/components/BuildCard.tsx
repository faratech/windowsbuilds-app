import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Chip, 
  IconButton, 
  Button,
  Tooltip,
  Box,
  Link,
  Skeleton,
  Collapse,
  Stack
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { format } from 'date-fns';

interface BuildCardProps {
  build: {
    uuid: string;
    title: string;
    build_number?: string;
    version?: string;
    created: string;
    created_timestamp: number;
    build_type?: string;
    channel?: string;
    platform?: string;
    artifacts?: Array<{
      url: string;
      type: string;
      size: string;
    }>;
    summary?: string;
    summary_loading?: boolean;
  };
  index: number;
  isEdge?: boolean;
  onViewDetails: (build: any) => void;
}

export const BuildCard: React.FC<BuildCardProps> = ({ build, index, isEdge, onViewDetails }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const handleCopyLink = () => {
    const url = isEdge 
      ? `https://edgeupdates.microsoft.com/api/products?view=enterprise`
      : `https://uupdump.net/selectlang.php?id=${build.uuid}`;
    
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBuildTypeColor = (type?: string, channel?: string) => {
    const buildType = type || channel || '';
    switch (buildType.toLowerCase()) {
      case 'canary': return 'error';
      case 'dev': return 'success';
      case 'beta': return 'info';
      case 'insider': return 'warning';
      case 'stable': return 'default';
      default: return 'default';
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.43, 0.13, 0.23, 0.96]
      }
    },
    hover: {
      y: -4,
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: 'easeOut'
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    }
  };

  const shimmerVariants = {
    initial: { x: '-100%' },
    animate: {
      x: '100%',
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear'
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      whileHover="hover"
      whileTap="tap"
      variants={cardVariants}
      style={{ height: '100%' }}
    >
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 4,
            height: '100%',
            background: theme => theme.palette.primary.main,
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover::before': {
            opacity: 1,
          }
        }}
      >
        <CardContent sx={{ flex: 1 }}>
          <Stack spacing={2}>
            {/* Title and Tags */}
            <Box>
              <Typography 
                variant="h6" 
                component="h3"
                sx={{ 
                  fontWeight: 600,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onViewDetails(build);
                  }}
                  sx={{ 
                    color: 'inherit',
                    textDecoration: 'none',
                    '&:hover': {
                      color: 'primary.main'
                    }
                  }}
                >
                  {build.title}
                </Link>
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(build.build_type || build.channel) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <Chip
                      label={(build.build_type || build.channel || '').toUpperCase()}
                      size="small"
                      color={getBuildTypeColor(build.build_type, build.channel)}
                      sx={{ fontWeight: 700 }}
                    />
                  </motion.div>
                )}
              </Box>
            </Box>

            {/* Build Info */}
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {isEdge ? 'Version' : 'Build #'}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {isEdge ? build.version : (build.build_number || 'Unknown')}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Last Seen
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {format(new Date(build.created_timestamp * 1000), 'MMM dd, yyyy')}
                </Typography>
              </Box>

              {build.platform && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Platform
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {build.platform}
                  </Typography>
                </Box>
              )}
            </Stack>

            {/* Summary Section */}
            {build.summary && (
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {build.summary}
                  </Typography>
                </Box>
              </Collapse>
            )}

            {build.summary_loading && (
              <Box sx={{ pt: 1, position: 'relative', overflow: 'hidden' }}>
                <Skeleton animation="wave" height={20} />
                <Skeleton animation="wave" height={20} width="80%" />
                <motion.div
                  variants={shimmerVariants}
                  initial="initial"
                  animate="animate"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    pointerEvents: 'none'
                  }}
                />
              </Box>
            )}
          </Stack>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <AnimatePresence>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{ position: 'absolute', bottom: 60, left: 16 }}
                >
                  <Chip label="Copied!" size="small" color="success" />
                </motion.div>
              )}
            </AnimatePresence>
            
            <Tooltip title="Copy link">
              <IconButton size="small" onClick={handleCopyLink}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="View details">
              <IconButton size="small" onClick={() => onViewDetails(build)}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {isEdge && build.artifacts && build.artifacts.length > 0 && (
              <Tooltip title="Download">
                <IconButton size="small" component="a" href={build.artifacts[0].url} target="_blank">
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {!isEdge && (
              <Tooltip title="Open in UUP Dump">
                <IconButton 
                  size="small" 
                  component="a" 
                  href={`https://uupdump.net/selectlang.php?id=${build.uuid}`}
                  target="_blank"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {build.summary && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s'
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          )}
        </CardActions>

        {/* Ripple effect on click */}
        <motion.div
          className="ripple"
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)'
          }}
        />
      </Card>
    </motion.div>
  );
};