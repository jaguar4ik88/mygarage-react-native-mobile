import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, hexToRgba } from '../constants';
import ApiService from '../services/api';
import SubscriptionService from '../services/SubscriptionService';
import { subscriptionUtils } from '../config/subscriptions';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';

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
  const { appearanceKey } = useTheme();
  const styles = useMemo(() => createSubscriptionStyles(), [appearanceKey]);
  const { user, refreshUser, isGuest } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [revenueCatPrices, setRevenueCatPrices] = useState<Record<string, { price: string; priceInCents: number }>>({});

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  useEffect(() => {
    // Загружаем подписки для всех пользователей, включая гостей
    if (revenueCatReady) {
      loadSubscriptions();
    }
  }, [user?.id, isGuest, user?.plan_type, revenueCatReady]);

  const initializeRevenueCat = async () => {
    try {
      await SubscriptionService.initialize();
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
      // Продолжаем работу без RevenueCat (fallback к API)
    } finally {
      // Всегда помечаем как готово, даже если была ошибка
      setRevenueCatReady(true);
    }
  };


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
      
      // ПРИОРИТЕТ: Получаем цены из RevenueCat (из App Store/Google Play)
      const prices: Record<string, { price: string; priceInCents: number }> = {};
      
      try {
        if (SubscriptionService.isReady()) {
          // Получаем цены для pro и premium параллельно
          const pricePromises = (['pro', 'premium'] as const).map(async (subType) => {
            try {
              const packageToPurchase = await SubscriptionService.getProductForSubscription(subType);
              if (packageToPurchase) {
                const product = (packageToPurchase as any).product;
                if (product) {
                  const priceString = product.pricePerMonthString || product.priceString || '';
                  const price = product.price || 0;
                  const priceInCents = Math.round(price * 100);
                  
                  return {
                    subType,
                    price: priceString || `${price} ${product.currencyCode || 'USD'}`,
                    priceInCents
                  };
                }
              }
            } catch (error) {
              console.warn(`⚠️ Could not get price for ${subType} from RevenueCat:`, error);
            }
            return null;
          });
          
          const priceResults = await Promise.all(pricePromises);
          
          priceResults.forEach((result) => {
            if (result) {
              prices[result.subType] = {
                price: result.price,
                priceInCents: result.priceInCents
              };
            }
          });
          
          if (Object.keys(prices).length > 0) {
            setRevenueCatPrices(prices);
            
            // Обновляем цены в подписках из RevenueCat
            subs.forEach((sub: Subscription) => {
              if (prices[sub.name]) {
                sub.price = prices[sub.name].priceInCents;
              }
            });
          }
        }
      } catch (revenueCatError) {
        console.warn('⚠️ Could not get prices from RevenueCat, using API prices:', revenueCatError);
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


  const formatPrice = (price: number, subscriptionName?: string): string => {
    if (price === 0) return t('subscription.free');
    
    // Если есть цена из RevenueCat, используем её (уже отформатированная с валютой)
    if (subscriptionName && revenueCatPrices[subscriptionName]) {
      const monthText = t('subscription.month') || 'мес';
      return `${revenueCatPrices[subscriptionName].price}/${monthText}`;
    }
    
    // Fallback: форматируем цену из центов
    const monthText = t('subscription.month') || 'мес';
    return `$${(price / 100).toFixed(2)}/${monthText}`;
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
      'reports': t('subscription.features.reports') || 'Отчёты и аналитика',
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
      `${t('subscription.purchaseConfirm') || 'Приобрести'} ${subscription.display_name} ${t('subscription.for') || 'за'} ${formatPrice(subscription.price, subscription.name)}?`,
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
      
      // Используем RevenueCat для покупок
      try {
        const packageToPurchase = await SubscriptionService.getProductForSubscription(subscription.name);
        
        if (!packageToPurchase) {
          // Детальная диагностика для отладки
          let debugInfo = '';
          try {
            const offerings = await SubscriptionService.getOfferings();
            const expectedProductId = subscription.name === 'pro' 
              ? 'pro_garage_monthly_subscription'
              : subscription.name === 'premium'
              ? 'premium_garage_monthly_subscription'
              : `${subscription.name}_monthly_subscription`;
            
            let availableProducts = '';
            if (offerings && Array.isArray(offerings)) {
              offerings.forEach((offering) => {
                if (offering && offering.availablePackages) {
                  offering.availablePackages.forEach((pkg) => {
                    const product = (pkg as any)?.product;
                    availableProducts += `\n- ${pkg?.identifier || 'N/A'} (Product: ${product?.identifier || 'N/A'})`;
                  });
                }
              });
            }
            
            debugInfo = `Продукт не найден: ${expectedProductId}`;
          } catch (debugError) {
            debugInfo = `Продукт недоступен для покупки`;
          }
          
          console.error('❌ Product not found:', debugInfo);
          
          Alert.alert(
            'Ошибка конфигурации',
            debugInfo,
            [{ text: 'OK' }]
          );
          throw new Error(`Продукт недоступен для покупки`);
        }

        const customerInfo = await SubscriptionService.purchasePackage(packageToPurchase);
        
        // Обновляем данные пользователя
        await refreshUser();
        
        // Закрываем модальное окно/экран после успешной покупки
        // чтобы пользователь увидел обновленную подписку
        onBack();
        
        // Показываем сообщение об успехе после небольшой задержки
        // чтобы модальное окно успело закрыться
        setTimeout(() => {
          Alert.alert(
            t('subscription.success') || 'Успех!',
            `${t('subscription.activated') || 'Подписка'} ${subscription.display_name} ${t('subscription.successfullyActivated') || 'успешно активирована!'}`,
            [{ text: 'OK' }]
          );
        }, 300);
        
      } catch (revenueCatError: any) {
        console.error('❌ RevenueCat purchase error:', revenueCatError);
        console.error('❌ Error details:', {
          code: revenueCatError?.code,
          message: revenueCatError?.message,
          userInfo: revenueCatError?.userInfo,
          underlyingErrorMessage: revenueCatError?.underlyingErrorMessage
        });
        
        // Показываем понятное сообщение об ошибке
        const errorMessage = revenueCatError?.message || 'Неизвестная ошибка';
        const errorCode = revenueCatError?.code || 'N/A';
        
        // Более понятное сообщение для пользователя
        let userFriendlyMessage = errorMessage;
        if (errorMessage.includes('недоступен') || errorCode === 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE') {
          userFriendlyMessage = 'Подписка временно недоступна. Пожалуйста, попробуйте позже или обратитесь в поддержку.';
        } else if (errorMessage.includes('отменена')) {
          userFriendlyMessage = 'Покупка отменена';
        } else if (errorMessage.includes('сети')) {
          userFriendlyMessage = 'Ошибка подключения. Проверьте интернет и попробуйте снова.';
        }
        
        Alert.alert(
          t('common.error') || 'Ошибка',
          userFriendlyMessage,
          [{ text: t('common.ok') || 'OK' }]
        );
        
        throw revenueCatError;
      }
      
    } catch (error: any) {
      console.error('Error purchasing subscription:', error);
      Alert.alert(t('common.error') || 'Ошибка', error.message || t('subscription.purchaseError') || 'Не удалось приобрести подписку');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setPurchasing(true);
      
      if (!SubscriptionService.isReady()) {
        Alert.alert(
          t('subscription.restorePurchases') || 'Восстановление покупок',
          'RevenueCat не инициализирован. Попробуйте позже.',
          [{ text: 'OK' }]
        );
        return;
      }

      const customerInfo = await SubscriptionService.restorePurchases();
      
      // Проверяем, есть ли активные подписки
      const hasActiveSubscription = customerInfo.entitlements.active && 
        Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveSubscription) {
        await refreshUser();
        Alert.alert(
          t('subscription.success') || 'Успех!',
          t('subscription.restoreSuccess') || 'Покупки успешно восстановлены!',
          [{ text: 'OK', onPress: () => loadSubscriptions() }]
        );
      } else {
        Alert.alert(
          t('subscription.noPurchases') || 'Нет покупок',
          t('subscription.noPurchasesMessage') || 'Не найдено активных покупок для восстановления.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      Alert.alert(
        t('common.error') || 'Ошибка',
        error.message || t('subscription.restoreError') || 'Не удалось восстановить покупки'
      );
    } finally {
      setPurchasing(false);
    }
  };


  const handleManageSubscription = async () => {
    try {
      await SubscriptionService.cancelSubscription();
    } catch (error: any) {
      console.error('Error managing subscription:', error);
      Alert.alert(
        t('common.error') || 'Ошибка',
        error.message || 'Не удалось открыть управление подпиской'
      );
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
          {formatPrice(subscription.price, subscription.name)}
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
          <View style={styles.limitRow}>
            <Icon name="calendar" size={16} color={isComingSoon ? COLORS.textMuted : COLORS.textSecondary} />
            <Text style={[styles.planLimitText, isComingSoon && styles.disabledText]}>
              {t('subscription.duration') || 'Продолжительность'}: {subscription.duration_days} {subscription.duration_days === 30 ? t('subscription.days') || 'дней' : subscription.duration_days === 365 ? t('subscription.year') || 'год' : t('subscription.days') || 'дней'}
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
                : subscription.name === 'pro'
                  ? t('subscription.buyNow') || 'Купить PRO'
                  : t('subscription.select') || 'Выбрать'
          }
          onPress={() => handlePurchase(subscription)}
          disabled={purchasing || isCurrent || isComingSoon}
          style={
            isCurrent 
              ? styles.currentButton 
              : isComingSoon 
                ? styles.disabledButton 
                : subscription.name === 'pro'
                  ? styles.buyButton
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
          <View style={styles.headerSideLeft}>
            <ScreenBackLink layout="toolbar" onPress={onBack} />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('subscription.title') || 'Подписки'}
          </Text>
          <View style={styles.headerSideRight} />
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
        <View style={styles.headerSideLeft}>
          <ScreenBackLink layout="toolbar" onPress={onBack} />
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('subscription.title') || 'Подписки'}
        </Text>
        <View style={styles.headerSideRight} />
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

        <Card style={styles.instructionBox}>
          <Icon name="info" size={20} color={COLORS.accent} />
          <View style={styles.instructionContent}>
            <Text style={styles.instructionTitle}>
              {t('subscription.howToPurchase') || 'Как купить подписку?'}
            </Text>
            <Text style={styles.instructionText}>
              {t('subscription.instruction') || '1. Выберите тариф (например, PRO)\n2. Нажмите кнопку "Выбрать" на карточке\n3. Подтвердите покупку в системном диалоге\n4. Подписка активируется автоматически'}
            </Text>
          </View>
        </Card>

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


        {/* Кнопка управления подпиской (для PRO/PREMIUM пользователей) */}
        {(currentPlan === 'pro' || currentPlan === 'premium') && (
          <Card style={styles.manageInfoBox}>
            <Icon name="settings" size={20} color={COLORS.info} />
            <View style={styles.manageInfoContent}>
              <Text style={styles.manageInfoTitle}>
                {t('subscription.manageSubscription') || 'Управление подпиской'}
              </Text>
              <Text style={styles.manageInfoText}>
                {t('subscription.manageInfo') || 'Используйте эту кнопку для отмены или изменения подписки через системные настройки'}
              </Text>
              <TouchableOpacity 
                style={[styles.manageButton, { backgroundColor: hexToRgba(COLORS.info, 0.14) }]}
                onPress={handleManageSubscription}
                disabled={purchasing}
              >
                <Icon name="settings" size={16} color={COLORS.info} style={styles.restoreIcon} />
                <Text style={styles.manageButtonText}>
                  {t('subscription.openSettings') || 'Открыть настройки подписки'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <Card style={styles.infoBox}>
          <Icon name="info" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            {t('subscription.autoRenewInfo') || 'Подписка будет автоматически продлена, если не отменить ее за 24 часа до окончания периода.'}
          </Text>
        </Card>


        {/* Privacy Policy and Terms of Service Links - Required by Apple */}
        <Card style={styles.linksBox}>
          <View style={styles.linksContainer}>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => setShowPrivacyModal(true)}
            >
              <Icon name="shield" size={16} color={COLORS.accent} />
              <Text style={styles.linkText}>{t('profile.privacyPolicy')}</Text>
              <Icon name="forward" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
            
            <View style={styles.linkDivider} />
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => setShowTermsModal(true)}
            >
              <Icon name="file-text" size={16} color={COLORS.accent} />
              <Text style={styles.linkText}>{t('profile.termsOfService')}</Text>
              <Icon name="forward" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {purchasing && (
        <View style={[styles.purchasingOverlay, { backgroundColor: hexToRgba(COLORS.shadow, 0.72) }]}>
          <ActivityIndicator size="large" color={COLORS.error} />
          <Text style={styles.purchasingText}>
            {t('subscription.processing') || 'Обработка покупки...'}
          </Text>
        </View>
      )}

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <PrivacyPolicyScreen onBack={() => setShowPrivacyModal(false)} />
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <TermsOfServiceScreen onBack={() => setShowTermsModal(false)} />
      </Modal>
    </SafeAreaView>
  );
};

