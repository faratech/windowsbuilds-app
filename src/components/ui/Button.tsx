import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'gradient' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  ripple?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  ripple = true,
  disabled,
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);

  const variants = {
    primary:
      'bg-blue-500 hover:bg-blue-600 active:bg-blue-900 text-white card-shadow',
    secondary:
      'bg-secondary hover:bg-blue-700 active:bg-blue-900 text-white card-shadow',
    accent:
      'bg-accent hover:bg-blue-700 active:bg-blue-900 text-white card-shadow',
    ghost:
      'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
    outline:
      'bg-transparent border border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300',
    gradient:
      'bg-blue-500 hover:bg-blue-600 active:bg-blue-900 text-white card-shadow',
    glass:
      'glass text-gray-800 dark:text-gray-100 hover:border-blue-500',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !disabled && !loading) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples([...ripples, { x, y, id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }
    onClick?.(e);
  };

  return (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-lg font-semibold transition-colors duration-100',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      whileTap={{ scale: 0.985 }}
      {...props}
    >
      {/* Ripple effect */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '2px',
            height: '2px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Content */}
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
      </span>
    </motion.button>
  );
};

export const ButtonGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('inline-flex rounded-lg shadow-sm', className)} role="group">
    {React.Children.map(children, (child, index) => {
      if (React.isValidElement(child)) {
        const childElement = child as React.ReactElement<{ className?: string }>;
        return React.cloneElement(childElement, {
          className: cn(
            childElement.props.className,
            index === 0 && 'rounded-r-none',
            index === React.Children.count(children) - 1 && 'rounded-l-none',
            index !== 0 && index !== React.Children.count(children) - 1 && 'rounded-none',
            index !== 0 && '-ml-px'
          ),
        });
      }
      return child;
    })}
  </div>
);
