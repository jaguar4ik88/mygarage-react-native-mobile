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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import ScreenBackLink from '../components/ScreenBackLink';
import ReminderModal from '../components/ReminderModal';
import { COLORS, FONTS, SPACING, RADIUS, ACTION_COLORS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { Reminder, Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Analytics from '../services/analyticsService';
import NotificationService from '../services/notificationService';
import { useTheme } from '../contexts/ThemeContext';

/** Дней до даты (локальный полдень), отрицательное = просрочено */
function daysUntilDue(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function isUrgentReminder(reminder: Reminder): boolean {
  if (!reminder.is_active) return false;
  const days = daysUntilDue(reminder.next_service_date);
  return days <= 14;
}

interface RemindersScreenProps {
  navigation?: unknown;
}

const RemindersScreen: React.FC<RemindersScreenProps> = () => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const { appearanceKey } = useTheme();
  const { isGuest, promptToLogin, user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vehicleById, setVehicleById] = useState<Record<number, Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const styles = useMemo(() => createStyles(), [appearanceKey]);

  useEffect(() => {
    setLoading(false);
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  useEffect(() => {
    NotificationService.setReminderStatusUpdateCallback(updateReminderStatus);
  }, []);

  const updateReminderStatus = useCallback((reminderId: number, isActive: boolean) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, is_active: isActive } : r))
    );
  }, []);

  const checkNotificationPermissions = async () => {
    try {
      const { status } = await NotificationService.getPermissions();
      if (status !== 'granted') {
        Alert.alert(t('reminders.error'), t('reminders.notificationsHint'), [
          { text: t('common.ok') },
        ]);
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [data, vehicles] = await Promise.all([
        ApiService.getReminders(user.id),
        ApiService.getVehicles(),
      ]);
      setReminders(data);
      setVehicleById(Object.fromEntries(vehicles.map((v) => [v.id, v])));

      try {
        await NotificationService.scheduleAllReminders(data);
      } catch (e) {
        console.warn('Failed to schedule notifications:', e);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDeleteReminder = async (reminderId: number) => {
    Alert.alert(t('reminders.deleteReminder'), t('reminders.deleteConfirm'), [
      { text: t('reminders.cancel'), style: 'cancel' },
      {
        text: t('reminders.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteReminder(reminderId);
            await Analytics.track('reminder_delete', { reminder_id: reminderId });
            await loadData();
          } catch (error) {
            console.error('Error deleting reminder:', error);
            Alert.alert(t('reminders.error'), t('reminders.failedToDeleteReminder'));
          }
        },
      },
    ]);
  };

  const handleAddReminder = () => {
    if (isGuest) {
      promptToLogin();
      return;
    }
    setIsModalOpen(true);
  };

  const handleReminderAdded = () => {
    Analytics.track('reminder_add');
    loadData();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale =
      language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  /** Активные (ещё не отработаны) — срочные выше, затем по дате */
  const activeSorted = useMemo(() => {
    return reminders
      .filter((r) => r.is_active)
      .sort((a, b) => {
        const ua = isUrgentReminder(a) ? 0 : 1;
        const ub = isUrgentReminder(b) ? 0 : 1;
        if (ua !== ub) return ua - ub;
        return (
          new Date(a.next_service_date).getTime() - new Date(b.next_service_date).getTime()
        );
      });
  }, [reminders]);

  /** Отработанные — новее сверху */
  const archivedSorted = useMemo(() => {
    return reminders
      .filter((r) => !r.is_active)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [reminders]);

  const reminderTitle = (r: Reminder) =>
    r.title?.trim() ? r.title : t(`reminders.types.${r.type}`);

  const vehicleLabel = (vehicleId: number) => {
    const v = vehicleById[vehicleId];
    if (!v) return t('reminders.unknownVehicle');
    return `${v.make} ${v.model}`.trim() || t('reminders.unknownVehicle');
  };

  const renderReminderRow = (reminder: Reminder, opts: { allowUrgent: boolean }) => {
    const urgent = opts.allowUrgent && reminder.is_active && isUrgentReminder(reminder);
    const muted = !reminder.is_active;
    const subtitle = `${vehicleLabel(reminder.vehicle_id)} · ${formatDate(
      reminder.next_service_date
    )}`;

    return (
      <View key={reminder.id} style={[styles.row, muted && styles.rowMuted]}>
        <View
          style={[styles.iconWrap, urgent ? styles.iconWrapUrgent : styles.iconWrapNormal]}
        >
          <Icon
            name={reminder.type}
            size={22}
            color={urgent ? COLORS.background : COLORS.textSecondary}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, muted && styles.rowTitleMuted]} numberOfLines={1}>
            {reminderTitle(reminder)}
          </Text>
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteReminder(reminder.id)}
          style={styles.deleteBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('reminders.delete')}
        >
          <Icon name="delete" size={18} color={ACTION_COLORS.colorDelete} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {navigation.canGoBack() ? (
          <ScreenBackLink onPress={() => navigation.goBack()} />
        ) : null}

        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>{t('reminders.title')}</Text>
            <Text style={styles.pageSub}>{t('reminders.pageSubtitle')}</Text>
          </View>
          {!isGuest ? (
            <TouchableOpacity
              onPress={handleAddReminder}
              style={styles.addFab}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('reminders.addReminder')}
            >
              <Icon name="plus" size={20} color={COLORS.background} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading && reminders.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="notification" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t('reminders.noReminders')}</Text>
            <Text style={styles.emptyText}>{t('reminders.noRemindersText')}</Text>
          </View>
        ) : (
          <View style={styles.sections}>
            {activeSorted.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>
                  {t('reminders.sectionSoon').toUpperCase()}
                </Text>
                <View style={styles.sectionList}>
                  {activeSorted.map((r) => renderReminderRow(r, { allowUrgent: true }))}
                </View>
              </View>
            ) : null}

            {archivedSorted.length > 0 ? (
              <View
                style={[styles.section, activeSorted.length > 0 && styles.sectionDivider]}
              >
                <Text style={styles.sectionHeading}>
                  {t('reminders.sectionArchive').toUpperCase()}
                </Text>
                <View style={styles.sectionList}>
                  {archivedSorted.map((r) => renderReminderRow(r, { allowUrgent: false }))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <ReminderModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReminderAdded={handleReminderAdded}
        editingReminder={null}
        userId={user?.id || null}
      />
    </SafeAreaView>
  );
};

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.md,
      paddingTop: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    pageHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    pageTitle: {
      fontFamily: FONTS.bold,
      fontSize: 28,
      letterSpacing: -0.4,
      color: COLORS.text,
      marginBottom: 6,
    },
    pageSub: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    addFab: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.xs,
    },
    loaderWrap: {
      paddingVertical: SPACING.xl,
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
    },
    emptyTitle: {
      fontFamily: FONTS.bold,
      fontSize: 18,
      color: COLORS.text,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },
    emptyText: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    sections: {
      gap: 0,
    },
    section: {
      marginBottom: SPACING.sm,
    },
    sectionDivider: {
      marginTop: SPACING.md,
      paddingTop: SPACING.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
    },
    sectionHeading: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      letterSpacing: 2,
      color: COLORS.accent,
      marginBottom: SPACING.md,
    },
    sectionList: {
      gap: SPACING.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    rowMuted: {
      opacity: 0.55,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapUrgent: {
      backgroundColor: COLORS.accent,
    },
    iconWrapNormal: {
      backgroundColor: hexToRgba(COLORS.text, 0.07),
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontFamily: FONTS.semiBold,
      fontSize: 14,
      color: COLORS.text,
      marginBottom: 4,
    },
    rowTitleMuted: {
      textDecorationLine: 'line-through',
      color: COLORS.textMuted,
    },
    rowSub: {
      fontFamily: FONTS.regular,
      fontSize: 12,
      color: COLORS.textSecondary,
      lineHeight: 16,
    },
    deleteBtn: {
      padding: SPACING.xs,
    },
  });
}

export default RemindersScreen;
