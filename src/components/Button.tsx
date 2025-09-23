import * as React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants';
import Icon from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  iconPosition?: 'left' | 'right';
  borderColorOverride?: string;
  textColorOverride?: string;
  iconColorOverride?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  borderColorOverride,
  textColorOverride,
  iconColorOverride,
}) => {
  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    // Apply border color override for outline/secondary variants
    (variant === 'outline' || variant === 'secondary') && borderColorOverride ? { borderColor: borderColorOverride } : undefined,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textColorOverride ? { color: textColorOverride } : undefined,
    textStyle,
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.background : COLORS.accent}
          size="small"
        />
      );
    }

    if (icon) {
      const defaultIconColor = variant === 'primary' ? COLORS.background : COLORS.accent;
      const iconColor = iconColorOverride || textColorOverride || defaultIconColor;
      const iconSize = size === 'small' ? 16 : size === 'large' ? 20 : 18;
      
      return (
        <View style={styles.buttonContent}>
          {iconPosition === 'left' && (
            <Icon name={icon} size={iconSize} color={iconColor} style={styles.iconLeft} />
          )}
          <Text style={textStyleCombined}>{title}</Text>
          {iconPosition === 'right' && (
            <Icon name={icon} size={iconSize} color={iconColor} style={styles.iconRight} />
          )}
        </View>
      );
    }

    return <Text style={textStyleCombined}>{title}</Text>;
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: COLORS.accent,
  },
  secondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  small: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: COLORS.background,
  },
  secondaryText: {
    color: COLORS.text,
  },
  outlineText: {
    color: COLORS.accent,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  disabledText: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
});

export default Button;
