import * as React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleProp,
} from 'react-native';
import { COLORS, SPACING } from '../constants';

interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

const Card: React.FC<CardProps> = ({ children, style, onPress, ...props }) => {
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressable: {
    // Additional styles for pressable cards
  },
});

export default Card;
