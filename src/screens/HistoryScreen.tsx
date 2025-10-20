import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import FormModal from '../components/FormModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import DateInput from '../components/DateInput';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { ServiceHistory, Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Analytics from '../services/analyticsService';

interface HistoryScreenProps {
  navigation?: any;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { t, language } = useLanguage();
  const { isGuest, promptToLogin } = useAuth();
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceHistory | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [userCurrency, setUserCurrency] = useState<string>('UAH');
  const [expenseTypes, setExpenseTypes] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    expense_type_id: '' as string,
    description: '',
    cost: '',
    service_date: '',
    station_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    totalSpent: 0,
    thisMonth: 0,
    thisYear: 0,
  });

  useEffect(() => {
    loadData(1);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(currentPage + 1, true);
    }
  };

  // Fetch expense types independently of user/profile
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        const types = await ApiService.getExpenseTypes(language);
        setExpenseTypes(types.map((et: any) => ({ id: et.id, slug: et.slug, name: et.name })));
      } catch (e) {
        console.warn('Failed to load expense types, UI will degrade to defaults');
      }
    };
    fetchExpenseTypes();
  }, [language]);

  const loadData = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Get current user first
      const user = await ApiService.getProfile();
      setUserCurrency(user.currency || 'UAH');
      
      const [historyResponse, vehiclesData, statisticsData] = await Promise.all([
        ApiService.getServiceHistory(undefined, page, 20),
        ApiService.getVehicles(),
        page === 1 ? ApiService.getExpensesStatistics(user.id) : Promise.resolve({}),
      ]);
      
      if (page === 1) {
        setHistory(historyResponse.data);
        setVehicles(vehiclesData);
        
        // Use server statistics instead of local calculation
        setStats({
          totalSpent: statisticsData.total_expenses || 0,
          thisMonth: getCurrentMonthExpenses(statisticsData.monthly_expenses || []),
          thisYear: statisticsData.total_expenses || 0, // Total for the year
        });
        
        if (vehiclesData.length > 0) {
          setSelectedVehicle(vehiclesData[0].id);
        }
      } else {
        setHistory(prev => [...prev, ...historyResponse.data]);
      }
      
      setCurrentPage(page);
      setHasMore(historyResponse.pagination.has_more);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('history.error'), t('history.failedToLoadData'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getCurrentMonthExpenses = (monthlyExpenses: any[]): number => {
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    
    const currentMonthData = monthlyExpenses.find(expense => expense.month === currentMonth);
    return currentMonthData ? currentMonthData.total_cost : 0;
  };


  const calculateStats = (historyData: ServiceHistory[]) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const totalSpent = historyData.reduce((sum, record) => sum + record.cost, 0);
    
    const thisMonthRecords = historyData.filter(record => {
      const recordDate = new Date(record.service_date);
      return recordDate.getMonth() === thisMonth && recordDate.getFullYear() === thisYear;
    });
    
    const thisYearRecords = historyData.filter(record => {
      const recordDate = new Date(record.service_date);
      return recordDate.getFullYear() === thisYear;
    });

    setStats({
      totalSpent,
      thisMonth: thisMonthRecords.reduce((sum, record) => sum + record.cost, 0),
      thisYear: thisYearRecords.reduce((sum, record) => sum + record.cost, 0),
    });
  };

  const handleAddRecord = () => {
    // Проверка на гостевой режим
    if (isGuest) {
      console.log('👤 Guest trying to add record, showing login prompt');
      promptToLogin();
      return;
    }
    
    setEditingRecord(null);
    setFormData({
      vehicle_id: selectedVehicle?.toString() || '',
      expense_type_id: expenseTypes[0]?.id ? String(expenseTypes[0].id) : '',
      description: '',
      cost: '',
      service_date: new Date().toISOString().split('T')[0], // Today's date
      station_name: '',
    });
    setErrors({});
    setShowAddModal(true);
  };

  const handleEditRecord = (record: ServiceHistory) => {
    setEditingRecord(record);
    setFormData({
      vehicle_id: record.vehicle_id.toString(),
      expense_type_id: (record as any).expense_type_id ? String((record as any).expense_type_id) : '',
      description: record.description,
      cost: record.cost.toString(),
      service_date: record.service_date.split('T')[0],
      station_name: record.station_name || '',
    });
    setErrors({});
    setShowAddModal(true);
  };

  const handleDeleteRecord = async (recordId: number) => {
    Alert.alert(
      t('history.deleteRecord'),
      t('history.deleteRecordConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteServiceRecord(recordId);
              await Analytics.track('history_delete', { record_id: recordId });
              await loadData();
            } catch (error) {
              Alert.alert(t('history.error'), t('history.failedToDeleteRecord'));
            }
          },
        },
      ]
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicle_id) {
      newErrors.vehicle_id = t('history.selectVehicleRequired');
    }

    if (!formData.cost) {
      newErrors.cost = t('history.costRequired');
    } else if (isNaN(Number(formData.cost))) {
      newErrors.cost = t('history.costMustBeNumber');
    }

    if (!formData.service_date) {
      newErrors.service_date = t('history.serviceDateRequired');
    }

    if (!formData.expense_type_id) {
      newErrors.expense_type_id = t('history.recordType');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const recordData = {
        vehicle_id: parseInt(formData.vehicle_id),
        expense_type_id: parseInt(formData.expense_type_id),
        description: formData.description,
        cost: parseFloat(formData.cost),
        service_date: formData.service_date,
        station_name: formData.station_name || undefined,
      };

      if (editingRecord) {
        await ApiService.updateServiceRecord(editingRecord.id, recordData);
        await Analytics.track('history_edit', {
          vehicle_id: recordData.vehicle_id,
          expense_type_id: recordData.expense_type_id,
          cost: recordData.cost,
        });
      } else {
        await ApiService.addServiceRecord(recordData);
        await Analytics.track('history_add', {
          vehicle_id: recordData.vehicle_id,
          expense_type_id: recordData.expense_type_id,
          cost: recordData.cost,
        });
      }

      setShowAddModal(false);
      await loadData();
    } catch (error: any) {
      await Analytics.track('history_edit', { error: true });
      Alert.alert(t('history.error'), error.message || t('history.failedToSaveRecord'));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    const currencyMap: { [key: string]: string } = {
      'UAH': 'uk-UA',
      'USD': 'en-US',
      'EUR': 'de-DE',
      'RUB': 'ru-RU',
    };
    
    const locale = currencyMap[userCurrency] || 'uk-UA';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: userCurrency,
    }).format(amount);
  };

  // Removed emoji icon map to comply with project UI policy (no emojis)

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item: record }) => {
            const vehicle = vehicles.find(v => v.id === record.vehicle_id);
            
            return (
              <Card style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordDescription} numberOfLines={2} ellipsizeMode="tail">{record.description}</Text>
                    <Text style={styles.recordVehicle}>
                      {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : t('history.unknownVehicle')}
                    </Text>
                    <Text style={styles.recordDate}>
                      {formatDate(record.service_date)}
                    </Text>
                  </View>
                  <View style={styles.recordActions}>
                    <TouchableOpacity
                      onPress={() => handleEditRecord(record)}
                      style={styles.actionButton}
                    >
                      <Icon name="edit" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRecord(record.id)}
                      style={styles.actionButton}
                    >
                      <Icon name="delete" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.recordFooter}>
                    <Text
                      style={styles.recordType}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {t('history.recordType')}: {expenseTypes.find(et => et.id === record.expense_type_id)?.name || t('history.other')}
                    </Text>
                    <Text style={styles.recordCost}>{formatCurrency(record.cost)}</Text>
                  </View>
              </Card>
            );
          }}
          ListHeaderComponent={() => (
            <>
              <View style={styles.topActions}>
                <Button title={t('history.addRecord')} onPress={handleAddRecord} />
                <Button 
                  title={t('actions.statistics')} 
                  onPress={() => navigation?.navigate('Reports')} 
                  style={styles.statisticsButton}
                />
              </View>
              <View style={styles.statsContainer}>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
                  <Text style={styles.statLabel}>{t('history.totalSpent')}</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{formatCurrency(stats.thisYear)}</Text>
                  <Text style={styles.statLabel}>{t('history.thisYear')}</Text>
                </Card>
              </View>

            </>
          )}
          ListEmptyComponent={() => (
            <Card style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>{t('history.noRecords')}</Text>
              <Text style={styles.emptyStateText}>
                {t('history.noRecordsText')}
              </Text>
              <Button
                title={t('history.addRecord')}
                onPress={handleAddRecord}
                style={styles.addRecordButton}
              />
            </Card>
          )}
          ListFooterComponent={() => (
            loadingMore ? (
              <View style={styles.loadingMore}>
                <LoadingSpinner />
                <Text style={styles.loadingMoreText}>{t('common.loading')}</Text>
              </View>
            ) : !hasMore && history.length > 0 ? (
              <View style={styles.noMoreData}>
                <Text style={styles.noMoreDataText}>{t('history.noMoreRecords')}</Text>
              </View>
            ) : null
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        />
      </KeyboardAvoidingView>

      <FormModal
        visible={showAddModal}
        title={editingRecord ? t('history.editRecord') : t('history.addRecord')}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmit}
        cancelLabel={t('common.cancel')}
        submitLabel={t('history.save')}
      >
            
            <View style={styles.typeSelector}>
              <Text style={styles.typeLabel}>{t('history.recordType')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeOptionsContainer}>
                <View style={styles.typeOptions}>
                  {expenseTypes.map((et) => ({ key: String(et.id), title: et.name })).map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeOption,
                        (formData as any).expense_type_id === type.key && styles.typeOptionActive
                      ]}
                      onPress={() => handleInputChange('expense_type_id', type.key)}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        (formData as any).expense_type_id === type.key && styles.typeOptionTextActive
                      ]}>
                        {type.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.vehicleSelector}>
              <Text style={styles.vehicleLabel}>{t('history.vehicle')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {vehicles.map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      styles.vehicleOption,
                      formData.vehicle_id === vehicle.id.toString() && styles.vehicleOptionActive
                    ]}
                    onPress={() => handleInputChange('vehicle_id', vehicle.id.toString())}
                  >
                    <Text style={[
                      styles.vehicleOptionText,
                      formData.vehicle_id === vehicle.id.toString() && styles.vehicleOptionTextActive
                    ]}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {errors.vehicle_id && <Text style={styles.errorText}>{errors.vehicle_id}</Text>}
            </View>


            <Input
              label={t('history.description')}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder={t('history.description')}
              multiline
              numberOfLines={3}
            />

            <Input
              label={t('history.cost')}
              value={formData.cost}
              onChangeText={(value) => handleInputChange('cost', value)}
              error={errors.cost}
              keyboardType="numeric"
              placeholder="0"
            />


            <DateInput
              label={t('history.serviceDate')}
              value={formData.service_date}
              onDateChange={(date) => handleInputChange('service_date', date)}
              placeholder="YYYY-MM-DD"
              error={errors.service_date}
              maximumDate={new Date()}
            />

            <Input
              label={t('history.stationName')}
              value={formData.station_name}
              onChangeText={(value) => handleInputChange('station_name', value)}
              placeholder={t('history.stationName')}
            />
      </FormModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  addButtonText: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: 'bold',
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
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  topActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  statisticsButton: {
    flex: 1,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
  addRecordButton: {
    width: '100%',
  },
  loadingMore: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  noMoreData: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  noMoreDataText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  recordCard: {
    // Slightly more compact cards and spacing between them
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    padding: SPACING.sm,
  },
  recordDetails: {
    marginTop: SPACING.lg
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  recordVehicle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  recordActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  actionButtonText: {
    fontSize: 16,
  },
  recordContent: {
  },
  recordType: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
    color: COLORS.text,
  },
  recordTypeIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  recordTypeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recordDescription: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 16,
  },
  recordStation: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  recordCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconOnlyButton: {
    padding: SPACING.sm,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSaveText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  modalActionsBottom: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  typeSelector: {
    marginBottom: SPACING.lg,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  typeOptionsContainer: {
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  typeOptions: {
    flexDirection: 'row',
  },
  typeOption: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 100,
  },
  typeOptionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  typeOptionIcon: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  typeOptionText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  typeOptionTextActive: {
    color: COLORS.background,
    fontWeight: '500',
  },
  vehicleSelector: {
    marginBottom: SPACING.lg,
  },
  vehicleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  vehicleOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vehicleOptionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  vehicleOptionText: {
    fontSize: 12,
    color: COLORS.text,
  },
  vehicleOptionTextActive: {
    color: COLORS.background,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  modalKeyboardAvoidingView: {
    flex: 1,
  },
});

export default HistoryScreen;
