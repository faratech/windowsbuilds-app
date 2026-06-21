export const themes = {
  light: {
    colors: {
      // Primary — WindowsForum lead blue
      primary: '#0f6cbd',
      primaryHover: '#0c5aa0',
      primaryLight: '#6fb0e4',
      primaryDark: '#07426f',

      // Secondary — secondary brand blue
      secondary: '#0078d4',
      secondaryHover: '#0063b1',
      secondaryLight: '#9bd3f7',

      // Accent — CTA / selected brand blue
      accent: '#115ea3',
      accentHover: '#0d4d88',
      accentLight: '#a7cdee',

      // Background colors
      background: '#eff5f6',
      backgroundSecondary: '#f8fafb',
      backgroundTertiary: '#ebebeb',
      backgroundElevated: '#ffffff',
      backgroundHover: '#f8fafb',

      // Surface colors
      surface: '#ffffff',
      surfaceHover: '#f8fafb',
      surfaceActive: '#ebebeb',
      surfaceBorder: '#ebebeb',

      // Text colors
      text: '#1a1b1b',
      textSecondary: '#5f6060',
      textTertiary: '#8a8b8b',
      textInverse: '#ffffff',

      // Status colors
      success: '#1f8a5b',
      successBg: '#dcefe3',
      warning: '#e65100',
      warningBg: '#ffe2cc',
      error: '#d9214e',
      errorBg: '#fbd9e2',
      info: '#0f6cbd',
      infoBg: '#d3e6f6',

      // Build type colors (functional data-viz — kept distinguishable)
      canary: '#d9214e',
      dev: '#e65100',
      beta: '#0f6cbd',
      insider: '#5b2e91',
      release: '#1f8a5b',
      stable: '#1f8a5b',

      // Special colors — frosted acrylic over the Windows wallpaper
      glass: 'rgba(255, 255, 255, 0.62)',
      glassLight: 'rgba(255, 255, 255, 0.42)',
      glassDark: 'rgba(255, 255, 255, 0.85)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      shimmer: 'linear-gradient(90deg, #f8fafb 0%, #ebebeb 50%, #f8fafb 100%)',
    },
    shadows: {
      xs: 'rgba(0, 0, 0, 0.11) 0 0.3px 0.9px 0',
      sm: 'rgba(0, 0, 0, 0.132) 0 1.6px 3.6px 0, rgba(0, 0, 0, 0.11) 0 0.3px 0.9px 0',
      md: 'rgba(0, 0, 0, 0.132) 0 1.6px 3.6px 0, rgba(0, 0, 0, 0.11) 0 0.3px 0.9px 0',
      lg: 'rgba(0, 0, 0, 0.132) 0 6.4px 14.4px 0, rgba(0, 0, 0, 0.11) 0 1.2px 3.6px 0',
      xl: 'rgba(0, 0, 0, 0.18) 0 12.8px 28.8px 0, rgba(0, 0, 0, 0.12) 0 2.4px 7.2px 0',
      '2xl': 'rgba(0, 0, 0, 0.22) 0 25.6px 57.6px 0, rgba(0, 0, 0, 0.16) 0 4.8px 14.4px 0',
      inner: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.06)',
      glow: '0 0 0 3px rgba(15, 108, 189, 0.35)',
    },
  },
  dark: {
    colors: {
      // Primary — WindowsForum lead blue (slightly lifted for OLED)
      primary: '#3a8fd8',
      primaryHover: '#5ba6e6',
      primaryLight: '#073e6e',
      primaryDark: '#6fb0e4',

      // Secondary
      secondary: '#0078d4',
      secondaryHover: '#2ea2e6',
      secondaryLight: '#07426f',

      // Accent
      accent: '#4ea3e6',
      accentHover: '#6fb0e4',
      accentLight: '#073e6e',

      // Background colors — true-OLED dark
      background: '#1f2021',
      backgroundSecondary: '#292929',
      backgroundTertiary: '#383a3a',
      backgroundElevated: '#292929',
      backgroundHover: '#383a3a',

      // Surface colors
      surface: '#292929',
      surfaceHover: '#383a3a',
      surfaceActive: '#454747',
      surfaceBorder: '#272729',

      // Text colors
      text: '#ffffff',
      textSecondary: '#cfcfcf',
      textTertiary: '#9a9b9b',
      textInverse: '#1a1b1b',

      // Status colors
      success: '#3fb985',
      successBg: '#0c3a26',
      warning: '#ff8a3d',
      warningBg: '#4a2400',
      error: '#f0567f',
      errorBg: '#4a0f22',
      info: '#3a8fd8',
      infoBg: '#073e6e',

      // Build type colors
      canary: '#f0567f',
      dev: '#ff8a3d',
      beta: '#3a8fd8',
      insider: '#a98fd0',
      release: '#3fb985',
      stable: '#3fb985',

      // Special colors
      glass: 'rgba(41, 41, 41, 0.72)',
      glassLight: 'rgba(41, 41, 41, 0.45)',
      glassDark: 'rgba(41, 41, 41, 0.92)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      shimmer: 'linear-gradient(90deg, #292929 0%, #383a3a 50%, #292929 100%)',
    },
    shadows: {
      xs: 'rgba(0, 0, 0, 0.3) 0 0.3px 0.9px 0',
      sm: 'rgba(0, 0, 0, 0.4) 0 1.6px 3.6px 0, rgba(0, 0, 0, 0.3) 0 0.3px 0.9px 0',
      md: 'rgba(0, 0, 0, 0.4) 0 1.6px 3.6px 0, rgba(0, 0, 0, 0.3) 0 0.3px 0.9px 0',
      lg: 'rgba(0, 0, 0, 0.5) 0 6.4px 14.4px 0, rgba(0, 0, 0, 0.4) 0 1.2px 3.6px 0',
      xl: 'rgba(0, 0, 0, 0.55) 0 12.8px 28.8px 0, rgba(0, 0, 0, 0.45) 0 2.4px 7.2px 0',
      '2xl': 'rgba(0, 0, 0, 0.6) 0 25.6px 57.6px 0, rgba(0, 0, 0, 0.5) 0 4.8px 14.4px 0',
      inner: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.3)',
      glow: '0 0 0 3px rgba(15, 108, 189, 0.45)',
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
  primary: 'linear-gradient(135deg, #0f6cbd 0%, #07426f 100%)',
  secondary: 'linear-gradient(135deg, #0078d4 0%, #0f6cbd 100%)',
  success: 'linear-gradient(135deg, #1f8a5b 0%, #0c6b43 100%)',
  warning: 'linear-gradient(135deg, #e65100 0%, #b03d00 100%)',
  info: 'linear-gradient(135deg, #2f8ad6 0%, #0f6cbd 100%)',
  sunset: 'linear-gradient(135deg, #0094e0 0%, #0f6cbd 100%)',
  ocean: 'linear-gradient(135deg, #0078d4 0%, #07426f 100%)',
  forest: 'linear-gradient(135deg, #1f8a5b 0%, #115e3f 100%)',
  fire: 'linear-gradient(135deg, #d9214e 0%, #07426f 100%)',
  aurora: 'linear-gradient(135deg, #0094e0 0%, #115ea3 100%)',
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
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Segoe UI Variable", Roboto, "Helvetica Neue", Arial, "Inter", sans-serif',
    mono: 'Consolas, "Lucida Console", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
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