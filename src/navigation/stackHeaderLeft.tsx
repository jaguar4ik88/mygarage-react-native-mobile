import React from 'react';
import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import ScreenBackLink from '../components/ScreenBackLink';

/**
 * Левая кнопка в native-stack: текстовый «назад» вместо системной.
 * Важно: `headerBackVisible: false` — иначе на iOS остаётся нативный back и
 * `leftItemsSupplementBackButton` даёт «капсулу»/обводку вокруг зоны назад.
 */
export function stackHeaderLeftOptions(navigation: {
  goBack(): void;
}): Pick<NativeStackNavigationOptions, 'headerLeft' | 'headerBackVisible'> {
  return {
    headerBackVisible: false,
    headerLeft: ({ canGoBack }) =>
      canGoBack ? (
        <ScreenBackLink
          layout="navbar"
          onPress={() => navigation.goBack()}
          containerStyle={{ marginLeft: Platform.OS === 'ios' ? 6 : 10 }}
        />
      ) : null,
  };
}
