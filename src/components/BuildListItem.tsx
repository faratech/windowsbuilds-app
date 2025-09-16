import React from 'react';
import { motion } from 'framer-motion';
import { Badge, BuildTypeBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

interface BuildListItemProps {
  build: any;
  type: 'windows' | 'edge' | 'office';
  onClick?: () => void;
  index?: number;
}

export const BuildListItem: React.FC<BuildListItemProps> = ({ build, type, onClick, index = 0 }) => {
  const formatDate = (date: string | number) => {
    if (!date) return 'Unknown';
    const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTitle = () => {
    if (type === 'edge') {
      return `Edge ${build.Product || ''}`;
    }
    if (type === 'office') {
      return build.title || build.name || 'Office 365';
    }
    const title = build.title || build.Product || 'Unknown Build';
    // Shorten Windows titles
    return title
      .replace('Windows 11', 'Win 11')
      .replace('Windows 10', 'Win 10')
      .replace('Windows Server', 'Server')
      .replace('Cumulative Update', 'CU')
      .replace('Feature Update', 'FU');
  };

  const getBuildNumber = () => {
    return build.build_number || build.Version || build.version || '';
  };

  const hasDownload = () => {
    if (type === 'windows' && build.uuid) return true;
    if (type === 'edge' && build.Artifacts && build.Artifacts.length > 0) return true;
    if (type === 'office') return true;
    return false;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className={cn(
        'group flex items-center gap-2 p-2 rounded-lg',
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        'hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500',
        'transition-all duration-200 cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Title - Fixed width */}
      <div className="flex-shrink-0 w-48 lg:w-56 xl:w-64">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {getTitle()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
          {getBuildNumber()}
        </p>
      </div>

      {/* Build Type/Channel Badge */}
      <div className="flex-shrink-0 w-20">
        {type === 'windows' && build.build_type && (
          <BuildTypeBadge type={build.build_type} size="xs" />
        )}
        {type === 'edge' && build.Product && (
          <Badge variant="info" size="xs">
            {build.Product}
          </Badge>
        )}
        {type === 'office' && build.channel && (
          <Badge variant="primary" size="xs">
            {build.channel}
          </Badge>
        )}
      </div>

      {/* Platform/Architecture */}
      <div className="flex-shrink-0 w-16 text-center">
        {type === 'windows' && build.arch && (
          <span className="text-xs text-gray-600 dark:text-gray-400">{build.arch}</span>
        )}
        {type === 'edge' && build.Platform && (
          <span className="text-xs text-gray-600 dark:text-gray-400">{build.Platform}</span>
        )}
      </div>

      {/* Date */}
      <div className="flex-shrink-0 w-20 text-xs text-gray-500 dark:text-gray-500">
        {formatDate(
          build.created ||
          build.created_timestamp ||
          build.PublishedTime ||
          build.releaseDate
        )}
      </div>

      {/* Download Status */}
      <div className="flex-shrink-0 w-24">
        {type === 'edge' ? (
          build.Artifacts && build.Artifacts.length > 0 ? (
            <Badge variant="success" size="xs">
              <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Available
            </Badge>
          ) : (
            <Badge variant="warning" size="xs">
              <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              None
            </Badge>
          )
        ) : hasDownload() ? (
          <Badge variant="info" size="xs">Download</Badge>
        ) : null}
      </div>

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {hasDownload() && (
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              let url = null;
              if (type === 'windows' && build.uuid) {
                url = `https://uupdump.net/selectlang.php?id=${build.uuid}`;
              } else if (type === 'edge' && build.Artifacts && build.Artifacts.length > 0) {
                url = build.Artifacts[0].Location;
              } else if (type === 'office') {
                url = 'https://www.microsoft.com/en-us/download/office.aspx';
              }
              if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }}
            className="p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className="p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
      </div>
    </motion.div>
  );
};