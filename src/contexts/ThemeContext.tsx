import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyThemeColors } from '../constants';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      // Force dark theme regardless of saved preference
      await AsyncStorage.setItem('app_theme', 'dark');
      setThemeState('dark');
      applyThemeColors('dark');
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (_newTheme: Theme) => {
    // Theme switching disabled intentionally; keep dark theme
    setThemeState('dark');
    applyThemeColors('dark');
  };

  const isDark = theme === 'dark';

  // Ensure COLORS reflects current theme on mount and updates on changes
  React.useEffect(() => {
    applyThemeColors(theme);
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    isDark,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export {};
