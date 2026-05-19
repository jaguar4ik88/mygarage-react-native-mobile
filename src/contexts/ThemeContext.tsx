import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyAppTheme, type AppColorScheme } from '../constants';

interface ThemeContextType {
  /** Precision (основная, тёмная) или светлая схема */
  colorScheme: AppColorScheme;
  /** Для useMemo стилей при смене COLORS/RADIUS */
  appearanceKey: string;
  /** true только для Precision */
  isDark: boolean;
  setColorScheme: (scheme: AppColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_COLOR_SCHEME = 'app_color_scheme';
const STORAGE_THEME_LEGACY = 'app_theme';
const STORAGE_DESIGN_LEGACY = 'app_design_variant';

interface ThemeProviderProps {
  children: ReactNode;
}

function resolveSchemeFromStorage(
  savedScheme: string | null,
  legacyDesign: string | null,
  legacyTheme: string | null
): AppColorScheme {
  if (savedScheme === 'light' || savedScheme === 'precision') {
    return savedScheme;
  }
  if (legacyDesign === 'classic' && legacyTheme === 'light') {
    return 'light';
  }
  return 'precision';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [colorScheme, setColorSchemeState] = useState<AppColorScheme>('precision');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [savedScheme, legacyDesign, legacyTheme] = await Promise.all([
          AsyncStorage.getItem(STORAGE_COLOR_SCHEME),
          AsyncStorage.getItem(STORAGE_DESIGN_LEGACY),
          AsyncStorage.getItem(STORAGE_THEME_LEGACY),
        ]);

        const scheme = resolveSchemeFromStorage(savedScheme, legacyDesign, legacyTheme);

        if (cancelled) return;

        setColorSchemeState(scheme);
        applyAppTheme(scheme);

        if (savedScheme !== scheme) {
          await AsyncStorage.setItem(STORAGE_COLOR_SCHEME, scheme);
        }
        await AsyncStorage.multiRemove([STORAGE_DESIGN_LEGACY, STORAGE_THEME_LEGACY]);
      } catch (error) {
        console.error('Error loading theme:', error);
        applyAppTheme('precision');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyAppTheme(colorScheme);
  }, [hydrated, colorScheme]);

  const setColorScheme = async (scheme: AppColorScheme) => {
    setColorSchemeState(scheme);
    try {
      await AsyncStorage.setItem(STORAGE_COLOR_SCHEME, scheme);
    } catch (e) {
      console.error('Error saving color scheme:', e);
    }
  };

  const isDark = colorScheme === 'precision';

  const value: ThemeContextType = {
    colorScheme,
    appearanceKey: colorScheme,
    isDark,
    setColorScheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
