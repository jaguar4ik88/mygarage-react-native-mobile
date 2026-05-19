import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import * as Sharing from 'expo-sharing';
import Icon from '../components/Icon';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/api';
import PdfExportService from '../services/pdfExportService';
import Analytics from '../services/analyticsService';
import { Vehicle, ServiceHistory } from '../types';

interface ExportScreenProps {
  navigation?: any;
}

type RangeMode = 'month' | 'quarter' | 'year' | 'all';

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const quarterStart = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
};
const quarterEnd = (d: Date) => {
  const start = quarterStart(d);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
};
const yearStart = (y: number) => new Date(y, 0, 1);
const yearEnd = (y: number) => new Date(y, 11, 31, 23, 59, 59, 999);
const ALL_TIME_FROM = new Date(1970, 0, 1);
const ALL_TIME_TO = new Date(2100, 11, 31, 23, 59, 59, 999);

const PERIOD_FLOW: { mode: RangeMode; labelKey: string }[] = [
  { mode: 'month', labelKey: 'export.periodMonth' },
  { mode: 'quarter', labelKey: 'export.periodQuarter' },
  { mode: 'year', labelKey: 'export.periodYear' },
  { mode: 'all', labelKey: 'export.allTime' },
];

function vehiclePlate(v: Vehicle): string {
  const plate = (v as unknown as { license_plate?: string }).license_plate;
  return plate?.trim() ?? '';
}

