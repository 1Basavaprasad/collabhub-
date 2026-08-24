import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'collabhub_theme';

export const ThemeProvider = ({ children }) => {
  // Read initial theme preference from localStorage, default to 'system'
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // localStorage may be unavailable in restricted environments
    }
    return 'system';
  });

  // Calculate if dark mode should be applied based on theme state and OS preferences
  const getSystemIsDark = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    return getSystemIsDark() ? 'dark' : 'light';
  });

  // Apply class to <html> and update resolvedTheme
  const applyTheme = useCallback((targetTheme) => {
    const isDark =
      targetTheme === 'dark' ||
      (targetTheme === 'system' && getSystemIsDark());

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    setResolvedTheme(isDark ? 'dark' : 'light');
  }, []);

  // Update theme setting
  const setTheme = useCallback(
    (newTheme) => {
      if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'system') {
        newTheme = 'system';
      }
      setThemeState(newTheme);
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {
        // Ignore storage errors
      }
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // Initial and subsequent theme application + system preference listener
  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyTheme('system');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        isDark: resolvedTheme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
