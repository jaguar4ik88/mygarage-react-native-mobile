import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import { COLORS } from '../constants';
import { RootStackParamList } from '../types';
import Icon from '../components/Icon';
import { useLanguage } from '../contexts/LanguageContext';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AdviceScreen from '../screens/AdviceScreen';
import RemindersScreen from '../screens/RemindersScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ActionsScreen from '../screens/ActionsScreen';
import STOScreen from '../screens/STOScreen';
import ReportsScreen from '../screens/ReportsScreen';

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
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="AdviceRoot" options={{ title: t('navigation.advice') }}>
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
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="Home" 
        options={{ 
          header: () => (
            <View style={{
              backgroundColor: COLORS.card,
              paddingHorizontal: 16,
              paddingVertical: 12,
              paddingTop: 60,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 30, fontWeight: 'bold', color: COLORS.primary }} numberOfLines={1}>MyGarage</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
                <Icon name="user-circle" size={30} color={COLORS.text} />
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
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="RemindersRoot" options={{ title: t('navigation.reminders') }}>
        {() => <RemindersScreen />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};


const HistoryStackScreen: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="HistoryRoot" options={{ title: t('history.title') }}>
        {({ navigation }) => <HistoryScreen navigation={navigation} />}
      </Stack.Screen>
      <Stack.Screen name="Reports" options={{ title: t('reports.title') }}>
        {() => <ReportsScreen />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const ActionsStackScreen: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="ActionsRoot" options={{ title: t('actions.title') }}>
        {({ navigation }) => (
          <ActionsScreen
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
            onNavigateToFamilyGarage={() => {}}
            onNavigateToLocation={() => {}}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="STO" options={{ title: t('navigation.sto') }}>
        {() => <STOScreen />}
      </Stack.Screen>
      <Stack.Screen name="Reports" options={{ title: t('reports.title') }}>
        {() => <ReportsScreen />}
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 90,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="home" focused={focused} color={color} size={size} />
          ),
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
        name="Advice"
        options={{
          title: t('navigation.advice'),
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="advice" focused={focused} color={color} size={size} />
          ),
        }}
      >
        {() => <AdviceStackScreen />}
      </Tab.Screen>

      <Tab.Screen
        name="History"
        options={{
          title: t('navigation.history'),
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="history" focused={focused} color={color} size={size} />
          ),
        }}
        component={HistoryStackScreen}
      />

      <Tab.Screen
        name="Actions"
        options={{
          title: t('actions.title'),
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="actions" focused={focused} color={color} size={size} />
          ),
        }}
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
