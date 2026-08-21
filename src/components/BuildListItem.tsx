import React from 'react';
import { motion } from 'framer-motion';
import { Badge, BuildTypeBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { isWindowsBuild, isEdgeBuild, isOfficeBuild, type BuildRecord } from '../utils/typeGuards';
import { buildDateValue } from '../utils/buildRecord';
import { formatBuildDate, SHORT_DATE } from '../utils/dates';
import { downloadTarget, openExternal } from '../utils/downloads';

interface BuildListItemProps {
  build: BuildRecord;
  onClick?: () => void;
}

export const BuildListItem: React.FC<BuildListItemProps> = ({ build, onClick }) => {
  const download = downloadTarget(build);

  const getTitle = () => {
    if (isEdgeBuild(build)) return `Edge ${build.Product || ''}`.trim();
    if (isOfficeBuild(build)) return build.title || build.name || 'Office 365';
    return (build.title || 'Unknown Build')
      .replace('Windows 11', 'Win 11')
      .replace('Windows 10', 'Win 10')
      .replace('Windows Server', 'Server')
      .replace('Cumulative Update', 'CU')
      .replace('Feature Update', 'FU');
  };

  const getBuildNumber = () => {
    if (isWindowsBuild(build)) return build.build_number || build.build || '';
    if (isEdgeBuild(build)) return build.Version || '';
    return build.build || build.version || '';
  };

  const title = getTitle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        // Stacks below `md`, where the old fixed `w-48 / w-20 / w-16` columns
        // overflowed the viewport and pushed the action buttons off-screen.
        'group flex flex-col gap-2 p-3 rounded-lg',
        'md:flex-row md:items-center md:gap-2 md:p-2',
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        'hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500',
        'transition-colors duration-200 cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="min-w-0 md:flex-shrink-0 md:w-48 lg:w-56 xl:w-64">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
          {getBuildNumber()}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:contents">
        <div className="md:flex-shrink-0 md:w-20">
          {isWindowsBuild(build) && build.build_type && (
            <BuildTypeBadge type={build.build_type} size="xs" />
          )}
          {isEdgeBuild(build) && build.Product && (
            <Badge variant="info" size="xs">{build.Product}</Badge>
          )}
          {isOfficeBuild(build) && build.channel && (
            <Badge variant="primary" size="xs">{build.channel}</Badge>
          )}
        </div>

        <div className="md:flex-shrink-0 md:w-16 md:text-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {isWindowsBuild(build) && build.arch}
            {isEdgeBuild(build) && build.Platform}
            {isOfficeBuild(build) && build.channel}
          </span>
        </div>

        <div className="md:flex-shrink-0 md:w-20 text-xs text-gray-500 dark:text-gray-300">
          {formatBuildDate(buildDateValue(build), SHORT_DATE)}
        </div>

        <div className="md:flex-shrink-0 md:w-24">
          {isEdgeBuild(build) ? (
            download ? (
              <Badge variant="success" size="xs">
                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Available
              </Badge>
            ) : (
              <Badge variant="warning" size="xs">
                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                None
              </Badge>
            )
          ) : download ? (
            <Badge variant="info" size="xs">Download</Badge>
          ) : null}
        </div>
      </div>

      <div className="hidden md:block md:flex-grow" />

      {/* Always visible on touch; on pointer devices they fade in on hover *or*
          keyboard focus. Hiding them behind `:hover` alone made the row's only
          actions unreachable on mobile and for keyboard users. */}
      <div
        className={cn(
          'flex items-center gap-1 md:flex-shrink-0',
          'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
          'transition-opacity',
        )}
      >
        {download && (
          <Button
            variant="ghost"
            size="xs"
            aria-label={`${download.label}: ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              openExternal(download.url);
            }}
            className="p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          aria-label={`View details for ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
      </div>
    </motion.div>
  );
};
