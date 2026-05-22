import * as React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants';
import ScreenBackLink from './ScreenBackLink';
import { stackHeaderTitleStyle } from '../navigation/navigationTheme';

export interface AppStackHeaderProps {
  title: string;
  onBack?: () => void;
  /** Заменяет правый спейсер (например кнопка «+» на History). */
  right?: React.ReactNode;
}

/**
 * Единая шапка под статус-бар (COLORS.card на всю ширину + paddingTop: insets.top),
 * как на Profile — вместо нативного stack header.
 */
export default function AppStackHeader({ title, onBack, right }: AppStackHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.outer,
        { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
      ]}
    >
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.row}>
          <View style={styles.side}>
            {onBack ? (
              <ScreenBackLink layout="navbar" onPress={onBack} />
            ) : (
              <View style={styles.sideSpacer} />
            )}
          </View>
          <View style={styles.center} pointerEvents="none">
            <Text style={[stackHeaderTitleStyle(), styles.titleText]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View
            style={[styles.side, styles.sideEnd, right != null ? styles.sideEndWithTrailing : null]}
          >
            {right != null ? right : <View style={styles.sideSpacer} />}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Platform.OS === 'ios' ? 44 : 56,
    /** Как у нативного UINavigationBar / Material toolbar — поля от краёв экрана */
    paddingHorizontal: SPACING.md,
  },
  side: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  sideEnd: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  /** Отступы у трейлинг-элементов (напр. круг «+») от правого и нижнего края полосы шапки */
  sideEndWithTrailing: {
    paddingRight: SPACING.xs,
    paddingBottom: SPACING.xs,
    justifyContent: 'center',
  },
  sideSpacer: {
    minWidth: 44,
    minHeight: 44,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  titleText: {
    textAlign: 'center',
  },
});
