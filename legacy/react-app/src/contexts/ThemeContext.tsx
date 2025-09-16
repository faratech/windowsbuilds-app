import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { windowsForumTheme } from '../theme/windowsForumTheme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check for XenForo theme or localStorage preference
    const savedTheme = localStorage.getItem('windowsBuildsTheme');
    const isDarkMode = document.body.classList.contains('style-variation--dark') ||
                       document.documentElement.getAttribute('data-theme') === 'dark';
    return savedTheme as ThemeMode || (isDarkMode ? 'dark' : 'light');
  });

  const toggleTheme = () => {
    setMode(prev => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('windowsBuildsTheme', newMode);
      return newMode;
    });
  };

  // Watch for XenForo theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
          const isDarkMode = document.body.classList.contains('style-variation--dark') ||
                            document.documentElement.getAttribute('data-theme') === 'dark';
          setMode(isDarkMode ? 'dark' : 'light');
        }
      });
    });

    observer.observe(document.body, { attributes: true });
    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const themeColors = windowsForumTheme[mode];
  const common = windowsForumTheme.common;

  const theme = createTheme({
    palette: {
      mode,
      primary: themeColors.primary,
      secondary: themeColors.secondary,
      background: themeColors.background,
      text: themeColors.text,
      divider: themeColors.divider,
      error: {
        main: themeColors.status.error,
        light: alpha(themeColors.status.error, 0.5),
        dark: alpha(themeColors.status.error, 0.9),
      },
      warning: {
        main: themeColors.status.warning,
        light: alpha(themeColors.status.warning, 0.5),
        dark: alpha(themeColors.status.warning, 0.9),
      },
      info: {
        main: themeColors.status.info,
        light: alpha(themeColors.status.info, 0.5),
        dark: alpha(themeColors.status.info, 0.9),
      },
      success: {
        main: themeColors.status.success,
        light: alpha(themeColors.status.success, 0.5),
        dark: alpha(themeColors.status.success, 0.9),
      },
    },
    typography: {
      fontFamily: common.typography.fontFamily,
      h1: {
        fontSize: common.typography.fontSize['3xl'],
        fontWeight: common.typography.fontWeight.bold,
        lineHeight: common.typography.lineHeight.tight,
      },
      h2: {
        fontSize: common.typography.fontSize['2xl'],
        fontWeight: common.typography.fontWeight.semibold,
        lineHeight: common.typography.lineHeight.tight,
      },
      h3: {
        fontSize: common.typography.fontSize.xl,
        fontWeight: common.typography.fontWeight.semibold,
        lineHeight: common.typography.lineHeight.normal,
      },
      h4: {
        fontSize: common.typography.fontSize.lg,
        fontWeight: common.typography.fontWeight.semibold,
        lineHeight: common.typography.lineHeight.normal,
      },
      body1: {
        fontSize: common.typography.fontSize.base,
        lineHeight: common.typography.lineHeight.relaxed,
      },
      body2: {
        fontSize: common.typography.fontSize.sm,
        lineHeight: common.typography.lineHeight.relaxed,
      },
      button: {
        fontSize: common.typography.fontSize.sm,
        fontWeight: common.typography.fontWeight.medium,
        textTransform: 'none',
      },
      caption: {
        fontSize: common.typography.fontSize.xs,
        lineHeight: common.typography.lineHeight.normal,
      },
    },
    shape: {
      borderRadius: 8, // Using md from common
    },
    spacing: 8, // Base spacing unit
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'light' ? '#cbd5e0 #f7fafc' : '#4a5568 #1a202c',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: mode === 'light' ? '#cbd5e0' : '#4a5568',
              border: '2px solid transparent',
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              backgroundColor: mode === 'light' ? '#f7fafc' : '#1a202c',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: themeColors.shadows.md,
            border: `1px solid ${themeColors.border.default}`,
            transition: common.transitions.normal,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: themeColors.shadows.lg,
              borderColor: themeColors.border.focus,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: common.borderRadius.md,
            fontWeight: common.typography.fontWeight.medium,
            transition: common.transitions.fast,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: themeColors.shadows.sm,
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: themeColors.shadows.sm,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: common.borderRadius.full,
            fontWeight: common.typography.fontWeight.semibold,
            fontSize: common.typography.fontSize.xs,
            letterSpacing: '0.025em',
            transition: common.transitions.fast,
            '&:hover': {
              transform: 'scale(1.05)',
            },
          },
          colorError: {
            backgroundColor: themeColors.buildTypes.canary,
            color: mode === 'light' ? '#ffffff' : '#000000',
          },
          colorSuccess: {
            backgroundColor: themeColors.buildTypes.dev,
            color: mode === 'light' ? '#ffffff' : '#000000',
          },
          colorInfo: {
            backgroundColor: themeColors.buildTypes.beta,
            color: mode === 'light' ? '#ffffff' : '#000000',
          },
          colorWarning: {
            backgroundColor: themeColors.buildTypes.insider,
            color: mode === 'light' ? '#ffffff' : '#000000',
          },
          colorDefault: {
            backgroundColor: themeColors.buildTypes.release,
            color: mode === 'light' ? '#ffffff' : '#000000',
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: themeColors.link.default,
            textDecoration: 'none',
            position: 'relative',
            fontWeight: common.typography.fontWeight.medium,
            transition: common.transitions.fast,
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -2,
              left: 0,
              width: 0,
              height: 2,
              backgroundColor: themeColors.link.default,
              transition: common.transitions.normal,
            },
            '&:hover': {
              color: themeColors.link.hover,
              '&::after': {
                width: '100%',
              },
            },
            '&:visited': {
              color: themeColors.link.visited,
            },
            '&:active': {
              color: themeColors.link.active,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: themeColors.navigation.background,
            color: themeColors.navigation.text,
            borderBottom: `1px solid ${themeColors.navigation.border}`,
            boxShadow: themeColors.shadows.sm,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: common.typography.fontWeight.medium,
            fontSize: common.typography.fontSize.sm,
            minHeight: 48,
            transition: common.transitions.fast,
            '&:hover': {
              backgroundColor: themeColors.navigation.hover,
            },
            '&.Mui-selected': {
              fontWeight: common.typography.fontWeight.semibold,
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: common.borderRadius.lg,
            fontSize: common.typography.fontSize.sm,
          },
          standardError: {
            backgroundColor: alpha(themeColors.status.error, 0.1),
            color: themeColors.status.error,
            '& .MuiAlert-icon': {
              color: themeColors.status.error,
            },
          },
          standardWarning: {
            backgroundColor: alpha(themeColors.status.warning, 0.1),
            color: themeColors.status.warning,
            '& .MuiAlert-icon': {
              color: themeColors.status.warning,
            },
          },
          standardInfo: {
            backgroundColor: alpha(themeColors.status.info, 0.1),
            color: themeColors.status.info,
            '& .MuiAlert-icon': {
              color: themeColors.status.info,
            },
          },
          standardSuccess: {
            backgroundColor: alpha(themeColors.status.success, 0.1),
            color: themeColors.status.success,
            '& .MuiAlert-icon': {
              color: themeColors.status.success,
            },
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};