import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';
import { channelMeta } from '../../config/releaseChannels';
import type { ReleaseChannel } from '../../types';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLMotionProps<'span'> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  animated?: boolean;
  pulse?: boolean;
  gradient?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  animated = false,
  pulse = false,
  gradient = false,
  icon,
  ...props
}: BadgeProps) => {
  const baseVariants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    secondary: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  };

  const gradientVariants = {
    default: 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800',
    primary: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
    secondary: 'bg-gradient-to-r from-violet-400 to-violet-600 text-white',
    success: 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-white',
    warning: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white',
    error: 'bg-gradient-to-r from-red-400 to-red-600 text-white',
    info: 'bg-gradient-to-r from-cyan-400 to-cyan-600 text-white',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-sm',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const variants = gradient ? gradientVariants : baseVariants;

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        variants[variant],
        sizes[size],
        pulse && 'animate-pulse',
        className
      )}
      initial={animated ? { scale: 0, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children as React.ReactNode}
    </motion.span>
  );
};

export const BadgeGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn('flex flex-wrap gap-2', className)}>{children}</div>;

interface BuildTypeBadgeProps {
  type: ReleaseChannel | string;
  size?: BadgeSize;
  animated?: boolean;
}

// Channel badge driven entirely by the shared releaseChannels config, so adding
// a new channel (Experimental, Release Preview, ...) needs no edit here.
export const BuildTypeBadge: React.FC<BuildTypeBadgeProps> = ({
  type,
  size = 'sm',
  animated = true,
}) => {
  const meta = channelMeta(type);

  return (
    <Badge variant="default" size={size} animated={animated} className={meta.badgeClass} aria-label={meta.aria}>
      <span className="text-xs" aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </Badge>
  );
};

interface ChannelBadgeProps {
  channel: string;
  size?: BadgeSize;
}

// Edge Product names map onto release channels for colour; the original label is
// preserved (e.g. "Extended Stable"). Unknown strings render neutral grey.
const EDGE_CHANNEL_TO_RELEASE: Record<string, ReleaseChannel> = {
  stable: 'release',
  'extended stable': 'release',
  beta: 'beta',
  dev: 'dev',
  canary: 'canary',
};

export const ChannelBadge: React.FC<ChannelBadgeProps> = ({ channel, size = 'sm' }) => {
  const key = channel.toLowerCase();
  const meta = channelMeta(EDGE_CHANNEL_TO_RELEASE[key] ?? key);

  return (
    <Badge variant="default" size={size} className={meta.badgeClass} aria-label={`${channel} channel`}>
      {channel}
    </Badge>
  );
};
