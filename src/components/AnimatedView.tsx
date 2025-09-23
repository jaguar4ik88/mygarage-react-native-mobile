import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, ViewProps } from 'react-native';

interface AnimatedViewProps extends ViewProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideInUp' | 'slideInDown' | 'slideInLeft' | 'slideInRight' | 'scaleIn' | 'bounceIn';
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  onAnimationComplete?: () => void;
}

const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  animation = 'fadeIn',
  duration = 300,
  delay = 0,
  style,
  onAnimationComplete,
  ...props
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete?.();
      });
    };

    startAnimation();
  }, [animatedValue, duration, delay, onAnimationComplete]);

  const getAnimatedStyle = (): any => {
    switch (animation) {
      case 'fadeIn':
        return {
          opacity: animatedValue,
        };
      case 'slideInUp':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        };
      case 'slideInDown':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        };
      case 'slideInLeft':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        };
      case 'slideInRight':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        };
      case 'scaleIn':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
      case 'bounceIn':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 1.1, 1],
              }),
            },
          ],
        };
      default:
        return {
          opacity: animatedValue,
        };
    }
  };

  return (
    <Animated.View style={[getAnimatedStyle(), style]} {...props}>
      {children}
    </Animated.View>
  );
};

export default AnimatedView;
