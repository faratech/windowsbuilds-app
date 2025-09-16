/**
 * WindowsForum Theme Configuration
 * Matches the official WindowsForum.com v3 theme with proper contrast
 */

export const windowsForumTheme = {
  light: {
    // Primary colors - WindowsForum blue scheme
    primary: {
      main: '#1976d2',      // Main blue (good contrast)
      light: '#42a5f5',     // Lighter blue for hover
      dark: '#1565c0',      // Darker blue for active
      contrastText: '#ffffff',
    },
    
    // Secondary colors - Complementary green
    secondary: {
      main: '#4caf50',      // Success green
      light: '#81c784',     
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    
    // Background colors
    background: {
      default: '#f5f7fa',   // Light gray-blue background
      paper: '#ffffff',     // White for cards/containers
      elevated: '#ffffff',  // Elevated surfaces
      hover: '#f0f4f8',    // Hover state background
    },
    
    // Text colors with proper contrast ratios
    text: {
      primary: '#1a202c',   // Almost black (WCAG AAA)
      secondary: '#4a5568', // Dark gray (WCAG AA)
      disabled: '#718096',  // Medium gray
      hint: '#a0aec0',      // Light gray
    },
    
    // Navigation and menu colors
    navigation: {
      background: '#ffffff',
      text: '#2d3748',
      hover: '#edf2f7',
      active: '#e2e8f0',
      border: '#e2e8f0',
    },
    
    // Link colors
    link: {
      default: '#1976d2',   // Matches primary
      hover: '#1565c0',     // Darker on hover
      visited: '#7c3aed',   // Purple for visited
      active: '#0d47a1',    // Dark blue when active
    },
    
    // Border and divider colors
    divider: '#e2e8f0',
    border: {
      default: '#cbd5e0',
      light: '#e2e8f0',
      focus: '#1976d2',
    },
    
    // Status colors
    status: {
      success: '#48bb78',
      warning: '#ed8936',
      error: '#f56565',
      info: '#4299e1',
    },
    
    // Build type colors (Windows specific)
    buildTypes: {
      canary: '#f56565',    // Red
      dev: '#48bb78',       // Green
      beta: '#4299e1',      // Blue
      insider: '#ed8936',   // Orange
      release: '#718096',   // Gray
      stable: '#38a169',    // Dark green
    },
    
    // Shadows
    shadows: {
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
  },
  
  dark: {
    // Primary colors - Adjusted for dark mode
    primary: {
      main: '#42a5f5',      // Lighter blue for dark mode
      light: '#64b5f6',     
      dark: '#2196f3',
      contrastText: '#000000',
    },
    
    // Secondary colors
    secondary: {
      main: '#66bb6a',      // Lighter green for dark mode
      light: '#81c784',
      dark: '#4caf50',
      contrastText: '#000000',
    },
    
    // Background colors - True dark theme
    background: {
      default: '#0f1419',   // Very dark blue-black
      paper: '#1a202c',     // Dark blue-gray for cards
      elevated: '#2d3748',  // Elevated surfaces
      hover: '#2a3441',     // Hover state
    },
    
    // Text colors with proper contrast for dark mode
    text: {
      primary: '#f7fafc',   // Almost white (WCAG AAA on dark)
      secondary: '#cbd5e0', // Light gray (WCAG AA)
      disabled: '#718096',  // Medium gray
      hint: '#4a5568',      // Dark gray
    },
    
    // Navigation and menu colors
    navigation: {
      background: '#1a202c',
      text: '#e2e8f0',
      hover: '#2d3748',
      active: '#374151',
      border: '#2d3748',
    },
    
    // Link colors
    link: {
      default: '#64b5f6',   // Light blue for dark mode
      hover: '#90caf9',     // Even lighter on hover
      visited: '#b794f4',   // Light purple
      active: '#bbdefb',    // Very light blue
    },
    
    // Border and divider colors
    divider: '#2d3748',
    border: {
      default: '#374151',
      light: '#2d3748',
      focus: '#42a5f5',
    },
    
    // Status colors (adjusted for dark mode)
    status: {
      success: '#68d391',
      warning: '#f6ad55',
      error: '#fc8181',
      info: '#63b3ed',
    },
    
    // Build type colors (brighter for dark mode)
    buildTypes: {
      canary: '#fc8181',    // Light red
      dev: '#68d391',       // Light green
      beta: '#63b3ed',      // Light blue
      insider: '#f6ad55',   // Light orange
      release: '#a0aec0',   // Light gray
      stable: '#48bb78',    // Medium green
    },
    
    // Shadows (more subtle in dark mode)
    shadows: {
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.24)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.24)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.24)',
    },
  },
  
  // Common settings
  common: {
    borderRadius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },
    
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
    },
    
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    
    transitions: {
      fast: '150ms ease',
      normal: '250ms ease',
      slow: '350ms ease',
    },
    
    zIndex: {
      dropdown: 1000,
      sticky: 1020,
      fixed: 1030,
      modalBackdrop: 1040,
      modal: 1050,
      popover: 1060,
      tooltip: 1070,
    },
  },
};

// Helper function to get contrast ratio
export function getContrastRatio(foreground: string, background: string): number {
  // Implementation would calculate WCAG contrast ratio
  // This is a placeholder - actual implementation would use color manipulation library
  return 0;
}

// Helper function to ensure minimum contrast
export function ensureContrast(foreground: string, background: string, minRatio: number = 4.5): string {
  // Would adjust foreground color to meet minimum contrast ratio
  // This is a placeholder - actual implementation would use color manipulation library
  return foreground;
}