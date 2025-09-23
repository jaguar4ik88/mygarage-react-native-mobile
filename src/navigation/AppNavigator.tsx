import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

// Screens
import AuthScreen from '../screens/AuthScreen';
import AddCarScreen from '../screens/AddCarScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RemindersScreen from '../screens/RemindersScreen';
import HistoryScreen from '../screens/HistoryScreen';

// Navigation
import BottomTabNavigator from './BottomTabNavigator';

// Types
import { RootStackParamList } from '../types';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentVehicleId, setCurrentVehicleId] = useState<number | null>(null);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const vehicleId = await AsyncStorage.getItem('current_vehicle_id');
      
      setIsAuthenticated(!!token);
      setCurrentVehicleId(vehicleId ? parseInt(vehicleId) : null);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const handleAuthSuccess = async () => {
    try {
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving auth token:', error);
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

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshVehicles = () => {
    console.log('Refreshing vehicles list');
    setRefreshTrigger(prev => prev + 1);
  };

  if (isAuthenticated === null) {
    return <LoadingSpinner />;
  }

  return (
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
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.accent,
          headerTitleStyle: { fontWeight: 'bold', color: COLORS.accent },
          headerTitleAlign: 'center',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen 
            name="Auth" 
            options={{ headerShown: false }}
          >
            {() => <AuthScreen onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>
        ) : (
          <>
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
                  onLogout={() => {
                    setIsAuthenticated(false);
                    setCurrentVehicleId(null);
                  }}
                  onAddCar={() => navigation.navigate('AddCar')}
                  onVehicleDeleted={refreshVehicles}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </Stack.Screen>

            <Stack.Screen 
              name="AddCar" 
              options={{ 
                title: t('addCar.title'),
                headerBackTitle: 'Back',
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
                headerBackTitle: 'Back',
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
                    // Vehicle editing is now handled directly in VehicleDetailScreen
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
                />
              )}
            </Stack.Screen>

            <Stack.Screen 
              name="Profile" 
              options={{ 
                title: t('profile.title'),
                headerBackTitle: 'Back',
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
                  onLogout={() => {
                    setIsAuthenticated(false);
                    setCurrentVehicleId(null);
                  }}
                  onAddCar={() => navigation.navigate('AddCar')}
                  navigation={navigation}
                />
              )}
            </Stack.Screen>

            <Stack.Screen 
              name="Reminders" 
              options={{ 
                title: t('navigation.reminders'),
                headerBackTitle: 'Back',
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
                headerBackTitle: 'Back',
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;