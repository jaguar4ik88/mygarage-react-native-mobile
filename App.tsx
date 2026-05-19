import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notificationService';
import './src/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import LoadingSpinner from './src/components/LoadingSpinner';
import { COLORS } from './src/constants';
import { getApps } from '@react-native-firebase/app';
import * as NavigationBar from 'expo-navigation-bar';
import CrashlyticsService from './src/services/crashlyticsService';

const LanguageWrapper: React.FC = () => {
  const { isLanguageLoaded } = useLanguage();

  if (!isLanguageLoaded) {
    return <LoadingSpinner text="Загрузка..." />;
  }

  return <AppContent />;
};

const AppContent: React.FC = () => {
  const { isDark, colorScheme } = useTheme();

  useEffect(() => {
    const syncNavBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(COLORS.background);
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        await NavigationBar.setBehaviorAsync('inset-swipe');
      } catch {
        /* noop */
      }
    };
    syncNavBar();
  }, [isDark, colorScheme]);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          const apps = getApps();
          if (apps.length > 0) {
            console.log('✅ Firebase App ready:', apps[0].name);
            break;
          }
          console.log(`⏳ Waiting for Firebase... attempt ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 300));
          attempts++;
        }

        const apps = getApps();
        if (apps.length === 0) {
          console.error('❌ Firebase failed to initialize after', maxAttempts, 'attempts');
          return;
        }

        try {
          const { getAnalytics, setAnalyticsCollectionEnabled } = require('@react-native-firebase/analytics');
          const analytics = getAnalytics();
          await setAnalyticsCollectionEnabled(analytics, true);
          console.log('✅ Firebase Analytics initialized');
        } catch (e) {
          console.warn('⚠️ Failed to initialize Analytics:', e);
        }

        try {
          await CrashlyticsService.initialize();
          console.log('✅ Firebase Crashlytics initialized');
        } catch (e) {
          console.warn('⚠️ Failed to initialize Crashlytics:', e);
        }
      } catch (error) {
        console.error('❌ Firebase initialization error:', error);
      }
    };

    initializeFirebase();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider key={colorScheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default function App() {
  const [interLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [iconsLoaded, setIconsLoaded] = useState(false);

  useEffect(() => {
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
      } catch (error) {
        console.error('Error loading fonts:', error);
      } finally {
        setIconsLoaded(true);
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

  if (!interLoaded || !iconsLoaded) {
    return <LoadingSpinner text="Загрузка шрифтов..." />;
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <LanguageWrapper />
      </ThemeProvider>
    </LanguageProvider>
  );
}

