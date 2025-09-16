export const themes = {
  light: {
    colors: {
      // Primary colors
      primary: '#3b82f6', // Blue 500
      primaryHover: '#2563eb', // Blue 600
      primaryLight: '#93c5fd', // Blue 300
      primaryDark: '#1e40af', // Blue 800

      // Secondary colors
      secondary: '#8b5cf6', // Violet 500
      secondaryHover: '#7c3aed', // Violet 600
      secondaryLight: '#c4b5fd', // Violet 300

      // Accent colors
      accent: '#06b6d4', // Cyan 500
      accentHover: '#0891b2', // Cyan 600
      accentLight: '#67e8f9', // Cyan 300

      // Background colors
      background: '#ffffff',
      backgroundSecondary: '#f9fafb', // Gray 50
      backgroundTertiary: '#f3f4f6', // Gray 100
      backgroundElevated: '#ffffff',
      backgroundHover: '#f9fafb',

      // Surface colors
      surface: '#ffffff',
      surfaceHover: '#f9fafb',
      surfaceActive: '#f3f4f6',
      surfaceBorder: '#e5e7eb', // Gray 300

      // Text colors
      text: '#111827', // Gray 900
      textSecondary: '#6b7280', // Gray 500
      textTertiary: '#9ca3af', // Gray 400
      textInverse: '#ffffff',

      // Status colors
      success: '#10b981', // Emerald 500
      successBg: '#d1fae5', // Emerald 100
      warning: '#f59e0b', // Amber 500
      warningBg: '#fed7aa', // Amber 200
      error: '#ef4444', // Red 500
      errorBg: '#fee2e2', // Red 100
      info: '#3b82f6', // Blue 500
      infoBg: '#dbeafe', // Blue 100

      // Build type colors
      canary: '#f59e0b', // Amber
      dev: '#8b5cf6', // Violet
      beta: '#3b82f6', // Blue
      insider: '#10b981', // Emerald
      release: '#06b6d4', // Cyan
      stable: '#059669', // Emerald 600

      // Special colors
      glass: 'rgba(255, 255, 255, 0.8)',
      glassLight: 'rgba(255, 255, 255, 0.4)',
      glassDark: 'rgba(255, 255, 255, 0.95)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      shimmer: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)',
    },
    shadows: {
      xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      glow: '0 0 20px rgba(59, 130, 246, 0.5)',
    },
  },
  dark: {
    colors: {
      // Primary colors
      primary: '#60a5fa', // Blue 400
      primaryHover: '#93c5fd', // Blue 300
      primaryLight: '#2563eb', // Blue 600
      primaryDark: '#93c5fd', // Blue 300

      // Secondary colors
      secondary: '#a78bfa', // Violet 400
      secondaryHover: '#c4b5fd', // Violet 300
      secondaryLight: '#7c3aed', // Violet 600

      // Accent colors
      accent: '#22d3ee', // Cyan 400
      accentHover: '#67e8f9', // Cyan 300
      accentLight: '#0891b2', // Cyan 600

      // Background colors
      background: '#0f172a', // Slate 900
      backgroundSecondary: '#1e293b', // Slate 800
      backgroundTertiary: '#334155', // Slate 700
      backgroundElevated: '#1e293b',
      backgroundHover: '#334155',

      // Surface colors
      surface: '#1e293b',
      surfaceHover: '#334155',
      surfaceActive: '#475569',
      surfaceBorder: '#475569', // Slate 600

      // Text colors
      text: '#f1f5f9', // Slate 100
      textSecondary: '#cbd5e1', // Slate 300
      textTertiary: '#94a3b8', // Slate 400
      textInverse: '#0f172a',

      // Status colors
      success: '#34d399', // Emerald 400
      successBg: '#064e3b', // Emerald 900
      warning: '#fbbf24', // Amber 400
      warningBg: '#78350f', // Amber 900
      error: '#f87171', // Red 400
      errorBg: '#7f1d1d', // Red 900
      info: '#60a5fa', // Blue 400
      infoBg: '#1e3a8a', // Blue 900

      // Build type colors
      canary: '#fbbf24', // Amber 400
      dev: '#a78bfa', // Violet 400
      beta: '#60a5fa', // Blue 400
      insider: '#34d399', // Emerald 400
      release: '#22d3ee', // Cyan 400
      stable: '#10b981', // Emerald 500

      // Special colors
      glass: 'rgba(30, 41, 59, 0.8)',
      glassLight: 'rgba(30, 41, 59, 0.4)',
      glassDark: 'rgba(30, 41, 59, 0.95)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      shimmer: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
    },
    shadows: {
      xs: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
      sm: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.2)',
      glow: '0 0 20px rgba(96, 165, 250, 0.3)',
    },
  },
};

export type Theme = typeof themes.light;

export const animations = {
  fadeIn: 'fadeIn 0.3s ease-in-out',
  slideIn: 'slideIn 0.3s ease-out',
  slideUp: 'slideUp 0.3s ease-out',
  scaleIn: 'scaleIn 0.2s ease-out',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  shimmer: 'shimmer 2s linear infinite',
  float: 'float 3s ease-in-out infinite',
  bounce: 'bounce 1s infinite',
  spin: 'spin 1s linear infinite',
};

export const transitions = {
  fast: 'all 0.15s ease',
  base: 'all 0.2s ease',
  slow: 'all 0.3s ease',
  smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

export const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  success: 'linear-gradient(135deg, #13e2da 0%, #30e795 100%)',
  warning: 'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ocean: 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)',
  forest: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  fire: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
  aurora: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)',
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  base: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  full: '9999px',
};

export const typography = {
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeights: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};