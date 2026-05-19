import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Fuel, Wrench, Bell } from 'lucide-react-native';
import Icon from '../components/Icon';
import AnimatedView from '../components/AnimatedView';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { Vehicle, Reminder, ServiceHistory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscriptionUtils, SUBSCRIPTION_CONFIG } from '../config/subscriptions';

interface HomeScreenProps {
  onNavigateToVehicleDetail: (vehicle: Vehicle) => void;
  onNavigateToProfile: () => void;
  onAddCar: () => void;
  onNavigateToSubscription?: () => void;
  onVehicleDeleted?: () => void;
  refreshTrigger?: number;
}

function monthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function expenseCost(r: ServiceHistory): number {
  const raw = (r as any).cost ?? (r as any).amount ?? 0;
  const n = typeof raw === 'string' ? Number(String(raw).replace(/[^0-9.\-]/g, '')) : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function recordInMonth(r: ServiceHistory, start: Date, end: Date): boolean {
  const d = new Date((r as any).service_date || r.created_at || r.updated_at || Date.now());
  return d >= start && d <= end;
}

function sumFuelRepairForMonth(
  records: ServiceHistory[],
  fuelId: number | undefined,
  repairId: number | undefined
): { fuel: number; repair: number } {
  const { start, end } = monthRange();
  let fuel = 0;
  let repair = 0;
  for (const r of records) {
    if (!recordInMonth(r, start, end)) continue;
    const c = expenseCost(r);
    const etId = r.expense_type_id;
    if (fuelId != null && etId === fuelId) {
      fuel += c;
      continue;
    }
    if (repairId != null && etId === repairId) {
      repair += c;
      continue;
    }
    const slug = typeof (r as any).type === 'string' ? (r as any).type : '';
    if (slug === 'fuel') fuel += c;
    else if (slug === 'repair') repair += c;
  }
  return { fuel, repair };
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToVehicleDetail,
  onNavigateToProfile: _onNavigateToProfile,
  onAddCar,
  onNavigateToSubscription,
  onVehicleDeleted: _onVehicleDeleted,
  refreshTrigger,
}) => {
  const { t, language } = useLanguage();
  const { isGuest, user } = useAuth();
  const { appearanceKey } = useTheme();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [monthFuel, setMonthFuel] = useState(0);
  const [monthRepair, setMonthRepair] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const locale =
    language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US';
  const currency = user?.currency || 'UAH';

  const formatMoney = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount || 0),
    [locale, currency]
  );

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [vehiclesData, remindersData, historyData, types] = await Promise.all([
        ApiService.getVehicles(),
        ApiService.getReminders(user.id),
        ApiService.getExpensesHistory(user.id),
        ApiService.getExpenseTypes(language),
      ]);
      setVehicles(vehiclesData || []);
      setReminders(Array.isArray(remindersData) ? remindersData : []);
      const hist = Array.isArray(historyData) ? historyData : [];
      const fuelId = types.find((x: { slug?: string }) => x.slug === 'fuel')?.id as number | undefined;
      const repairId = types.find((x: { slug?: string }) => x.slug === 'repair')?.id as number | undefined;
      const sums = sumFuelRepairForMonth(hist, fuelId, repairId);
      setMonthFuel(sums.fuel);
      setMonthRepair(sums.repair);
    } catch (error) {
      console.error('HomeScreen load error:', error);
      if (!isGuest) {
        Alert.alert(t('common.error'), t('common.failedToLoadData'));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest, language, t]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    } else if (isGuest) {
      setLoading(false);
      setVehicles([]);
      setReminders([]);
      setMonthFuel(0);
      setMonthRepair(0);
    }
  }, [user?.id, isGuest, loadData]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadData();
    }
  }, [refreshTrigger, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const activeRemindersCount = useMemo(
    () => reminders.filter((r) => r.is_active).length,
    [reminders]
  );

  const planType = (user?.plan_type || 'free') as keyof typeof SUBSCRIPTION_CONFIG.LIMITS;
  const maxVehicles = subscriptionUtils.getMaxVehicles(planType);
  const planLabel = subscriptionUtils.getSubscriptionName(planType).toUpperCase();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: COLORS.background,
        },
        scroll: { flex: 1 },
        vehicleCard: {
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surface,
          marginBottom: SPACING.md,
          overflow: 'hidden',
        },
        vehicleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: SPACING.md,
        },
        vehicleIconWrap: {
          width: 48,
          height: 48,
          borderRadius: RADIUS.md,
          backgroundColor: hexToRgba(COLORS.accent, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: SPACING.md,
        },
        vehicleMain: { flex: 1 },
        vehicleEyebrow: {
          fontFamily: FONTS.medium,
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: COLORS.textSecondary,
          marginBottom: 4,
        },
        vehicleTitle: {
          fontFamily: FONTS.bold,
          fontSize: 18,
          letterSpacing: -0.3,
          color: COLORS.text,
        },
        vehicleSubtitle: {
          fontFamily: FONTS.regular,
          fontSize: 13,
          color: COLORS.textMuted,
          marginTop: 4,
        },
        statRow: {
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        statCell: {
          flex: 1,
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.sm,
          alignItems: 'center',
        },
        statLabel: {
          fontFamily: FONTS.medium,
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: COLORS.textSecondary,
          marginBottom: 4,
        },
        statValue: {
          fontFamily: FONTS.bold,
          fontSize: 15,
          letterSpacing: -0.2,
          color: COLORS.text,
        },
        addRow: {
          marginTop: SPACING.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: SPACING.lg,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: COLORS.border,
          backgroundColor: hexToRgba(COLORS.surface, 0.5),
        },
        addIconWrap: { marginRight: SPACING.sm },
        addRowText: {
          fontFamily: FONTS.semiBold,
          fontSize: 14,
        },
        planRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: SPACING.md,
        },
        planBadge: {
          fontFamily: FONTS.medium,
          fontSize: 11,
          color: COLORS.textSecondary,
          backgroundColor: COLORS.surface,
          paddingHorizontal: SPACING.sm,
          paddingVertical: 4,
          borderRadius: RADIUS.pill,
          overflow: 'hidden',
          marginHorizontal: SPACING.xs,
        },
        planLink: {
          fontFamily: FONTS.semiBold,
          fontSize: 11,
          color: COLORS.accent,
          marginHorizontal: SPACING.xs,
        },
        statsHeading: {
          fontFamily: FONTS.semiBold,
          fontSize: 14,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: COLORS.text,
          marginBottom: SPACING.md,
          marginTop: SPACING.xl,
        },
        statsGrid: {
          flexDirection: 'row',
          gap: 12,
        },
        quickCard: {
          flex: 1,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surface,
          paddingVertical: 14,
          paddingHorizontal: 14,
        },
        quickIconWrap: {
          marginBottom: SPACING.sm,
        },
        quickLabel: {
          fontFamily: FONTS.semiBold,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: COLORS.textMuted,
          marginTop: 0,
        },
        quickValue: {
          fontFamily: FONTS.bold,
          fontSize: 14,
          lineHeight: 18,
          letterSpacing: -0.2,
          color: COLORS.text,
          marginTop: 4,
        },
        emptyText: {
          fontFamily: FONTS.regular,
          fontSize: 15,
          color: COLORS.textSecondary,
          textAlign: 'center',
          paddingVertical: SPACING.xl,
        },
        loadingText: {
          fontFamily: FONTS.regular,
          fontSize: 14,
          color: COLORS.textMuted,
          textAlign: 'center',
          paddingVertical: SPACING.lg,
        },
        scrollPad: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.xxl,
        },
      }),
    [appearanceKey]
  );

  const showSubscriptionRow = Boolean(user?.id && !isGuest && onNavigateToSubscription);
  const showUpgradeCta = planType !== 'premium';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollPad}
        refreshControl={
          <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {loading && user?.id ? (
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        ) : null}

        {!loading && (!vehicles || vehicles.length === 0) ? (
          <Text style={styles.emptyText}>{t('home.noVehiclesText')}</Text>
        ) : (
          vehicles.map((vehicle, index) => (
            <AnimatedView key={vehicle.id} animation="slideInUp" delay={index * 80} duration={280}>
              <TouchableOpacity
                style={styles.vehicleCard}
                activeOpacity={0.85}
                onPress={() => onNavigateToVehicleDetail(vehicle)}
              >
                <View style={styles.vehicleRow}>
                  <View style={styles.vehicleIconWrap}>
                    <Icon name="car" size={22} color={COLORS.accent} />
                  </View>
                  <View style={styles.vehicleMain}>
                    <Text style={styles.vehicleEyebrow}>
                      {vehicle.year} · {vehicle.make}
                    </Text>
                    <Text style={styles.vehicleTitle} numberOfLines={2}>
                      {vehicle.model}
                    </Text>
                    <Text style={styles.vehicleSubtitle} numberOfLines={1}>
                      {vehicle.mileage.toLocaleString(locale)} {t('common.kilometers')} · {vehicle.engine_type}
                    </Text>
                  </View>
                  <Icon name="forward" size={18} color={COLORS.textMuted} />
                </View>
                <View style={styles.statRow}>
                  <View style={styles.statCell}>
                    <Text style={styles.statLabel}>{t('home.mileage')}</Text>
                    <Text style={styles.statValue}>{(vehicle.mileage / 1000).toFixed(0)}k</Text>
                  </View>
                  <View style={[styles.statCell, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                    <Text style={styles.statLabel}>{t('home.engineShort')}</Text>
                    <Text style={styles.statValue} numberOfLines={1}>
                      {vehicle.engine_type || '—'}
                    </Text>
                  </View>
                  <View style={[styles.statCell, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                    <Text style={styles.statLabel}>VIN</Text>
                    <Text style={styles.statValue} numberOfLines={1}>
                      {vehicle.vin ? `${vehicle.vin.slice(0, 6)}…` : '—'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedView>
          ))
        )}

        <TouchableOpacity style={styles.addRow} onPress={onAddCar} activeOpacity={0.75}>
          <View style={styles.addIconWrap}>
            <Icon name="add" size={18} color={COLORS.accent} />
          </View>
          <Text style={[styles.addRowText, { color: COLORS.accent }]}>{t('home.addCar')}</Text>
        </TouchableOpacity>

        {showSubscriptionRow ? (
          <View style={styles.planRow}>
            <Text style={styles.planBadge}>
              {t('home.subscriptionBadge', {
                plan: planLabel,
                current: vehicles.length,
                max: maxVehicles,
              })}
            </Text>
            {showUpgradeCta ? (
              <TouchableOpacity onPress={onNavigateToSubscription} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.planLink}>{t('home.expandLimit')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {user?.id && !isGuest ? (
          <>
            <Text style={styles.statsHeading}>{t('home.thisMonth')}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.quickCard}>
                <View style={styles.quickIconWrap}>
                  <Fuel size={16} color={COLORS.accent} strokeWidth={2} />
                </View>
                <Text style={styles.quickLabel}>{t('home.fuelStat')}</Text>
                <Text style={styles.quickValue}>{formatMoney(monthFuel)}</Text>
              </View>
              <View style={styles.quickCard}>
                <View style={styles.quickIconWrap}>
                  <Wrench size={16} color={COLORS.accent} strokeWidth={2} />
                </View>
                <Text style={styles.quickLabel}>{t('home.serviceStat')}</Text>
                <Text style={styles.quickValue}>{formatMoney(monthRepair)}</Text>
              </View>
              <View style={styles.quickCard}>
                <View style={styles.quickIconWrap}>
                  <Bell size={16} color={COLORS.accent} strokeWidth={2} />
                </View>
                <Text style={styles.quickLabel}>{t('home.remindersStat')}</Text>
                <Text style={styles.quickValue}>{String(activeRemindersCount)}</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
