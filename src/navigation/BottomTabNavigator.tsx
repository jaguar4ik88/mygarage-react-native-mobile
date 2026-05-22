import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { COLORS, RADIUS, FONTS } from '../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import Icon from '../components/Icon';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { stackHeaderTitleStyle, stackHeaderTintColor } from './navigationTheme';
import { stackHeaderLeftOptions } from './stackHeaderLeft';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AdviceScreen from '../screens/AdviceScreen';
import RemindersScreen from '../screens/RemindersScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ActionsScreen from '../screens/ActionsScreen';
import STOScreen from '../screens/STOScreen';
import ReportsScreen from '../screens/ReportsScreen';
import DocumentsHubScreen from '../screens/DocumentsHubScreen';

const Tab = createBottomTabNavigator<RootStackParamList>();
const Stack = createNativeStackNavigator();

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, color, size }) => {
  return (
    <View style={styles.iconContainer}>
      <Icon name={name} size={size} color={color} />
    </View>
  );
};

interface BottomTabNavigatorProps {
  navigation: any;
  currentVehicleId: number | null;
  setCurrentVehicleId: (id: number) => void;
  onLogout?: () => void;
  onAddCar?: () => void;
  onVehicleDeleted?: () => void;
  refreshTrigger?: number;
}

