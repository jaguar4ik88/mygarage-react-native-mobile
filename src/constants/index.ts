// Default colors (will be overridden by theme context)
export const COLORS = {
  background: '#1b1b1f',
  surface: '#202128',
  card: '#202128',
  text: '#FFFFFF',
  textSecondary: '#9898a0',
  textMuted: '#686464',
  accent: '#f87272',
  primary: '#db4444',
  secondary: '#9898a0',
  success: '#8bfa8b',
  warning: '#b83939',
  error: '#b83939',
  info: '#6ed6f8',
  border: '#37373e',
  shadow: '#000000',
};

export const ACTION_COLORS = {
  colorManual: '#6ed6f8',
  colorAdvice: '#6ed6f8',
  colorReminders: '#8bfa8b',
  colorHistory: '#facc15',
  colorSTO: '#06b6d4',
  colorAllReminders: '#f97316',
  colorDelete: '#ef4444',
  colorDocumentions: '#73dce7',
  colorDownload: '#facc15',
};

export const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
  light: 'Inter-Light',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// For development, use mock data instead of real API
import { Platform } from 'react-native';

// Resolve API base URL with environment override and sensible platform defaults
const envApiBase = process.env.EXPO_PUBLIC_API_BASE_URL;

const resolvedApiBase = envApiBase && envApiBase.trim().length > 0
  ? envApiBase.trim()
  : 'https://mygarage.uno/api';

export const API_BASE_URL = resolvedApiBase as string;
// Do NOT hardcode API keys. Expect it from env; log a warning if missing.
export const API_KEY = (process.env.EXPO_PUBLIC_API_KEY || '').trim();

// API configuration loaded

// Backend switching for development
export const BACKEND_URLS = {
  production: 'https://mygarage.uno/api',
  local: 'http://192.168.7.3:8000/api',
} as const;

export const getBackendUrl = (env: keyof typeof BACKEND_URLS = 'production') => {
  return BACKEND_URLS[env];
};
export const USE_MOCK_DATA = false; // Set to false when backend is ready

// Theme palettes that can be applied globally without changing `COLORS` usages
export const LIGHT_COLORS = {
  background: '#FFFFFF',    // общий фон
  surface:    '#F9F9F9',    // слегка выделенная поверхность
  card:       '#F5F5F7',    // карточки
  text:       '#1B1B1F',    // основной текст (тёмный)
  textSecondary: '#4A4A4F', // вторичный текст
  textMuted:  '#7C7C85',    // подсказки/мутный

  accent:     '#256799',    // акцент (основной выбранный цвет)
  primary:    '#1E5078',    // более тёмный оттенок акцента
  secondary:  '#5C8BAA',    // светлый/разбавленный вариант акцента

  success:    '#2E7D32',    // зелёный (успех)
  warning:    '#F57C00',    // оранжевый (предупреждение)
  error:      '#D32F2F',    // красный (ошибка)
  info:       '#0288D1',    // синий (инфо)

  border:     '#E0E0E0',    // светлый серый бордер
  shadow:     '#00000020',  // мягкая тень (20% чёрного)
} as const;

export const DARK_COLORS = {
  background: '#1b1b1f',
  surface: '#202128',
  card: '#202128',
  text: '#FFFFFF',
  textSecondary: '#9898a0',
  textMuted: '#686464',
  accent: '#f87272',
  primary: '#b83939',
  secondary: '#9898a0',
  success: '#8bfa8b',
  warning: '#b83939',
  error: '#b83939',
  info: '#6ed6f8',
  border: '#37373e',
  shadow: '#000000',
} as const;

export type ThemeMode = 'light' | 'dark';

// Mutate global COLORS so existing usages pick up the new palette
export function applyThemeColors(mode: ThemeMode): void {
  const palette = mode === 'light' ? LIGHT_COLORS : DARK_COLORS;
  Object.assign(COLORS, palette);
}

// Reminder types and manual sections are now fetched from API
// See services/api.ts for API calls
