import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import Card from '../components/Card';
import Icon from '../components/Icon';
import AnimatedView from '../components/AnimatedView';
import { COLORS, FONTS, SPACING } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import PdfExportService from '../services/pdfExportService';
import Analytics from '../services/analyticsService';
import { Vehicle, ServiceHistory } from '../types';
import { Checkbox } from 'expo-checkbox';

interface ExportScreenProps {
  navigation: any;
  route?: any;
}

const ExportScreen: React.FC<ExportScreenProps> = ({ navigation }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([]); // выбранные ID авто
  const [expenseTypes, setExpenseTypes] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    thisMonth: 0,
    thisYear: 0,
  });
  
  const screenWidth = Dimensions.get('window').width;

  const isPro = user?.plan_type === 'pro' || user?.plan_type === 'premium';

  const formatCurrency = (amount: number): string => {
    // Проверяем на NaN и Infinity
    if (isNaN(amount) || !isFinite(amount)) {
      amount = 0;
    }
    
    const currency = user?.currency || 'UAH';
    
    return new Intl.NumberFormat(language === 'uk' ? 'uk-UA' : language === 'en' ? 'en-US' : 'ru-RU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      const [historyResponse, vehiclesData, statisticsData, expenseTypesData] = await Promise.all([
        ApiService.getServiceHistory(),
        ApiService.getVehicles(),
        ApiService.getExpensesStatistics(user.id),
        ApiService.getExpenseTypes(language),
      ]);
      
      setHistory(historyResponse.data || []);
      setVehicles(vehiclesData || []);
      setExpenseTypes(expenseTypesData || []);
      setStats({
        totalSpent: statisticsData.total_expenses || 0,
        thisMonth: statisticsData.monthly_expenses?.[statisticsData.monthly_expenses.length - 1]?.total_cost || 0,
        thisYear: statisticsData.total_expenses || 0,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('common.errorLoading') || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, language]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 1000);
  }, [user?.id]);

  // Фильтруем историю по выбранным авто
  const getFilteredHistory = () => {
    if (selectedVehicles.length === 0) {
      return [];
    }
    return history.filter(record => selectedVehicles.includes(record.vehicle_id));
  };

  // Рассчитываем статистику для выбранных авто
  const getFilteredStats = () => {
    const filteredHistory = getFilteredHistory();
    const totalSpent = filteredHistory.reduce((sum, record) => {
      const cost = Number(record.cost || record.amount || 0);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const thisMonth = filteredHistory
      .filter(record => new Date(record.service_date) >= startOfMonth)
      .reduce((sum, record) => {
        const cost = Number(record.cost || record.amount || 0);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);
    
    const thisYear = filteredHistory
      .filter(record => new Date(record.service_date) >= startOfYear)
      .reduce((sum, record) => {
        const cost = Number(record.cost || record.amount || 0);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);
    
    return {
      totalSpent,
      thisMonth,
      thisYear,
    };
  };

  const handleVehicleToggle = (vehicleId: number) => {
    setSelectedVehicles(prev => {
      if (prev.includes(vehicleId)) {
        return prev.filter(id => id !== vehicleId);
      } else {
        return [...prev, vehicleId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedVehicles.length === vehicles.length) {
      setSelectedVehicles([]);
    } else {
      setSelectedVehicles(vehicles.map(v => v.id));
    }
  };

  const handleExport = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('auth.authRequired') || 'Необходима авторизация');
      return;
    }

    if (selectedVehicles.length === 0) {
      Alert.alert(t('common.error'), t('export.selectAtLeastOne'));
      return;
    }

    try {
      const filteredHistory = getFilteredHistory();
      const filteredStats = getFilteredStats();
      
      // Фильтруем авто для отображения в PDF
      const selectedVehiclesList = vehicles.filter(v => selectedVehicles.includes(v.id));

      // Генерируем PDF
      const pdfUri = await PdfExportService.exportToPdf({
        history: filteredHistory,
        vehicles: selectedVehiclesList,
        expenseTypes: expenseTypes,
        stats: filteredStats,
        currency: user.currency || 'UAH',
        language,
        t,
      });

      // Открываем диалог для сохранения/отправки
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: t('history.exportPdf') || 'Экспорт отчета',
        });
      } else {
        Alert.alert(
          t('common.success'),
          t('history.pdfExported') || 'PDF экспортирован'
        );
      }

      await Analytics.track('pdf_export' as any, {
        record_count: filteredHistory.length,
        total_expenses: filteredStats.totalSpent,
        vehicles_count: selectedVehicles.length,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      Alert.alert(
        t('common.error'),
        t('history.pdfExportFailed') || 'Не удалось экспортировать PDF'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left','right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.content}>
          {/* Выбор всех */}
          <TouchableOpacity
            style={styles.selectAllContainer}
            onPress={handleSelectAll}
            activeOpacity={0.7}
          >
            <View style={styles.checkboxContainer}>
              <Checkbox
                value={selectedVehicles.length === vehicles.length && vehicles.length > 0}
                onValueChange={handleSelectAll}
                color={COLORS.accent}
              />
              <Text style={styles.selectAllText}>
                {selectedVehicles.length === vehicles.length 
                  ? t('export.deselectAll') 
                  : t('export.selectAll')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Список авто */}
          <View style={styles.vehiclesList}>
            {vehicles.map((vehicle, index) => (
              <AnimatedView
                key={vehicle.id}
                animation="slideInUp"
                delay={index * 50}
                duration={300}
              >
                <TouchableOpacity
                  style={styles.vehicleItem}
                  onPress={() => handleVehicleToggle(vehicle.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.vehicleLeft}>
                    <Checkbox
                      value={selectedVehicles.includes(vehicle.id)}
                      onValueChange={() => handleVehicleToggle(vehicle.id)}
                      color={COLORS.accent}
                    />
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleTitle}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </Text>
                      <Text style={styles.vehicleSubtitle}>
                        {history.filter(h => h.vehicle_id === vehicle.id).length} {t('export.records')}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </View>

          {/* Статистика */}
          {selectedVehicles.length > 0 && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>{t('export.statsForSelected')}</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {formatCurrency(getFilteredStats().totalSpent)}
                  </Text>
                  <Text style={styles.statLabel}>{t('history.totalSpent')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {formatCurrency(getFilteredStats().thisMonth)}
                  </Text>
                  <Text style={styles.statLabel}>{t('history.thisMonth')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Кнопка экспорта */}
          <TouchableOpacity
            style={[
              styles.exportButton,
              selectedVehicles.length === 0 && styles.exportButtonDisabled
            ]}
            onPress={handleExport}
            disabled={selectedVehicles.length === 0}
            activeOpacity={0.7}
          >
            <Icon name="file" size={24} color="white" />
            <Text style={styles.exportButtonText}>
              {t('actions.pdfExport') || 'Экспорт в PDF'}
            </Text>
          </TouchableOpacity>
        </View>
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
  content: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  selectAllContainer: {
    marginBottom: SPACING.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  vehiclesList: {
    marginBottom: SPACING.xl,
  },
  vehicleItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  exportButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exportButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
});

export default ExportScreen;