const AdviceStackScreen: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator
      screenOptions={(props) => ({
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: stackHeaderTintColor(),
        headerTitleStyle: stackHeaderTitleStyle(),
        headerTitleAlign: 'center',
        ...stackHeaderLeftOptions(props.navigation),
      })}
    >
      <Stack.Screen name="AdviceRoot" options={{ headerShown: false }}>
        {() => <AdviceScreen />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const HomeStackScreen: React.FC<{
  navigation: any;
  onVehicleDeleted?: () => void;
  refreshTrigger?: number;
  onAddCar?: () => void;
}> = ({ navigation, onVehicleDeleted, refreshTrigger, onAddCar }) => {
  const { t } = useLanguage();
  const headerInsets = useSafeAreaInsets();
  return (
    <Stack.Navigator
      screenOptions={(props) => ({
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: stackHeaderTintColor(),
        headerTitleStyle: stackHeaderTitleStyle(),
        headerTitleAlign: 'center',
        ...stackHeaderLeftOptions(props.navigation),
      })}
    >
      <Stack.Screen 
        name="Home" 
        options={{ 
          header: () => (
            <View style={{
              backgroundColor: COLORS.card,
              paddingHorizontal: 16,
              paddingBottom: 12,
              paddingTop: Math.max(headerInsets.top, 12),
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{
                  fontFamily: FONTS.semiBold,
                  fontSize: 10,
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                  color: COLORS.accent,
                  marginBottom: 4,
                }} numberOfLines={1}>
                  {t('home.brandEyebrow')}
                </Text>
                <Text style={{
                  fontFamily: FONTS.bold,
                  fontSize: 22,
                  letterSpacing: -0.5,
                  color: COLORS.text,
                }} numberOfLines={1}>
                  {t('home.title')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
                <Icon name="user-circle" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      >
        {() => (
          <HomeScreen
            onNavigateToVehicleDetail={(vehicle) => {
              navigation.navigate('VehicleDetail', { vehicle });
            }}
            onNavigateToProfile={() => {
              navigation.navigate('Profile');
            }}
            onAddCar={() => {
              if (onAddCar) {
                onAddCar();
              } else {
                navigation.navigate('AddCar');
              }
            }}
            onNavigateToSubscription={() => navigation.navigate('Subscription')}
            onVehicleDeleted={onVehicleDeleted}
            refreshTrigger={refreshTrigger}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const RemindersStackScreen: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator
      screenOptions={(props) => ({
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: stackHeaderTintColor(),
        headerTitleStyle: stackHeaderTitleStyle(),
        headerTitleAlign: 'center',
        ...stackHeaderLeftOptions(props.navigation),
      })}
    >
      <Stack.Screen name="RemindersRoot" options={{ headerShown: false }}>
        {() => <RemindersScreen />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};


const HistoryStackScreen: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={(props) => ({
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: stackHeaderTintColor(),
        headerTitleStyle: stackHeaderTitleStyle(),
        headerTitleAlign: 'center',
        ...stackHeaderLeftOptions(props.navigation),
      })}
    >
      <Stack.Screen
        name="HistoryRoot"
        options={{
          headerShown: false,
        }}
      >
        {({ navigation }) => <HistoryScreen navigation={navigation} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const ActionsStackScreen: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={(props) => ({
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: stackHeaderTintColor(),
        headerTitleStyle: stackHeaderTitleStyle(),
        headerTitleAlign: 'center',
        ...stackHeaderLeftOptions(props.navigation),
      })}
    >
      <Stack.Screen
        name="ActionsRoot"
        options={{
          headerShown: false,
        }}
      >
        {({ navigation }) => (
          <ActionsScreen
            navigation={navigation}
            onNavigateToReminders={() => {
              // Navigate to Reminders tab
              navigation.getParent()?.navigate('Reminders');
            }}
            onNavigateToSTO={() => {
              // Navigate to STO screen
              navigation.navigate('STO');
            }}
            onNavigateToReports={() => {
              // Navigate to Reports screen in Actions stack
              navigation.navigate('Reports');
            }}
            onNavigateToRecommendations={() => {
              // Navigate to Recommendations in main stack
              navigation.getParent()?.getParent()?.navigate('Recommendations');
            }}
            onNavigateToExport={() => {
              // Navigate to Export screen in main stack
              navigation.getParent()?.getParent()?.navigate('Export');
            }}
            onNavigateToDocuments={() => {
              navigation.navigate('DocumentsHub');
            }}
            onNavigateToFamilyGarage={() => {}}
            onNavigateToLocation={() => {}}
          />
        )}
      </Stack.Screen>
      <Stack.Screen 
        name="STO" 
        options={{ 
          headerShown: false,
        }}
      >
        {() => <STOScreen />}
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
        name="DocumentsHub"
        options={{
          headerShown: false,
        }}
      >
        {() => <DocumentsHubScreen />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({ 
  navigation, 
  currentVehicleId,
  setCurrentVehicleId,
  onLogout,
  onAddCar,
  onVehicleDeleted,
  refreshTrigger
}) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { appearanceKey } = useTheme();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: COLORS.background,
      borderTopColor: COLORS.border,
      borderTopWidth: 1,
      minHeight: 52 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 6),
      paddingTop: 8,
      paddingHorizontal: 4,
      borderTopLeftRadius: RADIUS.tabBarTop,
      borderTopRightRadius: RADIUS.tabBarTop,
      elevation: 0,
      shadowOpacity: 0,
    }),
    [appearanceKey, insets.bottom]
  );

  const tabScreenIcons: Record<string, string> = {
    HomeTab: 'home',
    Advice: 'advice',
    History: 'history',
    Actions: 'actions',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: focused ? FONTS.semiBold : FONTS.medium,
              fontSize: 10,
              letterSpacing: 0.6,
              color,
              marginTop: 2,
            }}
          >
            {children}
          </Text>
        ),
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={tabScreenIcons[route.name] ?? 'home'} focused={focused} color={color} size={20} />
        ),
      })}
    >
      <Tab.Screen
        name="HomeTab"
        options={{
          title: t('navigation.home'),
        }}
      >
        {() => (
          <HomeStackScreen
            navigation={navigation}
            onVehicleDeleted={onVehicleDeleted}
            refreshTrigger={refreshTrigger}
            onAddCar={onAddCar}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="History"
        options={{
          title: t('navigation.history'),
        }}
        component={HistoryStackScreen}
      />

      <Tab.Screen
        name="Advice"
        options={{
          title: t('navigation.advice'),
        }}
      >
        {() => <AdviceStackScreen />}
      </Tab.Screen>

      <Tab.Screen
        name="Actions"
        options={{
          title: t('actions.title'),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            // После перехода из других мест (напр. карточка СТО с экрана авто) в стеке остаётся
            // STO/Отчёты/Документы — при выборе вкладки «Действия» показываем корень сетки действий.
            navigation.navigate('Actions', {
              screen: 'ActionsRoot',
            } as never);
          },
        })}
      >
        {() => <ActionsStackScreen />}
      </Tab.Screen>

    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomTabNavigator;
