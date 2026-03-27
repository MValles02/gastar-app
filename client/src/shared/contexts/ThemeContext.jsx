import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { childrenPropType } from '../utils/propTypes.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (theme === 'dark') {
      root.classList.add('dark');
      metaThemeColor?.setAttribute('content', '#030712');
    } else {
      root.classList.remove('dark');
      metaThemeColor?.setAttribute('content', '#059669');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

ThemeProvider.propTypes = {
  children: childrenPropType,
};
