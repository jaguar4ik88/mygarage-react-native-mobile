import React from 'react';
import { Platform, View } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import ScreenBackLink from '../components/ScreenBackLink';

/**
 * Левая кнопка в native-stack: наш текстовый «назад», а не системная (крупная/жирная).
 */
export function stackHeaderLeftOptions(navigation: {
  goBack(): void;
}): Pick<NativeStackNavigationOptions, 'headerLeft'> {
  return {
    headerLeft: ({ canGoBack }) =>
      canGoBack ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginLeft: Platform.OS === 'ios' ? 6 : 10,
            minHeight: 44,
          }}
        >
          <ScreenBackLink layout="navbar" onPress={() => navigation.goBack()} />
        </View>
      ) : null,
  };
}
