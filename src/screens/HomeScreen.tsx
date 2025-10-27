import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import AnimatedView from '../components/AnimatedView';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { Vehicle, Reminder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface HomeScreenProps {
  onNavigateToVehicleDetail: (vehicle: Vehicle) => void;
  onNavigateToProfile: () => void;
  onAddCar: () => void;
  onVehicleDeleted?: () => void;
  refreshTrigger?: number;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToVehicleDetail,
  onNavigateToProfile,
  onAddCar,
  onVehicleDeleted,
  refreshTrigger,
}) => {
  const { t } = useLanguage();
  const { isGuest, user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (user?.id) {
      loadData();
    } else if (isGuest) {
      // Для гостевого режима показываем пустой экран без загрузки
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadData();
    }
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      const vehiclesData = await ApiService.getVehicles();

      console.log('HomeScreen: Vehicles data length:', vehiclesData?.length);
      
      setVehicles(vehiclesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Для гостей ApiService уже вернул пустые данные, ошибки не будет
      if (!isGuest) {
        Alert.alert(t('common.error'), t('common.failedToLoadData'));
      }
    } finally {
      setLoading(false);
    }
  };


  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getNextReminder = (): Reminder | null => {
    if (reminders.length === 0) return null;
    
    const now = new Date();
    const upcomingReminders = reminders
      .filter(reminder => reminder.is_active)
      .filter(reminder => {
        const nextDate = new Date(reminder.next_service_date);
        return nextDate > now;
      })
      .sort((a, b) => new Date(a.next_service_date).getTime() - new Date(b.next_service_date).getTime());
    
    return upcomingReminders[0] || null;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysUntilReminder = (dateString: string): number => {
    const now = new Date();
    const reminderDate = new Date(dateString);
    const diffTime = reminderDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nextReminder = getNextReminder();

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} />
        }
      >
        {/* Header moved to native navigator for full-bleed background like Advice */}

        <View style={styles.emptyVehicles}>
          <Button
            title={t('home.addCar')}
            onPress={onAddCar}
            variant="outline"
            style={styles.addCarButton}
          />
        </View>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('navigation.vehicles')}</Text>
          {loading ? (
            <View style={styles.emptyVehicles}>
              <Text style={styles.emptyVehiclesText}>
                {t('common.loading')}
              </Text>
            </View>
          ) : !vehicles || vehicles.length === 0 ? (
            <View style={styles.emptyVehicles}>
              <Text style={styles.emptyVehiclesText}>
                {t('home.noVehiclesText')}
              </Text>
            </View>
          ) : (
            vehicles?.map((vehicle, index) => (
              <AnimatedView
                key={vehicle.id}
                animation="slideInUp"
                delay={index * 100}
                duration={300}
              >
                <TouchableOpacity
                  onPress={() => onNavigateToVehicleDetail(vehicle)}
                  style={styles.vehicleItem}
                >
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleTitle}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </Text>
                    <Text style={styles.vehicleSubtitle}>
                      {vehicle.engine_type} • {vehicle.mileage.toLocaleString()} {t('common.kilometers')}
                    </Text>
                    {vehicle.vin && (
                      <Text style={styles.vehicleVin}>
                        VIN: {vehicle.vin}
                      </Text>
                    )}
                  </View>
                  <View style={styles.vehicleActions}>
                    <TouchableOpacity
                      onPress={() => onNavigateToVehicleDetail(vehicle)}
                      style={styles.vehicleActionButton}
                    >
                      <Icon name="forward" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </AnimatedView>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  titleRed: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  titleWhite: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  titleActive: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  profileButton: {
    padding: SPACING.sm,
  },
  profileButtonText: {
    fontSize: 20,
  },
  emptyState: {
    margin: SPACING.lg,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  addCarButton: {
    width: '100%',
  },
  vehicleCardContainer: {
    margin: SPACING.lg,
  },
  vehicleCard: {
    margin: 0,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  vehicleIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  arrowIcon: {
    marginLeft: SPACING.xs,
  },
  vehicleVin: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  sectionCard: {
    margin: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyVehicles: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginLeft: SPACING.lg,
    marginRight: SPACING.lg,
  },
  emptyVehiclesText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vehicleActions: {
    flexDirection: 'row',
  },
  vehicleActionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  reminderCard: {
    margin: SPACING.lg,
    backgroundColor: COLORS.accent,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  reminderLink: {
    fontSize: 14,
    color: COLORS.background,
    textDecorationLine: 'underline',
  },
  reminderContent: {
    // Additional styles if needed
  },
  reminderText: {
    fontSize: 14,
    color: COLORS.background,
    marginBottom: SPACING.xs,
  },
  reminderDate: {
    fontSize: 12,
    color: COLORS.background,
    opacity: 0.8,
  },
  bottomActions: {
    padding: SPACING.lg,
  },
  bottomActionButton: {
    marginBottom: SPACING.md,
  },
});

export default HomeScreen;
