import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'glass' | 'gradient' | 'outline' | 'elevated';
  hover?: boolean;
  pulse?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  hover = false,
  pulse = false,
  glow = false,
  ...props
}) => {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 card-shadow',
    glass: 'glass',
    gradient: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 card-shadow',
    outline: 'bg-transparent border border-gray-300 dark:border-gray-600',
    elevated: 'bg-white dark:bg-gray-800 card-shadow-lg',
  };

  const hoverEffects = hover
    ? 'hover:shadow-[rgba(0,0,0,0.132)_0_6.4px_14.4px_0,rgba(0,0,0,0.11)_0_1.2px_3.6px_0] hover:border-blue-400 dark:hover:border-blue-500'
    : '';

  const pulseEffect = pulse ? 'animate-pulse' : '';

  const glowEffect = glow
    ? 'shadow-[0_0_0_3px_rgba(15,108,189,0.35)]'
    : '';

  return (
    <motion.div
      className={cn(
        'rounded-lg p-6 transition-colors duration-150',
        variants[variant],
        hoverEffects,
        pulseEffect,
        glowEffect,
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.25 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('mb-4 pb-4 border-b border-gray-200 dark:border-gray-700', className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h3 className={cn('text-xl font-semibold text-gray-900 dark:text-white', className)}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <p className={cn('text-sm text-gray-600 dark:text-gray-400 mt-1', className)}>{children}</p>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn('', className)}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-200 dark:border-gray-700', className)}>
    {children}
  </div>
);