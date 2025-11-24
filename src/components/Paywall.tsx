import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import ModalRN from 'react-native-modal';
import Icon from './Icon';
import Button from './Button';
import { COLORS, FONTS, SPACING } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ApiService from '../services/api';
import SubscriptionService from '../services/SubscriptionService';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';

interface Subscription {
  id: number;
  name: string;
  display_name: string;
  price: number; // цена в центах
  duration_days: number;
  features: string[];
  max_vehicles: number;
  max_reminders: number | null;
  is_active: boolean;
}

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
  subscriptionType?: 'pro' | 'premium'; // Тип подписки для отображения
  currentPlan?: 'free' | 'pro' | 'premium'; // Текущий план пользователя
}

const Paywall: React.FC<PaywallProps> = ({ 
  visible, 
  onClose, 
  onUpgrade, 
  feature,
  subscriptionType,
  currentPlan = 'free'
}) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [revenueCatPrice, setRevenueCatPrice] = useState<{ price: string; currency: string } | null>(null);

  // Определяем тип подписки для отображения
  // Если пользователь уже имеет Pro и пытается добавить 4-е авто, показываем Premium
  const displayType = subscriptionType || (currentPlan === 'pro' ? 'premium' : 'pro');
  const isPremium = displayType === 'premium';

  // Загружаем данные подписки при открытии модального окна
  useEffect(() => {
    if (visible) {
      loadSubscriptionData();
    }
  }, [visible, displayType]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // ПРИОРИТЕТ 1: Получаем цену из RevenueCat (из App Store/Google Play)
      try {
        const packageToPurchase = await SubscriptionService.getProductForSubscription(displayType);
        if (packageToPurchase) {
          const product = (packageToPurchase as any).product || (packageToPurchase as any).storeProduct;
          if (product) {
            // Извлекаем цену из продукта RevenueCat
            const priceString = product.pricePerMonthString || product.priceString || '';
            const price = product.price || 0;
            const currencyCode = product.currencyCode || 'USD';
            
            console.log('💰 Price from RevenueCat:', priceString, currencyCode, price);
            
            // Сохраняем цену из RevenueCat
            setRevenueCatPrice({
              price: priceString || `${price} ${currencyCode}`,
              currency: currencyCode
            });
            
            // Конвертируем цену в центы для совместимости с существующим кодом
            const priceInCents = Math.round(price * 100);
            
            // Загружаем остальные данные из API (features, limits и т.д.)
            const subscriptions = await ApiService.getSubscriptions();
            const foundSubscription = subscriptions.find((sub: Subscription) => 
              sub.name === displayType
            );
            
            if (foundSubscription) {
              // Используем цену из RevenueCat, остальное из API
              setSubscription({
                ...foundSubscription,
                price: priceInCents, // Перезаписываем цену из RevenueCat
              });
            } else {
              // Fallback: создаем объект с данными из RevenueCat
              setSubscription({
                id: isPremium ? 999 : 1,
                name: displayType,
                display_name: isPremium ? 'Premium' : 'Pro',
                price: priceInCents,
                duration_days: 30,
                features: [],
                max_vehicles: 3,
                max_reminders: null,
                is_active: true,
              });
            }
            
            setLoading(false);
            return; // Успешно получили данные из RevenueCat
          }
        }
      } catch (revenueCatError) {
        console.warn('⚠️ Could not get price from RevenueCat, falling back to API:', revenueCatError);
      }
      
      // ПРИОРИТЕТ 2: Fallback на API, если RevenueCat недоступен
      const subscriptions = await ApiService.getSubscriptions();
      const foundSubscription = subscriptions.find((sub: Subscription) => 
        sub.name === displayType
      );
      
      if (foundSubscription) {
        setSubscription(foundSubscription);
      } else {
        // Fallback: если подписка не найдена, создаем объект с дефолтными значениями
        setSubscription({
          id: isPremium ? 999 : 1,
          name: displayType,
          display_name: isPremium ? 'Premium' : 'Pro',
          price: isPremium ? 699 : 399, // дефолтные цены в центах
          duration_days: 30,
          features: [],
          max_vehicles: 3,
          max_reminders: null,
          is_active: true,
        });
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      // Fallback на дефолтные значения при ошибке
      setSubscription({
        id: isPremium ? 999 : 1,
        name: displayType,
        display_name: isPremium ? 'Premium' : 'Pro',
        price: isPremium ? 699 : 399,
        duration_days: 30,
        features: [],
        max_vehicles: 3,
        max_reminders: null,
        is_active: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceInCents: number): string => {
    if (priceInCents === 0) return t('subscription.free') || 'Бесплатно';
    
    // Если есть цена из RevenueCat, используем её (уже отформатированная)
    if (revenueCatPrice && revenueCatPrice.price) {
      return revenueCatPrice.price;
    }
    
    // Fallback: форматируем цену из центов
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  // Маппинг snake_case (из базы) в camelCase (для переводов)
  const featureAliasMap: { [key: string]: string } = {
    'photo_documents': 'photoDocuments',
    'receipt_photos': 'receiptPhotos',
    'pdf_export': 'pdfExport',
    'unlimited_vehicles': 'vehiclesManagement', // До 3 авто = управление автомобилями
    'unlimited_reminders': 'unlimitedReminders',
    'expense_reminders': 'expenseReminders',
  };

  const getFeatureInfo = (feature: string) => {
    const featureAlias = featureAliasMap[feature] || feature;
    
    return {
      title: t(`subscription.features.${featureAlias}`),
      description: t(`subscription.features.${featureAlias}Desc`),
    };
  };

  const featureInfo = getFeatureInfo(feature);

  return (
    <>
      <ModalRN
        isVisible={visible}
        onBackdropPress={onClose}
        onSwipeComplete={onClose}
        swipeDirection="down"
        propagateSwipe
        style={styles.modal}
      >
      <View style={styles.container}>
        <View style={styles.modalHandle} />
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="close" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: SPACING.xl + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/adaptive-icon-new.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>{featureInfo.title}</Text>
            <Text style={styles.description}>{featureInfo.description}</Text>
            <View style={styles.proFeaturesContainer}>
              <Text style={styles.proTitle}>{t('paywall.whatYouGet')}</Text>
              
              {/* PRO функции - показываем только если пользователь НЕ на PRO */}
              {currentPlan !== 'pro' && !isPremium && (
                <>
                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>{t('paywall.benefitVehicles')}</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>{t('paywall.benefitReminders')}</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>{t('paywall.benefitDocuments')}</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>{t('paywall.benefitPdf')}</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>{t('paywall.benefitNotifications')}</Text>
                  </View>
                </>
              )}

              {/* Premium функции - показываем для Premium Paywall */}
              {isPremium && (
                <>
                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.accent} />
                    <Text style={styles.featureText}>{t('paywall.benefitAiAssistant') || 'AI помощник'}</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.accent} />
                    <Text style={styles.featureText}>{t('paywall.benefitTrips') || 'Отслеживание поездок'}</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.accent} />
                    <Text style={styles.featureText}>{t('paywall.benefitFuelTracking') || 'Учет топлива'}</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Icon name="check" size={20} color={COLORS.accent} />
                    <Text style={styles.featureText}>{t('paywall.benefitCloudStorage') || 'Облачное хранилище'}</Text>
                  </View>

                  {/* Сообщение "в разработке" для Premium */}
                  {subscription && !subscription.is_active && (
                    <View style={styles.comingSoonContainer}>
                      <Icon name="info" size={16} color={COLORS.warning} />
                      <Text style={styles.comingSoonText}>
                        {t('paywall.comingSoon') || t('subscription.comingSoonMessage') || 'Скоро будет доступно'}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Subscription Information - Required by Apple */}
            {subscription && (
              <View style={styles.subscriptionInfoContainer}>
                <Text style={styles.subscriptionInfoTitle}>
                  {t('paywall.subscriptionInfo') || 'Информация о подписке'}
                </Text>
                <View style={styles.subscriptionInfoRow}>
                  <Text style={styles.subscriptionInfoLabel}>
                    {t('paywall.subscriptionName') || 'Название:'}
                  </Text>
                  <Text style={styles.subscriptionInfoValue}>
                    {subscription.display_name} {t('paywall.monthlySubscription') || 'месячная подписка'}
                  </Text>
                </View>
                <View style={styles.subscriptionInfoRow}>
                  <Text style={styles.subscriptionInfoLabel}>
                    {t('paywall.duration') || 'Продолжительность:'}
                  </Text>
                  <Text style={styles.subscriptionInfoValue}>
                    {subscription.duration_days} {subscription.duration_days === 30 
                      ? (t('paywall.days') || 'дней') 
                      : subscription.duration_days === 365 
                        ? (t('paywall.year') || 'год') 
                        : (t('paywall.days') || 'дней')}
                  </Text>
                </View>
                <View style={styles.subscriptionInfoRow}>
                  <Text style={styles.subscriptionInfoLabel}>
                    {t('paywall.price') || 'Цена:'}
                  </Text>
                  <Text style={styles.subscriptionInfoValue}>
                    {formatPrice(subscription.price)} {t('paywall.perMonth') || '/месяц'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.priceContainer}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : subscription ? (
                <>
                  <Text style={styles.priceText}>{formatPrice(subscription.price)}</Text>
                  <Text style={styles.perMonth}>{t('paywall.perMonth')}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.priceText}>{isPremium ? '$9.99' : '$4.99'}</Text>
                  <Text style={styles.perMonth}>{t('paywall.perMonth')}</Text>
                </>
              )}
            </View>

            {/* Purchase Required Notice */}
            <View style={styles.purchaseNoticeContainer}>
              <Icon name="info" size={16} color={COLORS.accent} />
              <Text style={styles.purchaseNoticeText}>
                {t('paywall.purchaseRequired') || 'Эта функция требует покупки подписки'}
              </Text>
            </View>

            <Button
              title={isPremium ? (t('paywall.upgradeToPremium') || 'Обновить до Premium') : t('paywall.upgradeToPro')}
              onPress={onUpgrade}
              style={styles.upgradeButton}
              disabled={isPremium && subscription && !subscription.is_active}
            />

            <TouchableOpacity onPress={onClose} style={styles.noThanksButton}>
              <Text style={styles.noThanksText}>{t('paywall.noThanks')}</Text>
            </TouchableOpacity>

            {/* EULA and Privacy Policy Links - Required by Apple */}
            <View style={styles.linksContainer}>
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => setShowPrivacyModal(true)}
              >
                <Icon name="shield" size={14} color={COLORS.accent} />
                <Text style={styles.linkText}>{t('profile.privacyPolicy')}</Text>
              </TouchableOpacity>
              
              <View style={styles.linkDivider} />
              
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => setShowTermsModal(true)}
              >
                <Icon name="file-text" size={14} color={COLORS.accent} />
                <Text style={styles.linkText}>{t('profile.termsOfService')}</Text>
              </TouchableOpacity>
            </View>

            {/* Auto-renewal notice */}
            <Text style={styles.autoRenewalNotice}>
              {t('paywall.autoRenewalNotice') || 'Подписка будет автоматически продлена, если не отменить ее за 24 часа до окончания периода.'}
            </Text>
        </ScrollView>
      </View>
      </ModalRN>

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
    </>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    position: 'relative',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    zIndex: 10,
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  proFeaturesContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  proTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.lg,
  },
  priceText: {
    fontSize: 36,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  perMonth: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  upgradeButton: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  noThanksButton: {
    padding: SPACING.md,
  },
  noThanksText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  featureDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  premiumTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  subscriptionInfoContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subscriptionInfoTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subscriptionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  subscriptionInfoLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  subscriptionInfoValue: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  purchaseNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  purchaseNoticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
    marginLeft: SPACING.xs,
  },
  linksContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  linkDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  linkText: {
    flex: 1,
    marginLeft: SPACING.xs,
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.accent,
  },
  autoRenewalNotice: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 14,
  },
  comingSoonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  comingSoonText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.warning,
    marginLeft: SPACING.xs,
  },
});

export default Paywall;

