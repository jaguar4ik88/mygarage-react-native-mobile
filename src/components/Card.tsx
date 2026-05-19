import * as React from 'react';
import { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleProp,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

const Card: React.FC<CardProps> = ({ children, style, onPress, ...props }) => {
  const { appearanceKey } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: COLORS.card,
          borderRadius: RADIUS.card,
          padding: SPACING.md,
          marginBottom: SPACING.md,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        pressable: {},
      }),
    [appearanceKey]
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.pressable, style]}
        onPress={onPress}
        activeOpacity={0.8}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

export default Card;
