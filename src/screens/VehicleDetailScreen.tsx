/* @refresh reset */
import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { Vehicle, Reminder, ServiceHistory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface VehicleDetailScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onVehicleDeleted: (vehicleId: number) => void;
  onNavigateToReminders: (vehicleId: number) => void;
  onNavigateToStatistics: () => void;
  onNavigateToHistory: (vehicleId: number) => void;
  onNavigateToRecommendations: () => void;
  navigation?: any;
}

function createVehicleDetailStyles() {
  const { width: screenW } = Dimensions.get('window');
  const pad = SPACING.lg;
  /** design-new: gap-3 / space-y-3 → 12px */
  const gridGap = 12;
  const quickCol = (screenW - pad * 2 - gridGap) / 2;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
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
      paddingHorizontal: pad,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xxl,
    },
    eyebrow: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: COLORS.textSecondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    headline: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    subline: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
      marginBottom: SPACING.lg,
    },
    /** Hero: rounded-2xl → calc(--radius + 8px) ≈ 24px при базе 16 */
    heroCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      overflow: 'hidden',
      marginBottom: SPACING.lg,
    },
    heroImageAspect: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: hexToRgba(COLORS.text, 0.06),
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroImagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    statCell: {
      flex: 1,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.md,
    },
    statCellDivider: {
      borderLeftWidth: 1,
      borderLeftColor: COLORS.border,
    },
    statLabel: {
      fontSize: 9,
      fontFamily: FONTS.semiBold,
      color: COLORS.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: COLORS.text,
    },
    statUnit: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
    },
    /** Редактировать — как в design-new vehicle.$id: py-3 gap-2 mb-6 rounded-full border-border bg-surface text-sm font-semibold text-muted */
    editMutedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: 12,
      marginBottom: SPACING.lg,
      alignSelf: 'stretch',
      width: '100%',
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    editMutedButtonText: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: FONTS.semiBold,
      color: COLORS.textMuted,
    },
    deleteVehicleButton: {
      alignSelf: 'stretch',
      width: '100%',
      borderRadius: 9999,
      overflow: 'hidden',
    },

    sectionHeading: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: COLORS.text,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: SPACING.md,
    },
    sectionLink: {
      marginTop: SPACING.sm,
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: COLORS.accent,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    /** Карточки списка / сетки: rounded-xl → --radius-xl в макете */
    reminderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: gridGap,
      padding: 14,
      marginBottom: SPACING.sm,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    reminderIconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reminderIconWrapMuted: {
      backgroundColor: hexToRgba(COLORS.text, 0.06),
    },
    reminderIconWrapUrgent: {
      backgroundColor: COLORS.accent,
    },
    reminderBody: {
      flex: 1,
      minWidth: 0,
    },
    reminderTitle: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: COLORS.text,
    },
    reminderDue: {
      marginTop: 4,
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
    },
    soonBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: 9999,
      backgroundColor: hexToRgba(COLORS.accent, 0.12),
    },
    soonBadgeText: {
      fontSize: 10,
      fontFamily: FONTS.bold,
      color: COLORS.accent,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    summaryGrid: {
      flexDirection: 'row',
      gap: gridGap,
      marginBottom: SPACING.lg,
    },
    summaryCard: {
      flex: 1,
      padding: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    summaryCardLabel: {
      fontSize: 10,
      fontFamily: FONTS.semiBold,
      color: COLORS.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: SPACING.xs,
    },
    summaryCardValue: {
      fontSize: 20,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      letterSpacing: -0.3,
    },
    quickLinksGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: gridGap,
      marginBottom: SPACING.xl,
    },
    quickLink: {
      width: quickCol,
      flexDirection: 'row',
      alignItems: 'center',
      gap: gridGap,
      paddingVertical: 14,
      paddingHorizontal: 14,
      minHeight: 52,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    quickLinkLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: COLORS.text,
    },
    emptyHint: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
      marginBottom: SPACING.sm,
    },
    editCard: {
      marginBottom: SPACING.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
    },
    inlineRow: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    inlineField: {
      flex: 1,
    },
    inlineLabel: {
      color: COLORS.textSecondary,
      marginBottom: SPACING.xs,
      fontSize: 13,
      fontFamily: FONTS.medium,
    },
    mileageButtons: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.md,
    },
    mileageButton: {
      flex: 1,
      borderRadius: 9999,
      overflow: 'hidden',
    },
  });
}

