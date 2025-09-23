import React, { useRef } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  animationType?: 'scale' | 'bounce' | 'pulse';
  scaleValue?: number;
  duration?: number;
  style?: ViewStyle;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  animationType = 'scale',
  scaleValue = 0.95,
  duration = 150,
  style,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: any) => {
    if (animationType === 'scale') {
      Animated.timing(scaleAnim, {
        toValue: scaleValue,
        duration,
        useNativeDriver: true,
      }).start();
    } else if (animationType === 'bounce') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (animationType === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start();
    }

    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (animationType === 'scale') {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    } else if (animationType === 'bounce') {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }

    onPressOut?.(event);
  };

  const getAnimatedStyle = (): any => {
    switch (animationType) {
      case 'scale':
        return {
          transform: [{ scale: scaleAnim }],
        };
      case 'bounce':
        return {
          transform: [{ scale: scaleAnim }],
        };
      case 'pulse':
        return {
          transform: [{ scale: pulseAnim }],
        };
      default:
        return {};
    }
  };

  return (
    <Animated.View style={getAnimatedStyle()}>
      <TouchableOpacity
        style={style}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AnimatedButton;