function createSubscriptionStyles() {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  headerSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSideRight: {
    flex: 1,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    textAlign: 'center',
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
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.info,
  },
  manageButtonText: {
    color: COLORS.info,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchasingText: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FONTS.medium,
    marginTop: SPACING.md,
  },
  instructionBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accent,
    borderWidth: 1,
  },
  instructionContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  instructionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  instructionText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  buyButton: {
    backgroundColor: COLORS.accent,
  },
  manageInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.info,
    borderWidth: 1,
  },
  manageInfoContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  manageInfoTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  manageInfoText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  linksBox: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  linksContainer: {
    gap: 0,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  linkDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  linkText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
  },
  debugBox: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accent,
    borderWidth: 1,
  },
  debugHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(248, 114, 114, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  refreshButtonText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
    marginLeft: SPACING.xs,
  },
  debugTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    marginLeft: SPACING.sm,
  },
  debugContent: {
    marginTop: SPACING.sm,
  },
  debugSection: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  debugSectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  debugSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  debugText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 16,
  },
  debugEntitlement: {
    marginLeft: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
  },
  debugOffering: {
    marginLeft: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.info,
  },
  debugPackage: {
    marginLeft: SPACING.md,
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  errorBox: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: COLORS.warning,
    borderWidth: 2,
    flexDirection: 'row',
  },
  errorContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  errorTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  debugNote: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.info,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  debugWarning: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.warning,
  },
  currentOffering: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: SPACING.xs,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  debugCurrentLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
});

}

export default SubscriptionScreen;
