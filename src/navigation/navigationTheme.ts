import type { Theme } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { COLORS, FONTS } from '../constants';

/** Тема NavigationContainer (цвета под текущую палитру приложения). */
export function createAppNavigationTheme(isDark: boolean): Theme {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: COLORS.accent,
      background: COLORS.background,
      card: COLORS.card,
      text: COLORS.text,
      border: COLORS.border,
      notification: COLORS.accent,
    },
  };
}

/** Единый стиль заголовка native-stack (без fontWeight — только семейство Inter). */
export function stackHeaderTitleStyle() {
  return {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.accent,
  };
}

/** Цвет системной кнопки «назад» — как текстовая ссылка на макете (muted). */
export function stackHeaderTintColor(): string {
  return COLORS.textSecondary;
}
