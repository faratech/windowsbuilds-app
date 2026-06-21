import React, { createContext, useState, useEffect } from 'react';
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

interface ThemeProviderProps {
  children: React.ReactNode;
}

const normalizeThemeMode = (value: string | null | undefined): 'light' | 'dark' | null => {
  if (value === 'light' || value === 'dark') {
    return value;
  }

  return null;
};

const readXfStyleVariationCookie = (): 'light' | 'dark' | null => {
  const html = document.documentElement;
  const cookiePrefix = html.getAttribute('data-cookie-prefix') || 'xf_';
  const cookieNames = [`${cookiePrefix}style_variation`, 'style_variation'];

  for (const cookieName of cookieNames) {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`));

    if (!match) {
      continue;
    }

    const variation = decodeURIComponent(match[1]);
    if (variation === 'alternate') return 'dark';
    if (variation === 'default') return 'light';
  }

  return null;
};

const resolveActualMode = (): 'light' | 'dark' => {
  const html = document.documentElement;

  const colorScheme = normalizeThemeMode(html.getAttribute('data-color-scheme')?.toLowerCase());
  if (colorScheme) return colorScheme;

  const variation = html.getAttribute('data-variation')?.toLowerCase();
  if (variation === 'alternate') return 'dark';
  if (variation === 'default') return 'light';

  const variationCookie = readXfStyleVariationCookie();
  if (variationCookie) return variationCookie;

  if (html.classList.contains('litemode')) return 'light';
  if (html.classList.contains('light')) return 'light';
  if (html.classList.contains('dark')) return 'dark';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const [actualMode, setActualMode] = useState<'light' | 'dark'>(() => {
    return resolveActualMode();
  });

  useEffect(() => {
    const updateActualMode = () => {
      if (themeMode === 'system') {
        setActualMode(resolveActualMode());
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
      attributeFilter: ['data-variation', 'data-color-scheme', 'class']
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

    root.setAttribute('data-wf-theme', actualMode);
    root.style.colorScheme = actualMode;

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
