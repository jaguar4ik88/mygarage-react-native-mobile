import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notificationService';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import LoadingSpinner from './src/components/LoadingSpinner';
import ApiErrorBanner from './src/components/ApiErrorBanner';
import { COLORS } from './src/constants';
import { getAnalytics, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';

const AppContent: React.FC = () => {
  const { isDark } = useTheme();

  useEffect(() => {
    // By default, collection is disabled via app.json plugin config.
    // You can enable it after obtaining user consent.
    const enableAnalyticsIfConsented = async () => {
      try {
        // TODO: replace with real consent state from settings/profile
        const userConsented = true;
        const analytics = getAnalytics();
        await setAnalyticsCollectionEnabled(analytics, !!userConsented);
      } catch (e) {
        console.warn('Failed to set analytics collection state', e);
      }
    };
    enableAnalyticsIfConsented();
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