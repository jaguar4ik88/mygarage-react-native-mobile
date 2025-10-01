import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notificationService';
import './src/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import LoadingSpinner from './src/components/LoadingSpinner';
import ApiErrorBanner from './src/components/ApiErrorBanner';
import { COLORS } from './src/constants';
import { getAnalytics, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import { initializeApp, getApps } from '@react-native-firebase/app';

const AppContent: React.FC = () => {
  const { isDark } = useTheme();

  useEffect(() => {
    // Initialize Firebase Analytics
    const initializeAnalytics = async () => {
      try {
        // Check if Firebase is already initialized
        if (getApps().length === 0) {
          console.log('Firebase not initialized, skipping analytics');
          return;
        }
        
        // Get analytics instance and enable collection
        const analytics = getAnalytics();
        await setAnalyticsCollectionEnabled(analytics, true);
        console.log('Firebase Analytics initialized successfully');
      } catch (e) {
        console.warn('Failed to initialize Firebase Analytics:', e);
      }
    };
    
    initializeAnalytics();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider key={isDark ? 'dark' : 'light'}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ApiErrorBanner />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Load fonts
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'FontAwesome5FreeSolid': require('react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
          'FontAwesome5FreeRegular': require('react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
          'FontAwesome5FreeBrands': require('react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'),
          'MaterialIcons': require('react-native-vector-icons/Fonts/MaterialIcons.ttf'),
          'Ionicons': require('react-native-vector-icons/Fonts/Ionicons.ttf'),
          'Feather': require('react-native-vector-icons/Fonts/Feather.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue anyway
      }
    };

    loadFonts();

    // Initialize notification service
    NotificationService.initialize();

    // Set up notification listeners
    const setupNotificationListeners = () => {
      // Handle notification received while app is in foreground
      const notificationListener = NotificationService.addNotificationReceivedListener(
        (notification) => {
          // If it's a reminder notification, mark it as inactive
          if (notification.request.content.data?.type === 'reminder' && 
              notification.request.content.data?.reminderId) {
            const reminderId = Number(notification.request.content.data.reminderId);
            if (!isNaN(reminderId)) {
              NotificationService.markReminderAsInactive(reminderId);
            }
          }
        }
      );

      // Handle notification response (when user taps on notification)
      const responseListener = NotificationService.addNotificationResponseListener(
        (response) => {
          // If it's a reminder notification, mark it as inactive and navigate to reminders
          if (response.notification.request.content.data?.type === 'reminder' && 
              response.notification.request.content.data?.reminderId) {
            const reminderId = Number(response.notification.request.content.data.reminderId);
            if (!isNaN(reminderId)) {
              NotificationService.markReminderAsInactive(reminderId);
            }
            
            // Navigate to reminders screen
            NotificationService.navigateToReminders();
          }
        }
      );

      // Return cleanup function
      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    };

    const cleanup = setupNotificationListeners();

    // Cleanup on unmount
    return cleanup;
  }, []);

  if (!fontsLoaded) {
    return <LoadingSpinner text="Загрузка шрифтов..." />;
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  // Styles removed - using ApiErrorBanner component instead
});