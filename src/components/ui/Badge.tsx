import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface BadgeProps extends HTMLMotionProps<'span'> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    secondary: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
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
  type: 'canary' | 'dev' | 'beta' | 'insider' | 'release' | 'stable';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const BuildTypeBadge: React.FC<BuildTypeBadgeProps> = ({
  type,
  size = 'sm',
  animated = true,
}) => {
  const typeConfig = {
    canary: { variant: 'warning' as const, label: 'Canary', icon: '🐤' },
    dev: { variant: 'secondary' as const, label: 'Dev', icon: '⚡' },
    beta: { variant: 'primary' as const, label: 'Beta', icon: '🧪' },
    insider: { variant: 'success' as const, label: 'Insider', icon: '🔓' },
    release: { variant: 'info' as const, label: 'Release', icon: '📦' },
    stable: { variant: 'success' as const, label: 'Stable', icon: '✅' },
  };

  const config = typeConfig[type];

  return (
    <Badge variant={config.variant} size={size} animated={animated} gradient>
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

interface ChannelBadgeProps {
  channel: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const ChannelBadge: React.FC<ChannelBadgeProps> = ({ channel, size = 'sm' }) => {
  const getVariant = () => {
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes('stable')) return 'success';
    if (lowerChannel.includes('beta')) return 'primary';
    if (lowerChannel.includes('dev')) return 'secondary';
    if (lowerChannel.includes('canary')) return 'warning';
    return 'default';
  };

  return (
    <Badge variant={getVariant() as any} size={size}>
      {channel}
    </Badge>
  );
};