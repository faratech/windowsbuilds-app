import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  count = 1,
}) => {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const getHeight = () => {
    if (height) return height;
    switch (variant) {
      case 'text':
        return '1rem';
      case 'circular':
        return width || '40px';
      default:
        return '120px';
    }
  };

  const getWidth = () => {
    if (width) return width;
    switch (variant) {
      case 'circular':
        return '40px';
      case 'text':
        return '100%';
      default:
        return '100%';
    }
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variants[variant],
        animations[animation],
        animation === 'wave' && 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
        className
      )}
      style={{
        width: getWidth(),
        height: getHeight(),
      }}
    />
  ));

  return <>{skeletons}</>;
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 rounded-xl bg-white dark:bg-gray-800 shadow-md', className)}>
    <div className="flex items-start gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1">
        <Skeleton width="60%" className="mb-2" />
        <Skeleton width="40%" height="0.875rem" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton />
      <Skeleton />
      <Skeleton width="80%" />
    </div>
    <div className="mt-4 flex gap-2">
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="rounded" width={80} height={32} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className,
}) => (
  <div className={cn('overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700', className)}>
    <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-4">
        <Skeleton width="20%" height="1rem" />
        <Skeleton width="30%" height="1rem" />
        <Skeleton width="25%" height="1rem" />
        <Skeleton width="15%" height="1rem" />
      </div>
    </div>
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
      >
        <div className="flex gap-4">
          <Skeleton width="20%" height="1rem" />
          <Skeleton width="30%" height="1rem" />
          <Skeleton width="25%" height="1rem" />
          <Skeleton width="15%" height="1rem" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonBuildItem: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    className={cn(
      'p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      className
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <Skeleton width="70%" height="1.25rem" className="mb-2" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={60} height={20} />
          <Skeleton variant="rounded" width={80} height={20} />
          <Skeleton variant="rounded" width={70} height={20} />
        </div>
      </div>
      <Skeleton variant="circular" width={36} height={36} />
    </div>
    <Skeleton count={2} className="mb-1" />
    <Skeleton width="80%" />
  </motion.div>
);