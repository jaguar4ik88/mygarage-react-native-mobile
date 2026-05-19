import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from './Icon';
import eventBus from '../services/eventBus';
import { EVENTS } from '../services/eventBus';
import { COLORS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface ApiError {
  url: string;
  method: string;
  message: string;
}

const ApiErrorBanner: React.FC = () => {
  const { appearanceKey } = useTheme();
  const [error, setError] = useState<ApiError | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        },
        banner: {
          backgroundColor: COLORS.error,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        content: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        },
        message: {
          color: COLORS.text,
          fontSize: 14,
          marginLeft: 8,
          flex: 1,
        },
        dismissButton: {
          padding: 4,
          marginLeft: 8,
        },
      }),
    [appearanceKey]
  );

  useEffect(() => {
    const handleError = (errorData: ApiError) => {
      setError(errorData);
      setVisible(true);
      
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 5 seconds
      setTimeout(() => {
        handleDismiss();
      }, 5000);
    };

    eventBus.on(EVENTS.API_ERROR, handleError);
    
    return () => {
      eventBus.off(EVENTS.API_ERROR, handleError);
    };
  }, [fadeAnim]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setError(null);
    });
  };

  if (!visible || !error) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.banner}>
        <View style={styles.content}>
          <Icon name="error" size={20} color={COLORS.text} />
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Icon name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default ApiErrorBanner;