const VehicleDetailScreen: React.FC<VehicleDetailScreenProps> = ({
  vehicle,
  onEditVehicle,
  onVehicleDeleted,
  onNavigateToReminders,
  onNavigateToStatistics,
  onNavigateToHistory,
  onNavigateToRecommendations,
  navigation,
}) => {
  const { t, language } = useLanguage();
  const { appearanceKey, colorScheme } = useTheme();
  const styles = useMemo(() => createVehicleDetailStyles(), [appearanceKey, colorScheme]);
  const { user } = useAuth();

  const isPro = user?.plan_type === 'pro' || user?.plan_type === 'premium';

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [reminderTypes, setReminderTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newMileage, setNewMileage] = useState(vehicle.mileage.toString());
  const [editingYear, setEditingYear] = useState(false);
  const [newYear, setNewYear] = useState(String(vehicle.year || ''));

  const locale =
    language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US';
  const currencyCode = user?.currency || 'UAH';

  useEffect(() => {
    setNewMileage(vehicle.mileage.toString());
    setNewYear(String(vehicle.year || ''));
  }, [vehicle.id, vehicle.mileage, vehicle.year]);

  const fetchDetailPayload = useCallback(async () => {
    if (!vehicle.id || vehicle.id <= 0 || !user?.id) {
      return null;
    }
    const [remindersData, historyData, typesData] = await Promise.all([
      ApiService.getReminders(user.id),
      ApiService.getServiceHistory(vehicle.id),
      ApiService.getReminderTypes(language),
    ]);
    return {
      remindersData,
      historyRows: historyData.data || [],
      typesData,
    };
  }, [vehicle.id, language, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!vehicle.id || vehicle.id <= 0 || !user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const payload = await fetchDetailPayload();
        if (cancelled || !payload) return;
        setReminders(payload.remindersData);
        setServiceHistory(payload.historyRows);
        setReminderTypes(payload.typesData);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading vehicle data:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchDetailPayload]);

  const loadData = async () => {
    try {
      setLoading(true);
      const payload = await fetchDetailPayload();
      if (!payload) return;
      setReminders(payload.remindersData);
      setServiceHistory(payload.historyRows);
      setReminderTypes(payload.typesData);
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

  const handleUpdateYearAndMileage = async () => {
    try {
      const parsedYear = parseInt(String(newYear).trim(), 10);
      const parsedMileage = parseInt(String(newMileage).trim(), 10);
      if (!parsedYear || parsedYear < 1900 || parsedYear > new Date().getFullYear() + 1) {
        Alert.alert(t('common.error'), t('vehicleDetail.invalidYear'));
        return;
      }
      if (Number.isNaN(parsedMileage) || parsedMileage < 0) {
        Alert.alert(t('common.error'), t('vehicleDetail.mileageMustBeNumber'));
        return;
      }
      const updatedVehicle = await ApiService.updateVehicle(vehicle.id, {
        year: parsedYear,
        mileage: parsedMileage,
      });
      const merged = { ...vehicle, ...updatedVehicle };
      onEditVehicle(merged);
      navigation?.setParams?.({ vehicle: merged });
      await loadData();
      setEditingYear(false);
      Alert.alert(t('vehicleDetail.success'), t('vehicleDetail.yearUpdated'));
    } catch (error) {
      Alert.alert(t('common.error'), t('vehicleDetail.failedToUpdateYear'));
    }
  };

  const handleDeleteVehicle = () => {
    Alert.alert(
      t('vehicleDetail.deleteVehicle'),
      `${t('vehicleDetail.deleteVehicleConfirm')} ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteVehicle(vehicle.id);
              Alert.alert(t('vehicleDetail.success'), t('vehicleDetail.deleteSuccess'), [
                { text: t('common.ok'), onPress: () => onVehicleDeleted(vehicle.id) },
              ]);
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('vehicleDetail.failedToDeleteVehicle'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysUntilReminder = (dateString: string): number => {
    const now = new Date();
    const reminderDate = new Date(dateString);
    return Math.ceil((reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const vehicleRemindersActive = useMemo(
    () => reminders.filter((r) => r.vehicle_id === vehicle.id && r.is_active),
    [reminders, vehicle.id]
  );

  const upcomingVehicleReminders = useMemo(() => {
    const now = new Date();
    return vehicleRemindersActive
      .filter((r) => new Date(r.next_service_date) > now)
      .sort(
        (a, b) =>
          new Date(a.next_service_date).getTime() - new Date(b.next_service_date).getTime()
      );
  }, [vehicleRemindersActive]);

  const nextVehicleReminder = upcomingVehicleReminders[0] ?? null;

  const expenseStats = useMemo(() => {
    const total = serviceHistory.reduce((s, r) => s + (Number(r.cost) || 0), 0);
    return { total, count: serviceHistory.length };
  }, [serviceHistory]);

  const reminderTitle = (r: Reminder) =>
    reminderTypes.find((type) => type.key === r.type)?.title || r.title;

  const daysUntilService = nextVehicleReminder
    ? getDaysUntilReminder(nextVehicleReminder.next_service_date)
    : null;

  const openDocuments = () => {
    if (!isPro) {
      Alert.alert(
        t('subscription.proFeature'),
        t('subscription.documentsRequiresPro'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('subscription.upgrade'),
            onPress: () => navigation?.navigate('Subscription'),
          },
        ]
      );
      return;
    }
    navigation?.navigate('VehicleDocuments', { vehicle });
  };

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  const engineShort =
    vehicle.engine_type?.length > 14
      ? `${vehicle.engine_type.slice(0, 14)}…`
      : vehicle.engine_type || '—';

  const subParts = [vehicle.engine_type];
  if (vehicle.vin) subParts.push(`${t('vehicleDetail.vinShort')} ${vehicle.vin}`);
  const subtitleLine = subParts.filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>{vehicle.year || '—'}</Text>
          <Text style={styles.headline}>
            {vehicle.make} {vehicle.model}
          </Text>
          {subtitleLine ? <Text style={styles.subline}>{subtitleLine}</Text> : null}

          <View style={styles.heroCard}>
            <View style={styles.heroImageAspect}>
              {vehicle.image_url ? (
                <Image
                  source={{ uri: vehicle.image_url }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroImagePlaceholder}>
                  <Icon name="car" size={52} color={COLORS.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>{t('vehicleDetail.mileage')}</Text>
                <Text style={styles.statValue}>
                  {vehicle.mileage.toLocaleString(locale)}{' '}
                  <Text style={styles.statUnit}>{t('vehicleDetail.kilometers')}</Text>
                </Text>
              </View>
              <View style={[styles.statCell, styles.statCellDivider]}>
                <Text style={styles.statLabel}>{t('vehicleDetail.engineSpec')}</Text>
                <Text style={styles.statValue} numberOfLines={2}>
                  {engineShort}
                </Text>
              </View>
              <View style={[styles.statCell, styles.statCellDivider]}>
                <Text style={styles.statLabel}>{t('vehicleDetail.untilService')}</Text>
                <Text style={styles.statValue}>
                  {daysUntilService !== null ? (
                    <>
                      {daysUntilService}{' '}
                      <Text style={styles.statUnit}>{t('vehicleDetail.daysShort')}</Text>
                    </>
                  ) : (
                    <Text style={styles.statUnit}>—</Text>
                  )}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editMutedButton}
            onPress={() => setEditingYear(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityHint={t('vehicleDetail.yearAndMileage')}
          >
            <Icon name="edit" size={16} color={COLORS.textMuted} />
            <Text style={styles.editMutedButtonText}>{t('vehicleDetail.editVehicle')}</Text>
          </TouchableOpacity>

          {editingYear && (
            <Card style={styles.editCard}>
              <Text style={styles.sectionTitle}>{t('vehicleDetail.yearAndMileage')}</Text>
              <View style={styles.inlineRow}>
                <View style={styles.inlineField}>
                  <Text style={styles.inlineLabel}>{t('vehicleDetail.editYear')}</Text>
                  <Input value={newYear} onChangeText={setNewYear} keyboardType="numeric" />
                </View>
                <View style={styles.inlineField}>
                  <Text style={styles.inlineLabel}>{t('vehicleDetail.mileage')}</Text>
                  <Input value={newMileage} onChangeText={setNewMileage} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.mileageButtons}>
                <Button
                  title={t('common.save')}
                  onPress={handleUpdateYearAndMileage}
                  size="small"
                  style={styles.mileageButton}
                />
                <Button
                  title={t('common.cancel')}
                  onPress={() => {
                    setEditingYear(false);
                    setNewYear(String(vehicle.year || ''));
                    setNewMileage(vehicle.mileage.toString());
                  }}
                  variant="outline"
                  size="small"
                  style={styles.mileageButton}
                />
              </View>
            </Card>
          )}

          <Text style={styles.sectionHeading}>
            {t('vehicleDetail.sectionReminders')} ({vehicleRemindersActive.length})
          </Text>
          {upcomingVehicleReminders.length === 0 ? (
            <Text style={styles.emptyHint}>{t('vehicleDetail.noReminders')}</Text>
          ) : (
            upcomingVehicleReminders.slice(0, 3).map((r) => {
              const days = getDaysUntilReminder(r.next_service_date);
              const urgent = days <= 7;
              return (
                <View key={r.id} style={styles.reminderRow}>
                  <View
                    style={[
                      styles.reminderIconWrap,
                      urgent ? styles.reminderIconWrapUrgent : styles.reminderIconWrapMuted,
                    ]}
                  >
                    <Icon
                      name="notification"
                      size={16}
                      color={urgent ? COLORS.background : COLORS.accent}
                    />
                  </View>
                  <View style={styles.reminderBody}>
                    <Text style={styles.reminderTitle} numberOfLines={1}>
                      {reminderTitle(r)}
                    </Text>
                    <Text style={styles.reminderDue}>
                      {formatDate(r.next_service_date)}
                      {days >= 0 ? ` · ${days} ${t('vehicleDetail.daysShort')}` : ''}
                    </Text>
                  </View>
                  {urgent ? (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>{t('vehicleDetail.soonBadge')}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          <TouchableOpacity onPress={() => onNavigateToReminders(vehicle.id)} activeOpacity={0.85}>
            <Text style={styles.sectionLink}>{t('vehicleDetail.allReminders')}</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionHeading, { marginTop: SPACING.lg }]}>
            {t('vehicleDetail.sectionSummary')}
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardLabel}>{t('vehicleDetail.totalExpenses')}</Text>
              <Text style={styles.summaryCardValue} numberOfLines={1}>
                {expenseStats.total.toLocaleString(locale)} {currencyCode}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardLabel}>{t('vehicleDetail.recordsCount')}</Text>
              <Text style={styles.summaryCardValue}>{expenseStats.count}</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>{t('vehicleDetail.sectionQuickLinks')}</Text>
          <View style={styles.quickLinksGrid}>
            <TouchableOpacity style={styles.quickLink} onPress={onNavigateToStatistics} activeOpacity={0.85}>
              <Icon name="pie-chart" size={16} color={COLORS.accent} />
              <Text style={styles.quickLinkLabel}>{t('actions.statistics')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => onNavigateToHistory(vehicle.id)}
              activeOpacity={0.85}
            >
              <Icon name="history" size={16} color={COLORS.accent} />
              <Text style={styles.quickLinkLabel}>{t('navigation.history')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={onNavigateToRecommendations}
              activeOpacity={0.85}
            >
              <Icon name="sparkles" size={16} color={COLORS.accent} />
              <Text style={styles.quickLinkLabel}>{t('navigation.recommendations')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickLink} onPress={openDocuments} activeOpacity={0.85}>
              <Icon name="file" size={16} color={COLORS.accent} />
              <Text style={styles.quickLinkLabel}>{t('documents.title')}</Text>
              {!isPro ? <Icon name="lock" size={12} color={COLORS.textMuted} /> : null}
            </TouchableOpacity>
          </View>

          <Button
            title={t('vehicleDetail.deleteVehicle')}
            onPress={handleDeleteVehicle}
            variant="destructive"
            icon="delete"
            size="medium"
            style={styles.deleteVehicleButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default VehicleDetailScreen;
