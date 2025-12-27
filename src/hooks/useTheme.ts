import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'maktaba-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    let effectiveTheme: 'light' | 'dark';

    if (newTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveTheme = newTheme;
    }

    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    setResolvedTheme(effectiveTheme);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, applyTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
}
