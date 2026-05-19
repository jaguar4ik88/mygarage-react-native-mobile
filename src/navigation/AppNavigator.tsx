import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import ApiService from '../services/api';

// Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AddCarScreen from '../screens/AddCarScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import VehicleDocumentsScreen from '../screens/VehicleDocumentsScreen';
import RemindersScreen from '../screens/RemindersScreen';
import HistoryScreen from '../screens/HistoryScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import ExportScreen from '../screens/ExportScreen';
import ReportsScreen from '../screens/ReportsScreen';

// Navigation
import BottomTabNavigator from './BottomTabNavigator';
import {
  createAppNavigationTheme,
  stackHeaderTitleStyle,
  stackHeaderTintColor,
} from './navigationTheme';
import { stackHeaderLeftOptions } from './stackHeaderLeft';

// Types
import { RootStackParamList } from '../types';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import NotificationService from '../services/notificationService';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorContentProps {
  showLoginPrompt: boolean;
  setShowLoginPrompt: (show: boolean) => void;
}

const AppNavigatorContent: React.FC<AppNavigatorContentProps> = ({
  showLoginPrompt,
  setShowLoginPrompt,
}) => {
  const { t } = useLanguage();
  const { appearanceKey, isDark } = useTheme();
  const { isAuthenticated, isGuest, isLoading, logout, user, refreshUser } = useAuth();
  const [currentVehicleId, setCurrentVehicleId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigationRef = useRef<any>(null);

  const navigationTheme = useMemo(() => createAppNavigationTheme(isDark), [appearanceKey, isDark]);

  useEffect(() => {
    loadCurrentVehicle();
  }, []);

  useEffect(() => {
    // Set navigation ref in NotificationService when it's available
    if (navigationRef.current) {
      NotificationService.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current]);

  useEffect(() => {
    // Handle notification clicks
    const subscription = NotificationService.addNotificationResponseListener(response => {
      const { notification } = response;
      const notificationData = notification.request.content.data;
      
      console.log('Notification tapped:', notificationData);
      
      // Handle expense reminder notifications - navigate to History screen
      if (notificationData.type === 'expense_reminder' && navigationRef.current) {
        navigationRef.current.navigate('History');
      }
      
      // Handle reminder notifications - navigate to Reminders screen
      if (notificationData.type === 'reminder' && navigationRef.current) {
        navigationRef.current.navigate('Reminders');
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.remove();
  }, []);

  const loadCurrentVehicle = async () => {
    try {
      const vehicleId = await AsyncStorage.getItem('current_vehicle_id');
      setCurrentVehicleId(vehicleId ? parseInt(vehicleId) : null);
    } catch (error) {
      console.error('Error loading current vehicle:', error);
    }
  };

  const handleAuthSuccess = () => {
    // Переход на Home экран после успешной авторизации
    console.log('Auth success, navigating to Home');
    if (navigationRef.current) {
      // Используем navigate с reset для очистки истории
      navigationRef.current.navigate('Home');
    }
  };

  const handleCarAdded = async (vehicle: any) => {
    try {
      console.log('handleCarAdded called with vehicle:', vehicle);
      await AsyncStorage.setItem('current_vehicle_id', vehicle.id.toString());
      setCurrentVehicleId(vehicle.id);
      
      // Trigger vehicles list refresh on Home
      refreshVehicles();

      // Navigate back to home screen
      if (navigationRef.current) {
        navigationRef.current.navigate('Home');
      }
    } catch (error) {
      console.error('Error saving vehicle ID:', error);
    }
  };

  const handleCarDeleted = (vehicleId: number) => {
    console.log('Car deleted, navigating back to home');
    // Navigate back to home screen
    if (navigationRef.current) {
      navigationRef.current.navigate('Home');
    }
  };

  const refreshVehicles = () => {
    console.log('Refreshing vehicles list');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentVehicleId(null);
    if (navigationRef.current) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    }
  };

  const handleLoginPromptAccepted = (action: 'login' | 'register') => {
    setShowLoginPrompt(false);
    if (navigationRef.current) {
      navigationRef.current.navigate('Auth', { mode: action });
    }
  };

  const handleAddCar = async () => {
    if (isGuest) {
      console.log('👤 Guest trying to add car, showing login prompt');
      setShowLoginPrompt(true);
      return;
    }
    
    try {
      // Обновляем данные пользователя и проверяем лимит
      await refreshUser();
      
      const vehicles = await ApiService.getVehicles();
      const planType = user?.plan_type || 'free';
      const vehicleCount = vehicles.length;
      
      // FREE план - максимум 1 машина
      if (planType === 'free' && vehicleCount >= 1) {
        console.log('🚫 Vehicle limit reached for free plan');
        Alert.alert(
          t('subscription.proFeature'),
          t('subscription.vehicleLimitFreeMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('subscription.upgrade'),
              onPress: () => {
                navigationRef.current?.navigate('Subscription');
              },
            },
          ]
        );
        return;
      }

      // PRO план - максимум 3 машины, предлагаем Premium
      if (planType === 'pro' && vehicleCount >= 3) {
        console.log('🚫 Vehicle limit reached for pro plan, showing premium paywall');
        Alert.alert(
          t('subscription.proFeature'),
          t('subscription.vehicleLimitProMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('subscription.upgrade'),
              onPress: () => {
                navigationRef.current?.navigate('Subscription');
              },
            },
          ]
        );
        return;
      }

      // PREMIUM план - безлимит (но технически тоже максимум 3 по текущей конфигурации)
      if (planType === 'premium' && vehicleCount >= 3) {
        console.log('🚫 Vehicle limit reached for premium plan');
        Alert.alert(
          t('subscription.proFeature'),
          t('subscription.vehicleLimitPremiumMessage')
        );
        return;
      }
      
      // Лимит не достигнут - переходим на экран добавления
      if (navigationRef.current) {
        navigationRef.current.navigate('AddCar');
      }
    } catch (error) {
      console.error('Error checking vehicle limit:', error);
      // В случае ошибки всё равно разрешаем переход
      if (navigationRef.current) {
        navigationRef.current.navigate('AddCar');
      }
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onStateChange={async () => {
          try {
            const currentRoute = navigationRef.current?.getCurrentRoute?.();
            const screenName = currentRoute?.name;
            if (screenName) {
              const analytics = getAnalytics();
              await logEvent(analytics, 'screen_view' as any, { 
                screen_name: screenName, 
                screen_class: screenName 
              });
            }
          } catch (e) {
            // best-effort; avoid crashing navigation on analytics failure
          }
        }}
      >
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={(navProps) => ({
            headerStyle: { backgroundColor: COLORS.card },
            headerTintColor: stackHeaderTintColor(),
            headerTitleStyle: stackHeaderTitleStyle(),
            headerTitleAlign: 'center',
            ...stackHeaderLeftOptions(navProps.navigation),
          })}
        >
          {/* Welcome Screen - всегда доступен */}
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />

          {/* Auth Screens - доступны всем */}
          <Stack.Screen 
            name="Auth" 
            options={{ headerShown: false }}
          >
            {({ navigation, route }) => (
              <AuthScreen 
                onAuthSuccess={handleAuthSuccess} 
                navigation={navigation}
                initialMode={route.params?.mode || 'login'}
              />
            )}
          </Stack.Screen>
          
          <Stack.Screen 
            name="ForgotPassword" 
            options={{ headerShown: false }}
            component={ForgotPasswordScreen}
          />

          {/* Main Screens - доступны и гостям, и залогиненным */}
          <Stack.Screen 
            name="Home" 
            options={{ 
              title: t('home.title'),
              headerShown: false 
            }}
          >
            {({ navigation }) => (
              <BottomTabNavigator 
                navigation={navigation} 
                currentVehicleId={currentVehicleId}
                setCurrentVehicleId={setCurrentVehicleId}
                onLogout={handleLogout}
                onAddCar={handleAddCar}
                onVehicleDeleted={refreshVehicles}
                refreshTrigger={refreshTrigger}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="AddCar" 
            options={{ 
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <AddCarScreen 
                onCarAdded={handleCarAdded} 
                onBack={() => navigation.goBack()} 
                navigation={navigation}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="VehicleDetail" 
            options={{ 
              title: t('vehicleDetail.title'),
              headerBackTitle: t('common.back'),
              headerTintColor: stackHeaderTintColor(),
              headerTitleStyle: stackHeaderTitleStyle(),
              headerTitleAlign: 'center',
            }}
          >
            {({ navigation, route }) => (
              <VehicleDetailScreen 
                vehicle={route.params?.vehicle}
                onBack={() => navigation.goBack()}
                onEditVehicle={(updatedVehicle) => {
                  refreshVehicles();
                  if (updatedVehicle) {
                    navigation.setParams({ vehicle: updatedVehicle });
                  }
                }}
                onVehicleDeleted={handleCarDeleted}
                onNavigateToReminders={(vehicleId) => {
                  navigation.navigate('Reminders');
                }}
                onNavigateToStatistics={() => {
                  // Так же как History/Recommendations: пушим в корневой Stack — назад вернёт к деталям авто
                  navigation.navigate('Reports');
                }}
                onNavigateToHistory={(vehicleId) => {
                  navigation.navigate('History');
                }}
                onNavigateToRecommendations={() => {
                  navigation.navigate('Recommendations');
                }}
                navigation={navigation}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="VehicleDocuments" 
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          >
            {({ navigation, route }) => (
              <VehicleDocumentsScreen
                vehicle={route.params?.vehicle}
                onBack={() => navigation.goBack()}
                navigation={navigation}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Profile" 
            options={{ 
              title: t('profile.title'),
              headerBackTitle: t('common.back'),
              headerTintColor: stackHeaderTintColor(),
              headerTitleStyle: stackHeaderTitleStyle(),
              headerTitleAlign: 'center',
            }}
          >
            {({ navigation }) => (
              <ProfileScreen
                onBack={() => navigation.goBack()}
                onLogout={handleLogout}
                onAddCar={() => navigation.navigate('AddCar')}
                navigation={navigation}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Subscription" 
            options={{ 
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          >
            {({ navigation }) => (
              <SubscriptionScreen
                onBack={() => navigation.goBack()}
                navigation={navigation}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Reminders" 
            options={{ 
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <RemindersScreen />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="History" 
            options={{ 
              title: t('navigation.history'),
              headerBackTitle: t('common.back'),
              headerTintColor: stackHeaderTintColor(),
              headerTitleStyle: stackHeaderTitleStyle(),
              headerTitleAlign: 'center',
            }}
          >
            {({ navigation }) => (
              <HistoryScreen />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Reports" 
            options={{ 
              headerShown: false,
            }}
          >
            {() => <ReportsScreen />}
          </Stack.Screen>

          <Stack.Screen 
            name="Recommendations" 
            options={{ 
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <RecommendationsScreen navigation={navigation} />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Export" 
            options={{ 
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <ExportScreen navigation={navigation} />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>

      {/* Login Prompt Modal для гостей */}
      <LoginPromptModal
        visible={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={() => handleLoginPromptAccepted('login')}
        onRegister={() => handleLoginPromptAccepted('register')}
      />

    </>
  );
};

const AppNavigator: React.FC = () => {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleLoginPrompt = () => {
    console.log('🔔 handleLoginPrompt called, setting showLoginPrompt to true');
    setShowLoginPrompt(true);
  };

  return (
    <AuthProvider onLoginPrompt={handleLoginPrompt}>
      <AppNavigatorContent 
        showLoginPrompt={showLoginPrompt}
        setShowLoginPrompt={setShowLoginPrompt}
      />
    </AuthProvider>
  );
};

export default AppNavigator;
