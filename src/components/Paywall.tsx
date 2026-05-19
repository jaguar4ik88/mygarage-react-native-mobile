import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import ModalRN from 'react-native-modal';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/api';
import SubscriptionService from '../services/SubscriptionService';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';

type PlanId = 'free' | 'pro' | 'premium';

interface ApiSubRow {
  name: string;
  is_active: boolean;
}

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  /** Контекст блокировки функции; пусто — только каталог планов (например из профиля). */
  feature?: string;
  subscriptionType?: 'pro' | 'premium';
  currentPlan?: string;
}

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'premium'];

function splitPipeList(raw: string): string[] {
  return raw
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean);
}

function createPaywallStyles() {
  return StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    sheet: {
      backgroundColor: COLORS.background,
      borderTopLeftRadius: RADIUS.sheet,
      borderTopRightRadius: RADIUS.sheet,
      maxHeight: '92%',
      paddingTop: SPACING.md,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    headerTextCol: {
      flex: 1,
      paddingRight: SPACING.sm,
    },
    eyebrow: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: COLORS.textSecondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    sheetTitle: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    sheetSubtitle: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
    },
    contextHint: {
      marginTop: SPACING.sm,
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      lineHeight: 17,
    },
    closeRound: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
    },
    scrollInner: {
      paddingHorizontal: SPACING.lg,
    },
    paywallScroll: {
      overflow: 'hidden',
    },
    planStack: {
      gap: SPACING.sm,
    },
    planCard: {
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      padding: SPACING.lg,
      backgroundColor: COLORS.surface,
    },
    planCardIdle: {
      borderColor: COLORS.border,
    },
    planCardActive: {
      borderColor: COLORS.accent,
      backgroundColor: hexToRgba(COLORS.accent, 0.06),
    },
    planCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    planCardTitleBlock: {
      flex: 1,
      minWidth: 0,
    },
    planNameRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: 6,
    },
    planName: {
      fontSize: 20,
      fontFamily: FONTS.bold,
      color: COLORS.text,
    },
    popularBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.accent,
    },
    popularBadgeText: {
      fontSize: 9,
      fontFamily: FONTS.bold,
      color: COLORS.background,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    currentMiniBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: hexToRgba(COLORS.text, 0.06),
    },
    currentMiniBadgeText: {
      fontSize: 9,
      fontFamily: FONTS.bold,
      color: COLORS.textSecondary,
      letterSpacing: 0.6,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      minHeight: 36,
    },
    priceLarge: {
      fontSize: 28,
      fontFamily: FONTS.bold,
      color: COLORS.text,
    },
    priceSuffix: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: SPACING.sm,
    },
    radioOuterIdle: {
      borderColor: COLORS.border,
    },
    radioOuterActive: {
      borderColor: COLORS.accent,
      backgroundColor: COLORS.accent,
    },
    featureList: {
      gap: SPACING.sm,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
    },
    featureIncludedText: {
      flex: 1,
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: COLORS.text,
      lineHeight: 17,
    },
    featureLockedText: {
      flex: 1,
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: hexToRgba(COLORS.textMuted, 0.55),
      textDecorationLine: 'line-through',
      lineHeight: 17,
    },
    premiumHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.md,
      padding: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: hexToRgba(COLORS.warning, 0.12),
      borderWidth: 1,
      borderColor: hexToRgba(COLORS.warning, 0.35),
    },
    premiumHintText: {
      flex: 1,
      fontSize: 11,
      fontFamily: FONTS.medium,
      color: COLORS.warning,
      lineHeight: 15,
    },
    cta: {
      marginTop: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md + 2,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.accent,
      gap: SPACING.sm,
    },
    ctaDisabled: {
      opacity: 0.45,
    },
    ctaIcon: {
      marginRight: 2,
    },
    ctaText: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: COLORS.background,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    restoreWrap: {
      alignItems: 'center',
      marginTop: SPACING.md,
      paddingVertical: SPACING.xs,
    },
    restoreText: {
      fontSize: 12,
      fontFamily: FONTS.medium,
      color: COLORS.textMuted,
    },
    restoreHint: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: hexToRgba(COLORS.textMuted, 0.85),
      textAlign: 'center',
      marginTop: 2,
      paddingHorizontal: SPACING.md,
    },
    noThanksWrap: {
      alignItems: 'center',
      paddingVertical: SPACING.sm,
    },
    noThanksText: {
      fontSize: 13,
      fontFamily: FONTS.medium,
      color: COLORS.textSecondary,
    },
    legalText: {
      marginTop: SPACING.md,
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
    legalLink: {
      fontFamily: FONTS.semiBold,
      color: COLORS.accent,
    },
    autoRenewTiny: {
      marginTop: SPACING.sm,
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: hexToRgba(COLORS.textMuted, 0.85),
      textAlign: 'center',
      lineHeight: 14,
    },
  });
}

