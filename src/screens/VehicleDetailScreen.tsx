import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import AnimatedView from '../components/AnimatedView';
import { COLORS, FONTS, SPACING, ACTION_COLORS } from '../constants';
import ApiService from '../services/api';
import { Vehicle, Reminder, ServiceHistory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface VehicleDetailScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onVehicleDeleted: (vehicleId: number) => void;
  onNavigateToReminders: (vehicleId: number) => void;
  onNavigateToManual: () => void;
  onNavigateToHistory: (vehicleId: number) => void;
  onNavigateToSTO: () => void;
}

const VehicleDetailScreen: React.FC<VehicleDetailScreenProps> = ({
  vehicle,
  onBack,
  onEditVehicle,
  onVehicleDeleted,
  onNavigateToReminders,
  onNavigateToManual,
  onNavigateToHistory,
  onNavigateToSTO,
}) => {
  const { t, language } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [reminderTypes, setReminderTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingMileage, setEditingMileage] = useState(false);
  const [newMileage, setNewMileage] = useState(vehicle.mileage.toString());

  useEffect(() => {
    loadData();
  }, [vehicle.id, language]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading data for vehicle ID:', vehicle.id);
      
      // Check if vehicle ID is valid
      if (!vehicle.id || vehicle.id <= 0) {
        console.error('Invalid vehicle ID:', vehicle.id);
        return;
      }
      
      // Get current user first
      const user = await ApiService.getProfile();
      const [remindersData, historyData, typesData] = await Promise.all([
        ApiService.getReminders(user.id),
        ApiService.getServiceHistory(vehicle.id),
        ApiService.getReminderTypes(language),
      ]);
      
      setReminders(remindersData);
      setServiceHistory(historyData);
      setReminderTypes(typesData);
    } catch (error) {
      console.error('Error loading vehicle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUpdateMileage = async () => {
    try {
      const updatedVehicle = await ApiService.updateVehicle(vehicle.id, {
        mileage: parseInt(newMileage),
      });
      onEditVehicle(updatedVehicle);
      setEditingMileage(false);
      Alert.alert(t('vehicleDetail.success'), t('vehicleDetail.mileageUpdated'));
    } catch (error) {
      Alert.alert(t('vehicleDetail.error'), t('vehicleDetail.failedToUpdateMileage'));
    }
  };

  const handleDeleteVehicle = () => {
    Alert.alert(
      t('vehicleDetail.deleteVehicle'),
      `${t('vehicleDetail.deleteVehicleConfirm')} ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteVehicle(vehicle.id);
              Alert.alert(t('vehicleDetail.success'), t('vehicleDetail.deleteSuccess'), [
                {
                  text: t('common.ok'),
                  onPress: () => onVehicleDeleted(vehicle.id)
                }
              ]);
            } catch (error: any) {
              Alert.alert(t('vehicleDetail.error'), error.message || t('vehicleDetail.failedToDeleteVehicle'));
            }
          },
        },
      ]
    );
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

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left','right','bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >

        <AnimatedView animation="fadeIn" delay={0}>
          <Card style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleTitle}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Text>
                <Text style={styles.vehicleSubtitle}>
                  {vehicle.engine_type}
                </Text>
                {vehicle.vin && (
                  <Text style={styles.vehicleVin}>
                    VIN: {vehicle.vin}
                  </Text>
                )}
              </View>
              <View style={styles.vehicleIcon}>
                <Icon name="car" size={40} color={COLORS.accent} />
              </View>
            </View>

            <View style={styles.mileageSection}>
              <Text style={styles.sectionTitle}>{t('vehicleDetail.currentMileage')}</Text>
              {editingMileage ? (
                <View style={styles.mileageEdit}>
                  <Input
                    value={newMileage}
                    onChangeText={setNewMileage}
                    keyboardType="numeric"
                    style={styles.mileageInput}
                  />
                  <View style={styles.mileageButtons}>
                    <Button
                      title={t('common.save')}
                      onPress={handleUpdateMileage}
                      size="small"
                      style={styles.mileageButton}
                    />
                    <Button
                      title={t('common.cancel')}
                      onPress={() => {
                        setEditingMileage(false);
                        setNewMileage(vehicle.mileage.toString());
                      }}
                      variant="outline"
                      size="small"
                      style={styles.mileageButton}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.mileageDisplay}>
                  <Text style={styles.mileageValue}>
                    {vehicle.mileage.toLocaleString()} {t('vehicleDetail.kilometers')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditingMileage(true)}
                    style={styles.editMileageButton}
                  >
                    <Icon name="edit" size={16} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card>
        </AnimatedView>

        {nextReminder && (
          <AnimatedView animation="slideInUp" delay={100}>
            <Card style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <Text style={styles.reminderTitle}>{t('vehicleDetail.nearestService')}</Text>
                <TouchableOpacity onPress={() => onNavigateToReminders(vehicle.id)}>
                  <Text style={styles.reminderLink}>{t('vehicleDetail.allReminders')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.reminderContent}>
                <Text style={styles.reminderText}>
                  {reminderTypes.find(type => type.key === nextReminder.type)?.title || nextReminder.title}
                </Text>
                <Text style={styles.reminderDate}>
                  {formatDate(nextReminder.next_service_date)} ({getDaysUntilReminder(nextReminder.next_service_date)} {t('vehicleDetail.days')})
                </Text>
              </View>
            </Card>
          </AnimatedView>
        )}

        <AnimatedView animation="slideInUp" delay={200}>
          <Card style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>{t('vehicleDetail.actions')}</Text>
            <View style={styles.actionsGrid}>
              <Button
                title={t('navigation.advice')}
                onPress={() => onNavigateToManual()}
                variant="outline"
                style={styles.actionButton}
                borderColorOverride={ACTION_COLORS.colorAdvice}
                textColorOverride={ACTION_COLORS.colorAdvice}
                iconColorOverride={ACTION_COLORS.colorAdvice}
                icon="advice"
              />
              <Button
                title={t('vehicleDetail.reminders')}
                onPress={() => onNavigateToReminders(vehicle.id)}
                variant="outline"
                style={styles.actionButton}
                borderColorOverride={ACTION_COLORS.colorReminders}
                textColorOverride={ACTION_COLORS.colorReminders}
                iconColorOverride={ACTION_COLORS.colorReminders}
                icon="reminders"
              />
              <Button
                title={t('navigation.history')}
                onPress={() => onNavigateToHistory(vehicle.id)}
                variant="outline"
                style={styles.actionButton}
                borderColorOverride={ACTION_COLORS.colorHistory}
                textColorOverride={ACTION_COLORS.colorHistory}
                iconColorOverride={ACTION_COLORS.colorHistory}
                icon="history"
              />
              <Button
                title={t('navigation.sto')}
                onPress={onNavigateToSTO}
                variant="outline"
                style={styles.actionButton}
                borderColorOverride={ACTION_COLORS.colorSTO}
                textColorOverride={ACTION_COLORS.colorSTO}
                iconColorOverride={ACTION_COLORS.colorSTO}
                icon="sto"
              />
              <Button
                title={t('common.delete')}
                onPress={handleDeleteVehicle}
                variant="outline"
                style={styles.deleteButton}
                borderColorOverride={ACTION_COLORS.colorDelete}
                textColorOverride={ACTION_COLORS.colorDelete}
                iconColorOverride={ACTION_COLORS.colorDelete}
                icon="trash"
              />
            </View>
          </Card>
        </AnimatedView>

        {serviceHistory.length > 0 && (
          <AnimatedView animation="slideInUp" delay={300}>
            <Card style={styles.historyCard}>
              <Text style={styles.sectionTitle}>{t('vehicleDetail.recentRecords')}</Text>
              {serviceHistory.slice(0, 3).map((record, index) => (
                <View key={record.id} style={styles.historyItem}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{record.title}</Text>
                    <Text style={styles.historyDate}>
                      {formatDate(record.service_date)}
                    </Text>
                  </View>
                  <Text style={styles.historyCost}>
                    {record.cost.toLocaleString()} ₽
                  </Text>
                </View>
              ))}
              {serviceHistory.length > 3 && (
                <TouchableOpacity
                  onPress={() => onNavigateToHistory(vehicle.id)}
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllText}>{t('vehicleDetail.showAllRecords')}</Text>
                </TouchableOpacity>
              )}
            </Card>
          </AnimatedView>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  vehicleCard: {
    margin: SPACING.lg,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  vehicleSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  vehicleVin: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  vehicleIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mileageSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  mileageDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mileageValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  editMileageButton: {
    padding: SPACING.sm,
  },
  mileageEdit: {
    gap: SPACING.md,
  },
  mileageInput: {
    fontSize: 24,
    textAlign: 'center',
  },
  mileageButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  mileageButton: {
    flex: 1,
  },
  reminderCard: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reminderLink: {
    color: COLORS.accent,
    fontSize: 14,
  },
  reminderContent: {
    gap: SPACING.xs,
  },
  reminderText: {
    fontSize: 16,
    color: COLORS.text,
  },
  reminderDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionsCard: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  deleteButton: {
    flex: 1,
    minWidth: '45%',
  },
  historyCard: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  historyDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  historyCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  viewAllText: {
    color: COLORS.accent,
    fontSize: 16,
  },
});

export default VehicleDetailScreen;
