import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';

// Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AddCarScreen from '../screens/AddCarScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RemindersScreen from '../screens/RemindersScreen';
import HistoryScreen from '../screens/HistoryScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';

// Navigation
import BottomTabNavigator from './BottomTabNavigator';

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
  const { isAuthenticated, isGuest, isLoading, logout } = useAuth();
  const [currentVehicleId, setCurrentVehicleId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    loadCurrentVehicle();
  }, []);

  useEffect(() => {
    // Set navigation ref in NotificationService when it's available
    if (navigationRef.current) {
      NotificationService.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef.current]);

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

  const handleAddCar = () => {
    if (isGuest) {
      console.log('👤 Guest trying to add car, showing login prompt');
      setShowLoginPrompt(true);
      return;
    }
    
    if (navigationRef.current) {
      navigationRef.current.navigate('AddCar');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
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
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.card },
            headerTintColor: COLORS.accent,
            headerTitleStyle: { fontWeight: 'bold', color: COLORS.accent },
            headerTitleAlign: 'center',
          }}
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
              title: t('addCar.title'),
              headerBackTitle: t('common.back'),
              headerTintColor: COLORS.accent,
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: 'bold',
              },
              headerTitleAlign: 'center',
            }}
          >
            {({ navigation }) => (
              <AddCarScreen 
                onCarAdded={handleCarAdded} 
                onBack={() => navigation.goBack()} 
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="VehicleDetail" 
            options={{ 
              title: t('vehicleDetail.title'),
              headerBackTitle: t('common.back'),
              headerTintColor: COLORS.accent,
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: 'bold',
              },
              headerTitleAlign: 'center',
            }}
          >
            {({ navigation, route }) => (
              <VehicleDetailScreen 
                vehicle={route.params?.vehicle}
                onBack={() => navigation.goBack()}
                onEditVehicle={(vehicle) => {
                  // Trigger Home vehicles refresh after editing year/mileage
                  refreshVehicles();
                }}
                onVehicleDeleted={handleCarDeleted}
                onNavigateToReminders={(vehicleId) => {
                  navigation.navigate('Reminders');
                }}
                onNavigateToManual={() => {
                  // Switch to Advice tab inside BottomTabNavigator
                  navigation.navigate('Home', { screen: 'Advice' as never } as never);
                }}
                onNavigateToHistory={(vehicleId) => {
                  navigation.navigate('History');
                }}
                onNavigateToSTO={() => {
                  // Switch to STO tab inside BottomTabNavigator
                  navigation.navigate('Home', { screen: 'STO' as never } as never);
                }}
                onNavigateToRecommendations={() => {
                  navigation.navigate('Recommendations');
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Profile" 
            options={{ 
              title: t('profile.title'),
              headerBackTitle: t('common.back'),
              headerTintColor: COLORS.accent,
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: 'bold',
              },
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
            name="Reminders" 
            options={{ 
              title: t('navigation.reminders'),
              headerBackTitle: t('common.back'),
              headerTintColor: COLORS.accent,
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: 'bold',
              },
              headerTitleAlign: 'center',
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
              headerTintColor: COLORS.accent,
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: 'bold',
              },
              headerTitleAlign: 'center',
            }}
          >
            {({ navigation }) => (
              <HistoryScreen />
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Recommendations" 
            options={{ 
              title: t('navigation.recommendations'),
              headerBackTitle: t('common.back'),
              headerTintColor: COLORS.accent,
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: 'bold',
              },
              headerTitleAlign: 'center',
            }}
          >
            {({ navigation }) => (
              <RecommendationsScreen />
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
