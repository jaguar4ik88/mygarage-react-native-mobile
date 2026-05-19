// Default colors (will be overridden by theme context)
export const COLORS = {
  background: '#1b1b1f',
  surface: '#202128',
  card: '#202128',
  text: '#FFFFFF',
  textSecondary: '#9898a0',
  textMuted: '#686464',
  textDark: '#FFFFFF',
  textMutedDark: '#686464',
  accent: '#f87272',
  primary: '#B23A48',
  secondary: '#9898a0',
  success: '#8bfa8b',
  warning: '#b83939',
  error: '#b83939',
  info: '#6ed6f8',
  border: '#37373e',
  shadow: '#000000',
};

/** Акценты действий для светлой темы */
export const LIGHT_ACTION_COLORS = {
  colorManual: '#6ed6f8',
  colorAdvice: '#6ed6f8',
  colorReminders: '#8bfa8b',
  colorHistory: '#facc15',
  colorSTO: '#06b6d4',
  colorAllReminders: '#f97316',
  colorDelete: '#ef4444',
  colorDocumentions: '#73dce7',
  colorDownload: '#facc15',
} as const;

export const FONTS = {
  /** Имена после загрузки через @expo-google-fonts/inter в App.tsx */
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  light: 'Inter_400Regular',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/** Скругления UI (меняются вместе с темой — см. applyAppTheme) */
export type RadiusScale = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  card: number;
  button: number;
  input: number;
  pill: number;
  sheet: number;
  tabBarTop: number;
};

export const RADIUS: RadiusScale = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  card: 12,
  button: 8,
  input: 10,
  pill: 12,
  sheet: 24,
  tabBarTop: 0,
};

const LIGHT_RADIUS: RadiusScale = { ...RADIUS };

const PRECISION_RADIUS: RadiusScale = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 18,
  xl: 22,
  card: 16,
  button: 16,
  input: 14,
  pill: 14,
  sheet: 20,
  tabBarTop: 0,
};

/** HEX (#RGB / #RRGGBB) → rgba для полупрозрачных подложек */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length < 6) {
    return `rgba(0,0,0,${alpha})`;
  }
  const num = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(num)) {
    return `rgba(0,0,0,${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Палитра категорий для диаграмм (светлая тема) */
export const CHART_COLOR_POOL_LIGHT = [
  '#FFD400',
  '#FF6F00',
  '#FFC107',
  '#60a5fa',
  '#ef4444',
  '#22c55e',
  '#a78bfa',
  '#f59e0b',
  '#10b981',
  '#f472b6',
  '#fb7185',
  '#94a3b8',
  '#34d399',
  '#9ca3af',
  '#f97316',
  '#84cc16',
  '#e11d48',
  '#7c3aed',
  '#0ea5e9',
  '#06b6d4',
] as const;

export const CHART_COLOR_POOL_PRECISION = [
  '#dafb2f',
  '#5fd89a',
  '#6eb8f0',
  '#e8c84a',
  '#e86552',
  '#60d9df',
  '#e8a84a',
  '#a78bfa',
  '#34d399',
  '#f472b6',
  '#94a3b8',
  '#f97316',
  '#84cc16',
  '#0ea5e9',
  '#7c3aed',
  '#22c55e',
  '#ef4444',
  '#FFD400',
  '#FF6F00',
  '#06b6d4',
] as const;

// For development, use mock data instead of real API
import { Platform } from 'react-native';

// Resolve API base URL with environment override and sensible platform defaults
const envApiBase = process.env.EXPO_PUBLIC_API_BASE_URL;

const resolvedApiBase = envApiBase && envApiBase.trim().length > 0
  ? envApiBase.trim()
  : 'https://mygarage.uno/api';

export const API_BASE_URL = resolvedApiBase as string;

// Base URL without /api suffix (for storage, privacy policy, terms of service, etc.)
export const BASE_URL = API_BASE_URL.replace('/api', '') || 'https://mygarage.uno';

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
  /** Холст экрана — чуть темнее белого хедера (nav / stack header = `card`). */
  background: '#E6EAF0',
  /** Карточки и блоки над холстом */
  surface: '#F9FAFB',
  /** Хедер native-stack и зона «выше» контента — чистый белый */
  card: '#FFFFFF',
  text:       '#1B1B1F',    // основной текст (тёмный)
  textSecondary: '#4A4A4F', // вторичный текст
  textMuted:  '#7C7C85',    // подсказки/мутный
  textDark: '#1B1B1F',
  textMutedDark: '#6b6b73',

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

/**
 * Новая тема из mobile/design-new (Precision Tech): тёмный фон + неоново-жёлто-зелёный акцент.
 * Hex‑аппроксимация CSS‑переменных из design-new/styles.css (OKLCH).
 */
export const PRECISION_COLORS = {
  background: '#1a1b21',
  surface: '#26282f',
  card: '#26282f',
  text: '#fafafa',
  textSecondary: '#a8aab4',
  /** Ближе к --muted-foreground в design-new (oklch ~0.74) — читаемый вторичный текст */
  textMuted: '#9ea1ad',
  textDark: '#fafafa',
  textMutedDark: '#9ea1ad',
  accent: '#dafb2f',
  primary: '#dafb2f',
  secondary: '#4a4d56',
  success: '#5fd89a',
  warning: '#e8c84a',
  error: '#e86552',
  info: '#6eb8f0',
  border: '#353841',
  shadow: '#000000',
} as const;

export const PRECISION_ACTION_COLORS = {
  colorManual: '#6eb8f0',
  colorAdvice: '#dafb2f',
  colorReminders: '#5fd89a',
  colorHistory: '#e8c84a',
  colorSTO: '#60d9df',
  colorAllReminders: '#e8a84a',
  colorDelete: '#e86552',
  colorDocumentions: '#6eb8f0',
  colorDownload: '#e8c84a',
} as const;

/** Текущие цвета действий (мутируются через applyAppTheme) */
export const ACTION_COLORS = { ...PRECISION_ACTION_COLORS };

/** Две цветовые схемы: Precision (основная, тёмная) и светлая. */
export type AppColorScheme = 'precision' | 'light';

/** Применить палитру к глобальным COLORS, ACTION_COLORS и RADIUS */
export function applyAppTheme(scheme: AppColorScheme): void {
  if (scheme === 'precision') {
    Object.assign(COLORS, PRECISION_COLORS);
    Object.assign(ACTION_COLORS, PRECISION_ACTION_COLORS);
    Object.assign(RADIUS, PRECISION_RADIUS);
    return;
  }
  Object.assign(COLORS, LIGHT_COLORS);
  Object.assign(ACTION_COLORS, LIGHT_ACTION_COLORS);
  Object.assign(RADIUS, LIGHT_RADIUS);
}

/** До гидратации ThemeProvider первый кадр — Precision. */
applyAppTheme('precision');

// Reminder types and manual sections are now fetched from API
// See services/api.ts for API calls