const ExportScreen: React.FC<ExportScreenProps> = ({ navigation: navigationProp }) => {
  const { t, language } = useLanguage();
  const { appearanceKey } = useTheme();
  const styles = useMemo(() => createStyles(), [appearanceKey]);
  const hookNav = useNavigation();
  const navigation = navigationProp ?? hookNav;
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<Array<{ id: number; slug: string; name: string }>>(
    []
  );

  const [rangeMode, setRangeMode] = useState<RangeMode>('month');
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const showBack = typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const { from, to, periodLabel } = useMemo(() => {
    const loc = language === 'uk' ? 'uk-UA' : language === 'en' ? 'en-US' : 'ru-RU';
    if (rangeMode === 'all') {
      return { from: ALL_TIME_FROM, to: ALL_TIME_TO, periodLabel: t('export.allTime') };
    }
    if (rangeMode === 'month') {
      const f = monthStart(cursor);
      const te = monthEnd(cursor);
      const label = `${f.toLocaleString(loc, { month: 'long' })} ${f.getFullYear()}`;
      return { from: f, to: te, periodLabel: label };
    }
    if (rangeMode === 'quarter') {
      const f = quarterStart(cursor);
      const te = quarterEnd(cursor);
      const q = Math.floor(f.getMonth() / 3) + 1;
      const label = language === 'en' ? `Q${q} ${f.getFullYear()}` : `${q} кв. ${f.getFullYear()}`;
      return { from: f, to: te, periodLabel: label };
    }
    const y = cursor.getFullYear();
    return { from: yearStart(y), to: yearEnd(y), periodLabel: String(y) };
  }, [rangeMode, cursor, language, t]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [historyResponse, vehiclesData, expenseTypesData] = await Promise.all([
        ApiService.getServiceHistory(),
        ApiService.getVehicles(),
        ApiService.getExpenseTypes(language),
      ]);

      setHistory(historyResponse.data || []);
      setVehicles(vehiclesData || []);
      setExpenseTypes(
        (expenseTypesData || []).map((type: any) => ({
          id: type.id,
          slug: type.slug,
          name: type.translations?.[language] || type.name,
        }))
      );
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('common.errorLoading'));
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
    setTimeout(() => setRefreshing(false), 800);
  }, [user?.id]);

  const getRecordSlug = (r: ServiceHistory): string => {
    if (r.expense_type_id) {
      const found = expenseTypes.find((ty) => ty.id === r.expense_type_id);
      if (found?.slug) return found.slug;
    }
    return (r as any).type || 'other';
  };

  const filteredRecords = useMemo(() => {
    if (selectedVehicles.length === 0) return [];
    let rows = history.filter((record) => selectedVehicles.includes(record.vehicle_id));
    rows = rows.filter((record) => {
      const d = new Date(record.service_date || record.created_at || record.updated_at || Date.now());
      return d >= from && d <= to;
    });
    const catsActive =
      expenseTypes.length > 0 &&
      selectedCategories.length > 0 &&
      selectedCategories.length < expenseTypes.length;
    if (catsActive) {
      rows = rows.filter((record) => selectedCategories.includes(getRecordSlug(record)));
    }
    return rows;
  }, [history, selectedVehicles, from, to, selectedCategories, expenseTypes]);

  const filteredStats = useMemo(() => {
    const totalSpent = filteredRecords.reduce((sum, record) => {
      const cost = Number(record.cost || record.amount || 0);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

    const now = new Date();
    const startOfMonth = monthStart(now);
    const startOfYear = yearStart(now.getFullYear());

    const thisMonth = filteredRecords
      .filter((record) => new Date(record.service_date) >= startOfMonth)
      .reduce((sum, record) => {
        const cost = Number(record.cost || record.amount || 0);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);

    const thisYear = filteredRecords
      .filter((record) => new Date(record.service_date) >= startOfYear)
      .reduce((sum, record) => {
        const cost = Number(record.cost || record.amount || 0);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);

    return { totalSpent, thisMonth, thisYear };
  }, [filteredRecords]);

  const handleVehicleToggle = (vehicleId: number) => {
    setSelectedVehicles((prev) =>
      prev.includes(vehicleId) ? prev.filter((id) => id !== vehicleId) : [...prev, vehicleId]
    );
  };

  const toggleCategory = (slug: string) => {
    const allSlugs = expenseTypes.map((ty) => ty.slug);
    setSelectedCategories((prev) => {
      if (prev.length === 0 || prev.length === allSlugs.length) {
        const base = prev.length === 0 ? allSlugs : [...prev];
        return base.filter((s) => s !== slug);
      }
      if (prev.includes(slug)) {
        const next = prev.filter((s) => s !== slug);
        return next.length === 0 ? [] : next;
      }
      const next = [...prev, slug];
      return next.length === allSlugs.length ? [] : next;
    });
  };

  const isCategoryChipOn = (slug: string) =>
    selectedCategories.length === 0 ||
    selectedCategories.length === expenseTypes.length ||
    selectedCategories.includes(slug);

  const movePeriod = (delta: number) => {
    if (rangeMode === 'all') return;
    if (rangeMode === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    } else if (rangeMode === 'quarter') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta * 3, 1));
    } else {
      setCursor(new Date(cursor.getFullYear() + delta, 0, 1));
    }
  };

  const handleExport = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('auth.authRequired'));
      return;
    }

    if (selectedVehicles.length === 0) {
      Alert.alert(t('common.error'), t('export.selectAtLeastOne'));
      return;
    }

    try {
      const selectedVehiclesList = vehicles.filter((v) => selectedVehicles.includes(v.id));

      const pdfUri = await PdfExportService.exportToPdf({
        history: filteredRecords,
        vehicles: selectedVehiclesList,
        expenseTypes,
        stats: filteredStats,
        currency: user.currency || 'UAH',
        language,
        t,
        periodLabel,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: t('export.generatePdf'),
        });
      } else {
        Alert.alert(t('common.success'), t('history.pdfExported'));
      }

      await Analytics.track('pdf_export' as any, {
        record_count: filteredRecords.length,
        total_expenses: filteredStats.totalSpent,
        vehicles_count: selectedVehicles.length,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      Alert.alert(t('common.error'), t('history.pdfExportFailed'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {showBack ? <ScreenBackLink onPress={() => navigation.goBack()} /> : null}

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('export.title')}</Text>
          <Text style={styles.pageSub}>{t('actions.pdfExportDescription')}</Text>
        </View>

        <Text style={[styles.sectionMutedTitle, styles.sectionFirst]}>{t('export.vehiclesSection')}</Text>
        <View style={styles.vehicleList}>
          {vehicles.map((vehicle) => {
            const on = selectedVehicles.includes(vehicle.id);
            const plate = vehiclePlate(vehicle);
            return (
              <TouchableOpacity
                key={vehicle.id}
                style={[styles.vehicleRow, on && styles.vehicleRowSelected]}
                onPress={() => handleVehicleToggle(vehicle.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.vehicleCheckOuter, on && styles.vehicleCheckOuterOn]}>
                  {on ? <Icon name="check" size={14} color={COLORS.background} /> : null}
                </View>
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicle.make} {vehicle.model}
                </Text>
                {plate ? (
                  <Text style={styles.vehiclePlate}>{plate}</Text>
                ) : (
                  <View style={styles.vehiclePlatePlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionMutedTitle, styles.sectionSpaced]}>{t('export.periodSection')}</Text>
        <View style={styles.periodGrid}>
          {PERIOD_FLOW.map(({ mode, labelKey }) => {
            const active = rangeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setRangeMode(mode)}
                style={[styles.periodGridBtn, active ? styles.periodGridBtnOn : styles.periodGridBtnOff]}
                activeOpacity={0.85}
              >
                <Text style={[styles.periodGridBtnText, active && styles.periodGridBtnTextOn]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.periodNav}>
          {rangeMode === 'all' ? (
            <>
              <View style={styles.arrowPlaceholder} />
              <Text style={styles.periodTitle} numberOfLines={2}>
                {periodLabel}
              </Text>
              <View style={styles.arrowPlaceholder} />
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => movePeriod(-1)} style={styles.arrowHit} hitSlop={12}>
                <Icon name="chevron-left" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.periodTitle} numberOfLines={1}>
                {periodLabel}
              </Text>
              <TouchableOpacity onPress={() => movePeriod(1)} style={styles.arrowHit} hitSlop={12}>
                <Icon name="chevron-right" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[styles.sectionMutedTitle, styles.sectionSpaced]}>
          {t('export.expenseCategoriesSection')}
        </Text>
        <View style={styles.categoriesWrap}>
          {expenseTypes.map((ty) => {
            const on = isCategoryChipOn(ty.slug);
            return (
              <TouchableOpacity
                key={ty.id}
                onPress={() => toggleCategory(ty.slug)}
                style={[styles.categoryChip, on ? styles.categoryChipOn : styles.categoryChipOff]}
                activeOpacity={0.85}
              >
                <Text style={[styles.categoryChipText, on && styles.categoryChipTextOn]}>{ty.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, selectedVehicles.length === 0 && styles.primaryBtnDisabled]}
          onPress={handleExport}
          disabled={selectedVehicles.length === 0}
          activeOpacity={0.9}
        >
          <Icon name="download" size={18} color={COLORS.background} />
          <Text style={styles.primaryBtnText}>{t('export.generatePdf').toUpperCase()}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

function createStyles() {
  const accentTint = hexToRgba(COLORS.accent, 0.1);
  const accentBorder = hexToRgba(COLORS.accent, 0.35);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: SPACING.md,
      fontFamily: FONTS.regular,
      fontSize: 15,
      color: COLORS.textSecondary,
    },
    pageHeader: {
      paddingTop: SPACING.sm,
      marginBottom: SPACING.md,
    },
    proEyebrow: {
      fontFamily: FONTS.semiBold,
      fontSize: 11,
      letterSpacing: 3,
      color: COLORS.accent,
      marginBottom: SPACING.xs,
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
    proBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: accentBorder,
      backgroundColor: accentTint,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.xl,
    },
    proBannerText: {
      flex: 1,
      fontFamily: FONTS.regular,
      fontSize: 12,
      color: COLORS.textSecondary,
      lineHeight: 17,
    },
    sectionMutedTitle: {
      fontFamily: FONTS.semiBold,
      fontSize: 11,
      letterSpacing: 2.5,
      textTransform: 'uppercase',
      color: COLORS.textMuted,
      marginBottom: SPACING.md,
    },
    sectionFirst: {
      marginTop: 0,
    },
    sectionSpaced: {
      marginTop: SPACING.xl,
    },
    vehicleList: {
      gap: SPACING.sm,
      marginBottom: 0,
    },
    vehicleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    vehicleRowSelected: {
      borderColor: COLORS.accent,
      backgroundColor: accentTint,
    },
    vehicleCheckOuter: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    vehicleCheckOuterOn: {
      borderColor: COLORS.accent,
      backgroundColor: COLORS.accent,
    },
    vehicleName: {
      flex: 1,
      minWidth: 0,
      fontFamily: FONTS.semiBold,
      fontSize: 14,
      color: COLORS.text,
    },
    vehiclePlate: {
      fontFamily: FONTS.regular,
      fontSize: 12,
      color: COLORS.textSecondary,
      marginLeft: 'auto',
      maxWidth: '42%',
    },
    vehiclePlatePlaceholder: {
      width: 8,
      marginLeft: 'auto',
    },
    periodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    periodGridBtn: {
      flexGrow: 1,
      flexBasis: '47%',
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodGridBtnOff: {
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    periodGridBtnOn: {
      borderWidth: 1,
      borderColor: COLORS.accent,
      backgroundColor: accentTint,
    },
    periodGridBtnText: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    periodGridBtnTextOn: {
      color: COLORS.accent,
    },
    periodNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    arrowHit: {
      padding: SPACING.sm,
    },
    arrowPlaceholder: {
      width: 22 + SPACING.sm * 2,
      height: 22 + SPACING.sm * 2,
    },
    periodTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: FONTS.bold,
      fontSize: 16,
      color: COLORS.text,
    },
    categoriesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.xl,
    },
    categoryChip: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 999,
      borderWidth: 1,
    },
    categoryChipOff: {
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    categoryChipOn: {
      borderColor: COLORS.accent,
      backgroundColor: accentTint,
    },
    categoryChipText: {
      fontFamily: FONTS.medium,
      fontSize: 12,
      color: COLORS.textSecondary,
    },
    categoryChipTextOn: {
      color: COLORS.accent,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      backgroundColor: COLORS.accent,
      borderRadius: 999,
      paddingVertical: 16,
      minHeight: 52,
      marginTop: SPACING.md,
    },
    primaryBtnDisabled: {
      opacity: 0.45,
    },
    primaryBtnText: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      letterSpacing: 2,
      color: COLORS.background,
    },
  });
}

export default ExportScreen;