const Paywall: React.FC<PaywallProps> = ({
  visible,
  onClose,
  onUpgrade,
  feature = '',
  subscriptionType,
  currentPlan = 'free',
}) => {
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const { appearanceKey } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createPaywallStyles(), [appearanceKey]);
  const currentNorm = useMemo(
    () => String(currentPlan || 'free').toLowerCase(),
    [currentPlan]
  );

  const [selected, setSelected] = useState<PlanId>('pro');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<'pro' | 'premium', string>>>({});
  const [planActive, setPlanActive] = useState<Record<PlanId, boolean>>({
    free: true,
    pro: true,
    premium: true,
  });

  const featureAliasMap: { [key: string]: string } = useMemo(
    () => ({
      photo_documents: 'photoDocuments',
      receipt_photos: 'receiptPhotos',
      pdf_export: 'pdfExport',
      unlimited_vehicles: 'vehiclesManagement',
      unlimited_reminders: 'unlimitedReminders',
      expense_reminders: 'expenseReminders',
    }),
    []
  );

  const getFeatureInfo = useCallback(
    (feat: string) => {
      if (!feat.trim()) {
        return { title: '', description: '' };
      }
      const featureAlias = featureAliasMap[feat] || feat;
      const title = t(`subscription.features.${featureAlias}` as any);
      const description = t(`subscription.features.${featureAlias}Desc` as any);
      return { title, description };
    },
    [featureAliasMap, t]
  );

  const loadPaywallData = useCallback(async () => {
    setLoading(true);
    try {
      const subscriptions = (await ApiService.getSubscriptions()) as ApiSubRow[];
      const nextActive: Record<PlanId, boolean> = {
        free: true,
        pro: true,
        premium: true,
      };
      subscriptions.forEach((s) => {
        if (s.name === 'pro' || s.name === 'premium') {
          nextActive[s.name] = s.is_active;
        }
      });
      setPlanActive(nextActive);

      const monthShort = t('paywall.perMonthShort');
      const priceParts: Partial<Record<'pro' | 'premium', string>> = {};
      for (const id of ['pro', 'premium'] as const) {
        try {
          const pkg = await SubscriptionService.getProductForSubscription(id);
          const product = (pkg as any)?.product || (pkg as any)?.storeProduct;
          if (product) {
            const ps =
              product.pricePerMonthString ||
              product.priceString ||
              `${product.price ?? ''} ${product.currencyCode ?? ''}`.trim();
            if (ps) {
              priceParts[id] = `${ps}${monthShort}`;
            }
          }
        } catch {
          /* ignore */
        }
      }
      setPrices(priceParts);
    } catch (e) {
      console.error('Paywall load error:', e);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) return;

    let initial: PlanId = 'pro';
    if (subscriptionType === 'pro' || subscriptionType === 'premium') {
      initial = subscriptionType;
    } else if (currentNorm === 'free') {
      initial = 'pro';
    } else if (currentNorm === 'pro') {
      initial = 'premium';
    } else if (currentNorm === 'premium') {
      initial = 'premium';
    }

    setSelected(initial);
    loadPaywallData();
  }, [visible, subscriptionType, currentNorm, loadPaywallData]);

  const handleRestore = async () => {
    try {
      setRestoring(true);
      if (!SubscriptionService.isReady()) {
        Alert.alert(
          t('subscription.restorePurchases'),
          t('subscription.restoreMessage') || 'Попробуйте позже.'
        );
        return;
      }
      const customerInfo = await SubscriptionService.restorePurchases();
      const hasActive =
        customerInfo.entitlements.active &&
        Object.keys(customerInfo.entitlements.active).length > 0;
      if (hasActive) {
        await refreshUser();
        Alert.alert(
          t('subscription.success') || 'Успех!',
          t('subscription.restoreSuccess') || 'Покупки восстановлены.',
          [{ text: t('common.ok') || 'OK', onPress: () => onClose() }]
        );
      } else {
        Alert.alert(
          t('subscription.noPurchases') || '',
          t('subscription.noPurchasesMessage') || ''
        );
      }
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Ошибка',
        error?.message || t('subscription.restoreError') || ''
      );
    } finally {
      setRestoring(false);
    }
  };

  const planLabel = (id: PlanId): string => {
    if (id === 'free') return t('subscription.free');
    if (id === 'pro') return t('subscription.pro');
    return t('subscription.premium');
  };

  const includedFor = (id: PlanId): string[] => {
    const key =
      id === 'free'
        ? 'paywall.freeIncludes'
        : id === 'pro'
          ? 'paywall.proIncludes'
          : 'paywall.premiumIncludes';
    return splitPipeList(t(key));
  };

  const lockedFor = (id: PlanId): string[] => {
    const key =
      id === 'free'
        ? 'paywall.freeLocked'
        : id === 'pro'
          ? 'paywall.proLocked'
          : 'paywall.premiumLocked';
    return splitPipeList(t(key));
  };

  const primaryDisabled =
    restoring ||
    (selected === 'premium' && !planActive.premium) ||
    (selected === 'pro' && !planActive.pro) ||
    (selected !== 'free' && currentNorm === selected);

  const primaryLabel =
    selected === 'free'
      ? t('paywall.continueWithFree')
      : currentNorm === selected
        ? t('subscription.currentPlan')
        : t('paywall.checkoutWithPlan', { plan: planLabel(selected) });

  const handlePrimary = () => {
    if (selected === 'free') {
      onClose();
      return;
    }
    if (currentNorm === selected) return;
    if (selected === 'premium' && !planActive.premium) return;
    if (selected === 'pro' && !planActive.pro) return;
    onUpgrade();
  };

  const { title: featTitle, description: featDesc } = getFeatureInfo(feature);
  const contextLine =
    featDesc && !String(featDesc).startsWith('subscription.features.')
      ? featDesc
      : featTitle && !String(featTitle).startsWith('subscription.features.')
        ? featTitle
        : null;

  const renderPlanCard = (id: PlanId) => {
    const active = selected === id;
    const isCurrent = currentNorm === id;
    const showPopular = id === 'pro';
    const premiumBlocked = id === 'premium' && !planActive.premium;

    return (
      <TouchableOpacity
        key={id}
        activeOpacity={0.88}
        onPress={() => setSelected(id)}
        style={[styles.planCard, active ? styles.planCardActive : styles.planCardIdle]}
      >
        <View style={styles.planCardTop}>
          <View style={styles.planCardTitleBlock}>
            <View style={styles.planNameRow}>
              <Text style={styles.planName}>{planLabel(id)}</Text>
              {showPopular ? (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>{t('paywall.popularBadge')}</Text>
                </View>
              ) : null}
              {isCurrent ? (
                <View style={styles.currentMiniBadge}>
                  <Text style={styles.currentMiniBadgeText}>{t('subscription.current')}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.priceRow}>
              {loading && id !== 'free' ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <>
                  <Text style={styles.priceLarge}>{id === 'free' ? '0' : prices[id] ?? '—'}</Text>
                  {id === 'free' ? (
                    <Text style={styles.priceSuffix}> {t('paywall.forever')}</Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
          <View style={[styles.radioOuter, active ? styles.radioOuterActive : styles.radioOuterIdle]}>
            {active ? <Icon name="check" size={12} color={COLORS.background} /> : null}
          </View>
        </View>

        <View style={styles.featureList}>
          {includedFor(id).map((line, idx) => (
            <View key={`${id}-i-${idx}`} style={styles.featureRow}>
              <Icon name="check" size={14} color={COLORS.accent} />
              <Text style={styles.featureIncludedText}>{line}</Text>
            </View>
          ))}
          {lockedFor(id).map((line, idx) => (
            <View key={`${id}-l-${idx}`} style={styles.featureRow}>
              <Icon name="close" size={14} color={COLORS.textMuted} />
              <Text style={styles.featureLockedText}>{line}</Text>
            </View>
          ))}
        </View>

        {premiumBlocked ? (
          <View style={styles.premiumHint}>
            <Icon name="info" size={14} color={COLORS.warning} />
            <Text style={styles.premiumHintText}>{t('paywall.premiumUnavailable')}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

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
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              <Text style={styles.eyebrow}>{t('paywall.sheetEyebrow')}</Text>
              <Text style={styles.sheetTitle}>{t('paywall.sheetTitle')}</Text>
              <Text style={styles.sheetSubtitle}>{t('paywall.sheetSubtitle')}</Text>
              {contextLine ? (
                <Text style={styles.contextHint} numberOfLines={3}>
                  {contextLine}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeRound}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Icon name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.paywallScroll}
            contentContainerStyle={[styles.scrollInner, { paddingBottom: SPACING.xl + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            directionalLockEnabled
            bounces
            {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
          >
            <View style={styles.planStack}>{PLAN_ORDER.map(renderPlanCard)}</View>

            <TouchableOpacity
              style={[styles.cta, primaryDisabled && styles.ctaDisabled]}
              onPress={handlePrimary}
              disabled={primaryDisabled}
              activeOpacity={0.9}
            >
              <Icon name="sparkles" size={18} color={COLORS.background} style={styles.ctaIcon} />
              <Text style={styles.ctaText}>{primaryLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.restoreWrap} onPress={handleRestore} disabled={restoring}>
              {restoring ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Text style={styles.restoreText}>{t('subscription.restorePurchases')}</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.restoreHint}>{t('paywall.restoreHint')}</Text>

            <TouchableOpacity onPress={onClose} style={styles.noThanksWrap}>
              <Text style={styles.noThanksText}>{t('paywall.noThanks')}</Text>
            </TouchableOpacity>

            <Text style={styles.legalText}>
              {t('paywall.legalLead')}{' '}
              <Text style={styles.legalLink} onPress={() => setShowTermsModal(true)}>
                {t('paywall.termsShort')}
              </Text>{' '}
              {t('paywall.legalAnd')}{' '}
              <Text style={styles.legalLink} onPress={() => setShowPrivacyModal(true)}>
                {t('paywall.privacyShort')}
              </Text>
            </Text>

            <Text style={styles.autoRenewTiny}>{t('paywall.autoRenewalNotice')}</Text>
          </ScrollView>
        </View>
      </ModalRN>

      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <PrivacyPolicyScreen onBack={() => setShowPrivacyModal(false)} />
      </Modal>

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

export default Paywall;
