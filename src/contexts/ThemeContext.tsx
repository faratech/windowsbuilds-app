import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, type Theme } from '../styles/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  actualMode: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || 'system';
  });

  const [actualMode, setActualMode] = useState<'light' | 'dark'>(() => {
    // Initialize with XenForo's theme if available
    const htmlElement = document.documentElement;
    const colorScheme = htmlElement.getAttribute('data-color-scheme');
    const variation = htmlElement.getAttribute('data-variation');

    if (colorScheme === 'dark' || variation === 'alternate') {
      return 'dark';
    } else if (colorScheme === 'light' || variation === 'default') {
      return 'light';
    }

    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const updateActualMode = () => {
      if (themeMode === 'system') {
        // First check XenForo's theme attributes
        const htmlElement = document.documentElement;
        const colorScheme = htmlElement.getAttribute('data-color-scheme');
        const variation = htmlElement.getAttribute('data-variation');

        // XenForo detection logic
        if (colorScheme === 'dark' || variation === 'alternate') {
          setActualMode('dark');
        } else if (colorScheme === 'light' || variation === 'default') {
          setActualMode('light');
        } else {
          // Fall back to system preference if XenForo attributes not found
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setActualMode(isDark ? 'dark' : 'light');
        }
      } else {
        setActualMode(themeMode as 'light' | 'dark');
      }
    };

    updateActualMode();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        updateActualMode();
      }
    };

    // Also observe XenForo theme changes
    const mutationObserver = new MutationObserver(() => {
      if (themeMode === 'system') {
        updateActualMode();
      }
    });

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-variation', 'data-color-scheme']
    });

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      mutationObserver.disconnect();
    };
  }, [themeMode]);

  useEffect(() => {
    // Update document class and CSS variables
    const root = document.documentElement;
    const theme = themes[actualMode];

    if (actualMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set CSS variables for the theme
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors.background);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme.colors.background;
      document.head.appendChild(meta);
    }
  }, [actualMode]);

  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('themeMode', mode);
  };

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    handleSetThemeMode(modes[nextIndex]);
  };

  const theme = themes[actualMode];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        actualMode,
        setThemeMode: handleSetThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};