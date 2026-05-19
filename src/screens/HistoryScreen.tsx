import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import FormModal from '../components/FormModal';
import ExpenseModal from '../components/ExpenseModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import DateInput from '../components/DateInput';
import { Fuel, Wrench, Shield, MoreHorizontal } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BASE_URL, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { ServiceHistory, Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Analytics from '../services/analyticsService';
import PdfExportService from '../services/pdfExportService';

interface HistoryScreenProps {
  navigation?: any;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { t, language } = useLanguage();
  const { isGuest, promptToLogin, user, refreshUser } = useAuth();
  const { appearanceKey } = useTheme();
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceHistory | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [filterVehicleId, setFilterVehicleId] = useState<number | 'all'>('all');
  const [userCurrency, setUserCurrency] = useState<string>('UAH');
  const [expenseTypes, setExpenseTypes] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    expense_type_id: '' as string,
    description: '',
    cost: '',
    service_date: '',
  });
  const [receiptPhoto, setReceiptPhoto] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewingRecord, setViewingRecord] = useState<ServiceHistory | null>(null);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);
  const [loadingReceiptPhoto, setLoadingReceiptPhoto] = useState(false);
  
  // Вычисляем isPro на основе user.plan_type (вместо отдельного состояния)
  const isPro = user?.plan_type === 'pro' || user?.plan_type === 'premium';
  const [stats, setStats] = useState({
    totalSpent: 0,
    thisMonth: 0,
    thisYear: 0,
  });

  useEffect(() => {
    // Показываем экран сразу, данные загружаем в фоне
    setLoading(false);
    if (user?.id) {
      loadData(1);
    } else if (isGuest) {
      // Для гостевого режима показываем пустой экран без загрузки
    } else {
      // Если пользователь не загружен, пытаемся обновить данные
      refreshUser().then(() => {
        if (user?.id) {
          loadData(1);
        }
      });
    }
  }, [user?.id, isGuest]);

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
      // Не устанавливаем loading=true для первой страницы, чтобы экран уже был виден
      if (page !== 1) {
        setLoadingMore(true);
      }
      
      // Используем user из контекста
      if (!user?.id) {
        console.log('User not loaded yet');
        setLoading(false);
        return;
      }
      
      setUserCurrency(user.currency || 'UAH');
      console.log('📋 User plan:', user.plan_type);
      
      const [historyResponse, vehiclesData, statisticsData] = await Promise.all([
        ApiService.getServiceHistory(undefined, page, 20),
        ApiService.getVehicles(),
        page === 1 ? ApiService.getExpensesStatistics(user.id) : Promise.resolve({}),
      ]);
      
      if (page === 1) {
        console.log('Loaded history data:', historyResponse.data);
        setHistory(historyResponse.data);
        setVehicles(vehiclesData);
        
        // Use server statistics instead of local calculation
        setStats({
          totalSpent: statisticsData.total_expenses || 0,
          thisMonth: getCurrentMonthExpenses(statisticsData.monthly_expenses || []),
          thisYear: statisticsData.total_expenses || 0, // Total for the year
        });
        
        if (vehiclesData.length > 0) {
          setSelectedVehicle((prev) => (prev != null ? prev : vehiclesData[0].id));
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

  const handleAddRecord = useCallback(async () => {
    if (isGuest) {
      console.log('👤 Guest trying to add record, showing login prompt');
      promptToLogin();
      return;
    }

    await refreshUser();

    setEditingRecord(null);
    const vid =
      filterVehicleId !== 'all'
        ? filterVehicleId
        : selectedVehicle ?? vehicles[0]?.id ?? null;
    setFormData({
      vehicle_id: vid != null ? String(vid) : '',
      expense_type_id: expenseTypes[0]?.id ? String(expenseTypes[0].id) : '',
      description: '',
      cost: '',
      service_date: new Date().toISOString().split('T')[0],
    });
    setErrors({});
    setShowAddModal(true);
  }, [
    isGuest,
    promptToLogin,
    refreshUser,
    filterVehicleId,
    selectedVehicle,
    vehicles,
    expenseTypes,
  ]);

  const handleEditRecord = async (record: ServiceHistory) => {
    // Обновляем данные пользователя перед открытием модалки
    await refreshUser();
    
    console.log('Editing record:', record);
    console.log('Receipt photo:', record.receipt_photo);
    setEditingRecord(record);
    setFormData({
      vehicle_id: record.vehicle_id.toString(),
      expense_type_id: (record as any).expense_type_id ? String((record as any).expense_type_id) : '',
      description: record.description,
      cost: record.cost.toString(),
      service_date: record.service_date.split('T')[0]
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

  const handleSubmit = async (formData: any, receiptPhoto?: any) => {
    const recordData = {
      vehicle_id: parseInt(formData.vehicle_id),
      expense_type_id: parseInt(formData.expense_type_id),
      description: formData.description,
      cost: parseFloat(formData.cost),
      service_date: formData.service_date,
    };

    if (editingRecord) {
      // Если это существующее фото (не файл), не передаем его в API
      const photoToSend = receiptPhoto?.isExisting ? undefined : receiptPhoto;
      console.log('Updating record with photo:', { receiptPhoto, photoToSend, isExisting: receiptPhoto?.isExisting });
      try {
        await ApiService.updateServiceRecord(editingRecord.id, recordData, photoToSend);
      } catch (error) {
        console.error('Error updating service record:', error);
        throw error;
      }
      await Analytics.track('history_edit', {
        vehicle_id: recordData.vehicle_id,
        expense_type_id: recordData.expense_type_id,
        cost: recordData.cost,
        has_receipt: !!receiptPhoto,
      });
    } else {
      console.log('Creating new record with photo:', { receiptPhoto, hasPhoto: !!receiptPhoto });
      await ApiService.addServiceRecord(recordData, receiptPhoto);
      await Analytics.track('history_add', {
        vehicle_id: recordData.vehicle_id,
        expense_type_id: recordData.expense_type_id,
        cost: recordData.cost,
        has_receipt: !!receiptPhoto,
      });
    }

    setShowAddModal(false);
    await loadData();
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

  const displayedHistory = useMemo(() => {
    if (filterVehicleId === 'all') return history;
    return history.filter((r) => r.vehicle_id === filterVehicleId);
  }, [history, filterVehicleId]);

  const modalVehicleId =
    filterVehicleId !== 'all'
      ? filterVehicleId
      : selectedVehicle ?? vehicles[0]?.id ?? null;

  const getExpenseSlug = (record: ServiceHistory): string => {
    if (record.expense_type_id) {
      const et = expenseTypes.find((e) => e.id === record.expense_type_id);
      if (et?.slug) return et.slug;
    }
    const raw = (record as any).type;
    return typeof raw === 'string' ? raw : 'other';
  };

  const chromeStyles = useMemo(() => {
    return StyleSheet.create({
      chipsScroll: {
        marginBottom: SPACING.sm,
        flexGrow: 0,
      },
      chipsScrollContent: {
        paddingRight: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
      },
      chip: {
        marginRight: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
      },
      chipActive: {
        borderColor: COLORS.accent,
        backgroundColor: hexToRgba(COLORS.accent, 0.12),
      },
      chipText: {
        fontFamily: FONTS.medium,
        fontSize: 12,
        color: COLORS.textSecondary,
      },
      chipTextActive: {
        color: COLORS.accent,
        fontFamily: FONTS.semiBold,
      },
      recordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
      },
      iconBubble: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: hexToRgba(COLORS.text, 0.06),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
      },
      recordMeta: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
      },
      recordTitleMock: {
        fontFamily: FONTS.semiBold,
        fontSize: 14,
        color: COLORS.text,
      },
      recordCostMock: {
        fontFamily: FONTS.bold,
        fontSize: 14,
        letterSpacing: -0.2,
        color: COLORS.text,
        marginLeft: SPACING.sm,
      },
    });
  }, [appearanceKey]);

  const styles = useMemo(() => createHistoryScreenStyles(), [appearanceKey]);

  useLayoutEffect(() => {
    navigation?.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => void handleAddRecord()}
          style={{ paddingHorizontal: SPACING.md }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('history.addRecord')}
        >
          <Icon name="add" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, t, handleAddRecord, appearanceKey]);

  // Функция для попытки загрузки фото с разными URL
  const tryLoadImage = async (photoPath: string, recordId?: number): Promise<string | null> => {
    // Если это уже полный URL, используем его
    if (photoPath.startsWith('http')) {
      return photoPath;
    }

    // Сначала попробуем через новый API эндпоинт для чеков
    if (recordId) {
      const apiUrl = `${BASE_URL}/api/expenses/${recordId}/receipt`;
      
      try {
        const response = await fetch(apiUrl, { method: 'HEAD' });
        if (response.ok) {
          return apiUrl;
        }
      } catch (error) {
        // Silent fail
      }
    }

    const baseUrls = [
      `${BASE_URL}/storage/`,  // Основной домен (через симлинк)
      `${BASE_URL}/api/storage/`,  // API эндпоинт для фото
      `${BASE_URL}/public/storage/`,  // Через public/storage
      `${BASE_URL}/www/storage/app/public/`,  // Прямой путь
      'https://mygarage.app/storage/'   // Альтернативный домен (fallback)
    ];

    // Попробуем все URL по очереди
    for (let i = 0; i < baseUrls.length; i++) {
      const testUrl = baseUrls[i] + photoPath;
      
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (response.ok) {
          return testUrl;
        }
      } catch (error) {
        // Продолжаем пробовать следующий URL
        continue;
      }
    }

    // Если ничего не сработало, возвращаем null
    return null;
  };

  // Загрузка фото чека при открытии окна просмотра
  useEffect(() => {
    if (viewingRecord && (viewingRecord as any).receipt_photo) {
      setLoadingReceiptPhoto(true);
      setReceiptPhotoUrl(null);
      
      const loadPhoto = async () => {
        const photoPath = (viewingRecord as any).receipt_photo;
        let workingUrl: string | null = null;
        
        if (photoPath.startsWith('http')) {
          workingUrl = photoPath;
        } else {
          workingUrl = await tryLoadImage(photoPath, viewingRecord.id);
        }
        
        setReceiptPhotoUrl(workingUrl);
        setLoadingReceiptPhoto(false);
      };
      
      loadPhoto();
    } else {
      setReceiptPhotoUrl(null);
      setLoadingReceiptPhoto(false);
    }
  }, [viewingRecord]);

  const handleExportToPdf = async () => {
    try {
      const user = await ApiService.getProfile();
      const isPro = user?.plan_type === 'pro' || user?.plan_type === 'premium';
      
      if (!isPro) {
        Alert.alert(
          t('subscription.proFeature') || 'Функция PRO',
          t('subscription.pdfExportRequiresPro') || 'Экспорт в PDF доступен только для PRO подписчиков',
          [
            { text: t('common.cancel') || 'Отмена', style: 'cancel' },
            {
              text: t('subscription.upgrade') || 'Обновить',
              onPress: () => navigation?.navigate('Subscription'),
            },
          ]
        );
        return;
      }

      // Генерируем PDF
      const pdfUri = await PdfExportService.exportToPdf({
        history,
        vehicles,
        stats,
        currency: userCurrency,
        language,
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
          t('history.pdfExported') || `PDF сохранен: ${pdfUri}`
        );
      }

      await Analytics.track('pdf_export', {
        record_count: history.length,
        total_expenses: stats.totalSpent,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      Alert.alert(
        t('common.error'),
        t('history.pdfExportFailed') || 'Не удалось экспортировать PDF'
      );
    }
  };

  // Removed emoji icon map to comply with project UI policy (no emojis)

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading && history.length === 0 && (
          <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        )}
        <FlatList
            data={displayedHistory}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: record }) => {
              const slug = getExpenseSlug(record);
              const s = slug.toLowerCase();
              const MetaIcon =
                s === 'fuel'
                  ? Fuel
                  : s === 'repair' || s === 'maintenance' || s === 'service'
                    ? Wrench
                    : s === 'insurance'
                      ? Shield
                      : MoreHorizontal;
              const typeName =
                expenseTypes.find((et) => et.id === record.expense_type_id)?.name || t('history.other');
              return (
                <TouchableOpacity
                  style={chromeStyles.recordRow}
                  activeOpacity={0.85}
                  onPress={() => setViewingRecord(record)}
                >
                  <View style={chromeStyles.iconBubble}>
                    <MetaIcon size={18} color={COLORS.accent} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={chromeStyles.recordTitleMock} numberOfLines={1}>
                      {record.description || typeName}
                    </Text>
                    <Text style={chromeStyles.recordMeta} numberOfLines={1}>
                      {typeName} · {formatDate(record.service_date)}
                    </Text>
                  </View>
                  <Text style={chromeStyles.recordCostMock}>{formatCurrency(record.cost)}</Text>
                </TouchableOpacity>
              );
            }}
            ListHeaderComponent={() => (
              <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={chromeStyles.chipsScroll}
                  contentContainerStyle={chromeStyles.chipsScrollContent}
                >
                  <TouchableOpacity
                    style={[chromeStyles.chip, filterVehicleId === 'all' && chromeStyles.chipActive]}
                    onPress={() => setFilterVehicleId('all')}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        chromeStyles.chipText,
                        filterVehicleId === 'all' && chromeStyles.chipTextActive,
                      ]}
                    >
                      {t('history.allVehicles')}
                    </Text>
                  </TouchableOpacity>
                  {vehicles.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[chromeStyles.chip, filterVehicleId === v.id && chromeStyles.chipActive]}
                      onPress={() => {
                        setFilterVehicleId(v.id);
                        setSelectedVehicle(v.id);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          chromeStyles.chipText,
                          filterVehicleId === v.id && chromeStyles.chipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {`${v.make} ${v.model}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            ListEmptyComponent={() => (
              <Card style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>
                  {history.length > 0 && displayedHistory.length === 0
                    ? t('history.noRecordsForFilter')
                    : t('history.noRecords')}
                </Text>
                <Text style={styles.emptyStateText}>
                  {history.length > 0 && displayedHistory.length === 0
                    ? t('history.tryAnotherVehicle')
                    : t('history.noRecordsText')}
                </Text>
                {history.length === 0 ? (
                  <Button
                    title={t('history.addRecord')}
                    onPress={handleAddRecord}
                    style={styles.addRecordButton}
                    size="small"
                  />
                ) : null}
              </Card>
            )}
            ListFooterComponent={() =>
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
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          />
      </KeyboardAvoidingView>

      <ExpenseModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingRecord(null);
        }}
        onSubmit={handleSubmit}
        editingRecord={editingRecord}
        vehicles={vehicles}
        expenseTypes={expenseTypes}
        initialVehicleId={modalVehicleId}
        userCurrency={userCurrency}
        isPro={isPro}
      />

      {/* Record View Modal — стиль design-new: шапка как PageHeader, панель surface rounded-2xl */}
      <Modal
        visible={!!viewingRecord}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingRecord(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
          {viewingRecord ? (
            <>
              <View style={styles.detailModalHeader}>
                <View style={styles.detailModalHeaderText}>
                  <Text style={styles.detailModalEyebrow}>{t('history.journalEyebrow')}</Text>
                  <Text style={styles.detailModalHeadline} numberOfLines={3}>
                    {(viewingRecord.description || '').trim() ||
                      expenseTypes.find((et) => et.id === viewingRecord.expense_type_id)?.name ||
                      t('history.detailTitle')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setViewingRecord(null)}
                  style={styles.detailModalClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close') || 'Close'}
                >
                  <Icon name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={styles.detailScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  const typeName =
                    expenseTypes.find((et) => et.id === viewingRecord.expense_type_id)?.name ||
                    t('history.other');
                  const v = vehicles.find((x) => x.id === viewingRecord.vehicle_id);
                  const vehicleLine = v
                    ? `${v.year} ${v.make} ${v.model}`
                    : t('history.unknownVehicle');

                  return (
                    <>
                      <View style={styles.detailSheetPanel}>
                        <View style={styles.detailHero}>
                          <Text style={styles.detailHeroLabel}>{t('history.cost')}</Text>
                          <Text style={styles.detailHeroAmount}>
                            {formatCurrency(viewingRecord.cost)}
                          </Text>
                          <Text style={styles.detailHeroMeta}>
                            {typeName} · {formatDate(viewingRecord.service_date)}
                          </Text>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailField}>
                          <Text style={styles.detailFieldLabel}>{t('history.description')}</Text>
                          <Text style={styles.detailFieldValue}>
                            {(viewingRecord.description || '').trim() || '—'}
                          </Text>
                        </View>

                        <View style={styles.detailField}>
                          <Text style={styles.detailFieldLabel}>{t('history.vehicle')}</Text>
                          <Text style={styles.detailFieldValue}>{vehicleLine}</Text>
                        </View>

                        {(viewingRecord as any).receipt_photo ? (
                          <View style={[styles.detailField, styles.detailFieldReceipt]}>
                            <Text style={styles.detailFieldLabel}>{t('expenseModal.receiptPhoto')}</Text>
                            {loadingReceiptPhoto ? (
                              <View style={styles.receiptPhotoLoading}>
                                <ActivityIndicator size="small" color={COLORS.accent} />
                                <Text style={styles.receiptPhotoLoadingText}>
                                  {t('common.loading') || 'Загрузка...'}
                                </Text>
                              </View>
                            ) : receiptPhotoUrl ? (
                              <Image
                                source={{ uri: receiptPhotoUrl }}
                                style={styles.viewRecordImage}
                                resizeMode="contain"
                                onError={() => {
                                  console.error('Failed to load receipt photo:', receiptPhotoUrl);
                                  setReceiptPhotoUrl(null);
                                }}
                              />
                            ) : (
                              <View style={styles.receiptPhotoError}>
                                <Icon name="alert-circle" size={22} color={COLORS.textMuted} />
                                <Text style={styles.receiptPhotoErrorText}>
                                  {t('expenseModal.photoLoadError') || 'Не удалось загрузить фото'}
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.modalActionsBottom}>
                        <Button
                          title={t('common.edit')}
                          onPress={() => {
                            setViewingRecord(null);
                            handleEditRecord(viewingRecord);
                          }}
                          variant="secondary"
                          icon="edit"
                          style={styles.modalEditButton}
                        />
                        <Button
                          title={t('common.delete')}
                          onPress={() => {
                            setViewingRecord(null);
                            handleDeleteRecord(viewingRecord.id);
                          }}
                          variant="destructive"
                          icon="delete"
                          style={styles.modalDeleteButton}
                        />
                      </View>
                    </>
                  );
                })()}
              </ScrollView>
            </>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

function createHistoryScreenStyles() {
  return StyleSheet.create({
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
    backgroundColor: COLORS.background,
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
    flexWrap: 'wrap',
  },
  statisticsButton: {
    flex: 1,
  },
  exportButton: {
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
    flex: 1,
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
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailModalHeaderText: {
    flex: 1,
    paddingRight: SPACING.md,
    minWidth: 0,
  },
  detailModalEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  detailModalHeadline: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 26,
    color: COLORS.text,
  },
  detailModalClose: {
    padding: SPACING.xs,
    marginTop: 2,
    borderRadius: RADIUS.sm,
  },
  modalContent: {
    flex: 1,
  },
  detailScrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  detailSheetPanel: {
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
  },
  detailHero: {
    marginBottom: SPACING.xs,
  },
  detailHeroLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  detailHeroAmount: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    letterSpacing: -0.6,
    color: COLORS.text,
  },
  detailHeroMeta: {
    marginTop: SPACING.sm,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  detailField: {
    marginBottom: SPACING.md,
  },
  detailFieldReceipt: {
    marginBottom: 0,
  },
  detailFieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  detailFieldValue: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  viewRecordImage: {
    width: '100%',
    height: 280,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    backgroundColor: hexToRgba(COLORS.text, 0.04),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptPhotoLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: hexToRgba(COLORS.text, 0.04),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptPhotoLoadingText: {
    marginLeft: SPACING.sm,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  receiptPhotoError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: hexToRgba(COLORS.text, 0.04),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptPhotoErrorText: {
    marginLeft: SPACING.sm,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  modalActionsBottom: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  modalEditButton: {
    alignSelf: 'stretch',
    width: '100%',
  },
  modalDeleteButton: {
    alignSelf: 'stretch',
    width: '100%',
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
}

export default HistoryScreen;
