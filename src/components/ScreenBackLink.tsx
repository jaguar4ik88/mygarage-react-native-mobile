import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export type ScreenBackLinkLayout = 'block' | 'toolbar' | 'navbar';

export interface ScreenBackLinkProps {
  onPress: () => void;
  /** Если не задано — `common.back` */
  label?: string;
  /** Верхний регистр (макет PageHeader); для длинных подписей можно отключить */
  uppercase?: boolean;
  /** Префикс «←» */
  showArrow?: boolean;
  /**
   * block — над заголовком страницы в скролле (Auth);
   * toolbar — узкая колонка слева рядом с title (подписка, модалки);
   * navbar — ряд native-stack header (Профиль, авто, …).
   */
  layout?: ScreenBackLinkLayout;
  hitSlop?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Как design-new PageHeader back link: мелкий текст, regular, muted (не системная кнопка «Назад»).
 */
export default function ScreenBackLink({
  onPress,
  label,
  uppercase = true,
  showArrow = true,
  layout = 'block',
  hitSlop = 12,
  containerStyle,
}: ScreenBackLinkProps) {
  const { appearanceKey } = useTheme();
  const { t } = useLanguage();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pressableBlock: {
          alignSelf: 'flex-start',
          paddingVertical: SPACING.xs,
          marginBottom: SPACING.xs,
        },
        pressableToolbar: {
          alignSelf: 'flex-start',
          paddingVertical: 0,
          paddingHorizontal: 0,
          marginBottom: 0,
        },
        pressableNavbar: {
          alignSelf: 'center',
          paddingVertical: 0,
          paddingHorizontal: 0,
          marginBottom: 0,
        },
        pressed: {
          opacity: 0.65,
        },
        text: {
          fontSize: 10,
          lineHeight: 13,
          fontFamily: FONTS.regular,
          letterSpacing: 1.6,
          color: COLORS.textSecondary,
          ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
        },
        textUppercase: {
          textTransform: 'uppercase',
        },
      }),
    [appearanceKey]
  );

  const resolved = label ?? t('common.back');
  const displayText = uppercase ? resolved.toUpperCase() : resolved;

  const pressableBase =
    layout === 'navbar'
      ? styles.pressableNavbar
      : layout === 'toolbar'
        ? styles.pressableToolbar
        : styles.pressableBlock;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        pressableBase,
        pressed && styles.pressed,
        containerStyle,
      ]}
    >
      <Text style={[styles.text, uppercase ? styles.textUppercase : null]}>
        {showArrow ? `\u2190 ${displayText}` : displayText}
      </Text>
    </Pressable>
  );
}
