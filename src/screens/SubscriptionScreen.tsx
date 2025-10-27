import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface Subscription {
  id: number;
  name: string;
  display_name: string;
  price: number;
  duration_days: number;
  features: string[];
  max_vehicles: number;
  max_reminders: number | null;
  is_active: boolean;
}

interface SubscriptionScreenProps {
  onBack: () => void;
  navigation?: any;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack, navigation }) => {
  const { t } = useLanguage();
  const { user, refreshUser, isGuest } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptions();
    } else if (isGuest) {
      // Для гостевого режима показываем пустой экран без загрузки
      setLoading(false);
    }
  }, [user?.id, isGuest, user?.plan_type]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      
      const subs = await ApiService.getSubscriptions();
      
      // Добавляем PREMIUM в список, если его нет
      const hasPremium = subs.some((s: Subscription) => s.name === 'premium');
      if (!hasPremium) {
        subs.push({
          id: 999,
          name: 'premium',
          display_name: 'Premium',
          price: 999,
          duration_days: 30,
          features: ['ai_assistant', 'trips', 'fuel_tracking', 'mileage_tracking', 'smart_reminders', 'cloud_storage'],
          max_vehicles: 3,
          max_reminders: null,
          is_active: false,
        });
      }
      
      setSubscriptions(subs);

      // Используем plan_type из user в контексте
      setCurrentPlan(user?.plan_type || 'free');
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      Alert.alert(t('common.error'), 'Не удалось загрузить подписки');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return t('subscription.free');
    return `$${(price / 100).toFixed(2)}/мес`;
  };

  const getFeatureText = (feature: string): string => {
    const featureMap: { [key: string]: string } = {
      'vehicles_management': t('subscription.features.vehiclesManagement') || 'Управление автомобилями',
      'basic_reminders': t('subscription.features.basicReminders') || 'Базовые напоминания',
      'sto_search': t('subscription.features.stoSearch') || 'Поиск СТО',
      'advice': t('subscription.features.advice') || 'Советы',
      'profile_settings': t('subscription.features.profileSettings') || 'Профиль и настройки',
      'model_recommendations': t('subscription.features.modelRecommendations') || 'Рекомендации по модели',
      'expenses_statistics': t('subscription.features.expensesStatistics') || 'Статистика трат',
      'expenses_history': t('subscription.features.expensesHistory') || 'История трат',
      'photo_documents': t('subscription.features.photoDocuments') || 'Фото документов',
      'receipt_photos': t('subscription.features.receiptPhotos') || 'Фото чеков',
      'pdf_export': t('subscription.features.pdfExport') || 'Экспорт в PDF',
      'unlimited_reminders': t('subscription.features.unlimitedReminders') || 'Безлимит напоминаний',
      'expense_reminders': t('subscription.features.expenseReminders') || 'Напоминания о тратах',
      'ai_assistant': t('subscription.features.aiAssistant') || 'AI помощник',
      'trips': t('subscription.features.trips') || 'Учет поездок',
      'fuel_tracking': t('subscription.features.fuelTracking') || 'Учет заправок',
      'mileage_tracking': t('subscription.features.mileageTracking') || 'Учет пробега',
      'smart_reminders': t('subscription.features.smartReminders') || 'Умные напоминания',
      'cloud_storage': t('subscription.features.cloudStorage') || 'Облачное хранилище',
    };
    return featureMap[feature] || feature;
  };

  const handlePurchase = async (subscription: Subscription) => {
    if (subscription.name === currentPlan) {
      Alert.alert(t('subscription.info') || 'Информация', t('subscription.alreadyActive') || 'У вас уже активна эта подписка');
      return;
    }

    if (!subscription.is_active) {
      Alert.alert(
        t('subscription.comingSoon') || 'Скоро',
        t('subscription.comingSoonMessage') || 'Этот тариф пока в разработке. Следите за обновлениями!',
        [{ text: 'OK' }]
      );
      return;
    }

    if (subscription.name === 'free') {
      Alert.alert(t('subscription.info') || 'Информация', t('subscription.freePlan') || 'Это бесплатный тариф');
      return;
    }

    Alert.alert(
      t('subscription.purchase') || 'Покупка подписки',
      `${t('subscription.purchaseConfirm') || 'Приобрести'} ${subscription.display_name} ${t('subscription.for') || 'за'} ${formatPrice(subscription.price)}?`,
      [
        { text: t('common.cancel') || 'Отмена', style: 'cancel' },
        { 
          text: t('subscription.buy') || 'Купить', 
          onPress: () => processPurchase(subscription)
        },
      ]
    );
  };

  const processPurchase = async (subscription: Subscription) => {
    try {
      setPurchasing(true);
      
      const result = await ApiService.verifySubscription({
        platform: 'ios',
        transaction_id: `test_${Date.now()}`,
        subscription_type: subscription.name,
      });

      if (result.success) {
        // Обновляем данные пользователя в контексте
        await refreshUser();
        
        Alert.alert(
          t('subscription.success') || 'Успех!',
          `${t('subscription.activated') || 'Подписка'} ${subscription.display_name} ${t('subscription.successfullyActivated') || 'успешно активирована!'}`,
          [{ text: 'OK', onPress: () => loadSubscriptions() }]
        );
      }
    } catch (error: any) {
      console.error('Error purchasing subscription:', error);
      Alert.alert(t('common.error') || 'Ошибка', error.message || t('subscription.purchaseError') || 'Не удалось приобрести подписку');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      t('subscription.restorePurchases') || 'Восстановление покупок',
      t('subscription.restoreMessage') || 'Эта функция будет доступна после интеграции с магазином приложений',
      [{ text: 'OK' }]
    );
  };

  // Dev режим - активация Pro подписки без оплаты
  const handleDevActivatePro = async () => {
    try {
      setPurchasing(true);
      
      const result = await ApiService.verifySubscription({
        platform: 'ios',
        transaction_id: `dev_mode_${Date.now()}`,
        subscription_type: 'pro',
      });

      if (result.success) {
        // Обновляем данные пользователя в контексте
        await refreshUser();
        
        Alert.alert(
          '✅ Dev Mode',
          'Pro подписка успешно активирована!',
          [{ text: 'OK', onPress: () => loadSubscriptions() }]
        );
      }
    } catch (error: any) {
      console.error('Error activating dev pro:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось активировать Pro подписку');
    } finally {
      setPurchasing(false);
    }
  };

  const renderSubscriptionCard = (subscription: Subscription) => {
    const isCurrent = subscription.name === currentPlan;
    const isRecommended = subscription.name === 'pro';
    const isComingSoon = !subscription.is_active;

    const cardStyles = [
      styles.subscriptionCard,
      isCurrent ? styles.currentCard : null,
      isComingSoon ? styles.disabledCard : null,
    ].filter((s): s is typeof styles.subscriptionCard => s !== null);

    return (
      <Card 
        key={subscription.id}
        style={cardStyles}
      >
        {isRecommended && !isCurrent && !isComingSoon && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>{t('subscription.popular') || 'ПОПУЛЯРНЫЙ'}</Text>
          </View>
        )}

        {isComingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>{t('subscription.comingSoon') || 'СКОРО'}</Text>
          </View>
        )}

        {isCurrent && (
          <View style={styles.currentBadge}>
            <Icon name="check" size={16} color={COLORS.background} />
            <Text style={styles.currentBadgeText}>{t('subscription.current') || 'ТЕКУЩИЙ'}</Text>
          </View>
        )}

        <Text style={[styles.planName, isComingSoon && styles.disabledText]}>
          {subscription.display_name}
        </Text>
        
        <Text style={[styles.planPrice, isComingSoon && styles.disabledText]}>
          {formatPrice(subscription.price)}
        </Text>

        <View style={styles.planLimits}>
          <View style={styles.limitRow}>
            <Icon name="car" size={16} color={isComingSoon ? COLORS.textMuted : COLORS.textSecondary} />
            <Text style={[styles.planLimitText, isComingSoon && styles.disabledText]}>
              {t('subscription.upTo') || 'До'} {subscription.max_vehicles} {subscription.max_vehicles === 1 ? t('subscription.car') || 'авто' : t('subscription.cars') || 'авто'}
            </Text>
          </View>
          <View style={styles.limitRow}>
            <Icon name="bell" size={16} color={isComingSoon ? COLORS.textMuted : COLORS.textSecondary} />
            <Text style={[styles.planLimitText, isComingSoon && styles.disabledText]}>
              {subscription.max_reminders 
                ? `${t('subscription.upTo') || 'До'} ${subscription.max_reminders} ${t('subscription.reminders') || 'напоминаний'}`
                : t('subscription.unlimitedReminders') || 'Безлимит напоминаний'
              }
            </Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {subscription.features.slice(0, 5).map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Icon name="check" size={14} color={isComingSoon ? COLORS.textMuted : COLORS.success} />
              <Text style={[styles.featureText, isComingSoon && styles.disabledText]}>
                {getFeatureText(feature)}
              </Text>
            </View>
          ))}
          {subscription.features.length > 5 && (
            <Text style={[styles.moreFeatures, isComingSoon && styles.disabledText]}>
              +{subscription.features.length - 5} {t('subscription.more') || 'еще...'}
            </Text>
          )}
        </View>

        <Button
          title={
            isCurrent 
              ? t('subscription.currentPlan') || 'Текущий план'
              : isComingSoon 
                ? t('subscription.comingSoon') || 'Скоро'
                : t('subscription.select') || 'Выбрать'
          }
          onPress={() => handlePurchase(subscription)}
          disabled={purchasing || isCurrent || isComingSoon}
          style={
            isCurrent 
              ? styles.currentButton 
              : isComingSoon 
                ? styles.disabledButton 
                : undefined
          }
        />
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.error} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('subscription.title') || 'Подписки'}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('subscription.title') || 'Подписки'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.subtitle}>
          {t('subscription.selectPlan') || 'Выберите подходящий тариф'}
        </Text>

        {subscriptions.map(renderSubscriptionCard)}

        <TouchableOpacity 
          style={styles.restoreButton}
          onPress={handleRestore}
        >
          <Icon name="refresh" size={16} color={COLORS.accent} style={styles.restoreIcon} />
          <Text style={styles.restoreButtonText}>
            {t('subscription.restorePurchases') || 'Восстановить покупки'}
          </Text>
        </TouchableOpacity>

        {/* Dev режим - кнопка для активации Pro подписки */}
        {__DEV__ && (
          <TouchableOpacity 
            style={[styles.restoreButton, styles.devButton]}
            onPress={handleDevActivatePro}
            disabled={purchasing}
          >
            <Icon name="settings" size={16} color={COLORS.warning} style={styles.restoreIcon} />
            <Text style={[styles.restoreButtonText, styles.devButtonText]}>
              🔧 DEV: Активировать Pro
            </Text>
          </TouchableOpacity>
        )}

        <Card style={styles.infoBox}>
          <Icon name="info" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            {t('subscription.autoRenewInfo') || 'Подписка будет автоматически продлена, если не отменить ее за 24 часа до окончания периода.'}
          </Text>
        </Card>
      </ScrollView>

      {purchasing && (
        <View style={styles.purchasingOverlay}>
          <ActivityIndicator size="large" color={COLORS.error} />
          <Text style={styles.purchasingText}>
            {t('subscription.processing') || 'Обработка покупки...'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionCard: {
    marginBottom: SPACING.lg,
    position: 'relative',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  currentCard: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.surface,
  },
  disabledCard: {
    opacity: 0.5,
    borderColor: COLORS.border,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    zIndex: 10,
  },
  recommendedText: {
    color: COLORS.background,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    zIndex: 10,
  },
  comingSoonText: {
    color: COLORS.background,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  currentBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentBadgeText: {
    color: COLORS.background,
    fontSize: 12,
    fontFamily: FONTS.bold,
    marginLeft: 4,
  },
  planName: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  planPrice: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    marginBottom: SPACING.md,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
  planLimits: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  planLimitText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  featuresContainer: {
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  featureText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
    marginTop: SPACING.xs,
    marginLeft: SPACING.lg,
  },
  currentButton: {
    opacity: 0.7,
  },
  disabledButton: {
    opacity: 0.5,
  },
  restoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  restoreIcon: {
    marginRight: SPACING.xs,
  },
  restoreButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  devButton: {
    backgroundColor: 'rgba(248, 114, 114, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  devButtonText: {
    color: COLORS.warning,
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  purchasingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchasingText: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FONTS.medium,
    marginTop: SPACING.md,
  },
});

export default SubscriptionScreen;
