import React, { createContext, useContext } from 'react';
import { theme, type Theme } from './tokens';

interface ThemeContextValue {
  theme: Theme;
  isDark: true; // Dark-only for MVP
}

const ThemeContext = createContext<ThemeContextValue>({
  theme,
  isDark: true,
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider wraps the app and provides theme tokens via context.
 * Currently dark-only; light theme support can be added later.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const value: ThemeContextValue = {
    theme,
    isDark: true,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme tokens from any component.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
