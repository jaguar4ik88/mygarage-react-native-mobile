import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  COLORS,
  CHART_COLOR_POOL_LIGHT,
  CHART_COLOR_POOL_PRECISION,
  FONTS,
  SPACING,
  RADIUS,
  hexToRgba,
} from '../constants';
import DonutChart from '../components/DonutChart';
import Icon from '../components/Icon';
import ScreenBackLink from '../components/ScreenBackLink';
import api from '../services/api';
import { Vehicle, ServiceHistory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type RangeMode = 'month' | 'year';

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const yearStart = (y: number) => new Date(y, 0, 1);
const yearEnd = (y: number) => new Date(y, 11, 31, 23, 59, 59, 999);

const ReportsScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const { user, isGuest } = useAuth();
  const { appearanceKey, colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(), [appearanceKey]);

  const [mode, setMode] = useState<RangeMode>('month');
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<Array<{ id: number; slug: string; name: string }>>(
    []
  );
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [records, setRecords] = useState<ServiceHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const chartPool =
    colorScheme === 'precision' ? CHART_COLOR_POOL_PRECISION : CHART_COLOR_POOL_LIGHT;

  const typeColors = useMemo(() => {
    const colors: Record<string, string> = {};
    expenseTypes.forEach((type, index) => {
      colors[type.slug] = chartPool[index % chartPool.length];
    });
    return colors;
  }, [expenseTypes, chartPool]);

  const loc = language === 'uk' ? 'uk-UA' : language === 'en' ? 'en-US' : 'ru-RU';

  const showBack = typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const loadRecords = async () => {
    if (!user?.id) return;
    try {
      const hist = await api.getExpensesHistory(user.id);
      setRecords(hist);
    } catch (error) {
      console.error('Error loading reports data:', error);
      setRecords([]);
    }
  };

  useEffect(() => {
    (async () => {
      const vs = await api.getVehicles();
      setVehicles(vs);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const types = await api.getExpenseTypes(language);
      setExpenseTypes(
        types.map((type) => ({
          id: type.id,
          slug: type.slug,
          name: type.translations?.[language] || type.name,
        }))
      );
    })();
  }, [language]);

  useEffect(() => {
    if (user?.id) {
      loadRecords();
    } else if (isGuest) {
      setRecords([]);
    }
  }, [user?.id, isGuest]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const { from, to, periodLabel } = useMemo(() => {
    if (mode === 'month') {
      const f = monthStart(cursor);
      const te = monthEnd(cursor);
      const label = `${f.toLocaleString(loc, { month: 'long' })} ${f.getFullYear()}`;
      return { from: f, to: te, periodLabel: label };
    }
    const y = cursor.getFullYear();
    return { from: yearStart(y), to: yearEnd(y), periodLabel: String(y) };
  }, [mode, cursor, loc]);

  const getRecordTypeSlug = (r: ServiceHistory): string => {
    if (r.expense_type_id) {
      const found = expenseTypes.find((ty) => ty.id === r.expense_type_id);
      if (found?.slug) return found.slug;
    }
    return (r as any).type || 'other';
  };

  const getCost = (r: ServiceHistory): number => {
    const raw = (r as any).cost ?? (r as any).amount ?? 0;
    const n = typeof raw === 'string' ? Number(raw.replace(/[^0-9.\-]/g, '')) : Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const d = new Date((r as any).service_date || r.created_at || r.updated_at || Date.now());
      if (d < from || d > to) return false;
      if (selectedVehicleId && r.vehicle_id !== selectedVehicleId) return false;
      if (typeFilter && getRecordTypeSlug(r) !== typeFilter) return false;
      return true;
    });
  }, [records, from, to, selectedVehicleId, typeFilter, expenseTypes]);

  const total = useMemo(() => filtered.reduce((s, r) => s + getCost(r), 0), [filtered]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const key = getRecordTypeSlug(r) || 'other';
      map.set(key, (map.get(key) || 0) + getCost(r));
    }
    return Array.from(map.entries()).map(([slug, value]) => ({ slug, value }));
  }, [filtered, expenseTypes]);

  const slices = useMemo(() => {
    return byType
      .filter((r) => r.value > 0)
      .map((row) => ({
        value: row.value,
        color: typeColors[row.slug] || COLORS.textMuted,
      }));
  }, [byType, typeColors]);

  const move = (delta: number) => {
    if (mode === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    } else {
      setCursor(new Date(cursor.getFullYear() + delta, 0, 1));
    }
  };

  const formatCurrency = (n: number) => {
    const currency = user?.currency || 'UAH';
    return new Intl.NumberFormat(loc, { style: 'currency', currency }).format(n);
  };

  const donutBg = hexToRgba(COLORS.border, 0.22);

  const canExportPdf =
    !!user?.id &&
    !isGuest &&
    (user.plan_type === 'pro' || user.plan_type === 'premium');

  const navigateToExport = useCallback(() => {
    let nav: any = navigation as any;
    while (nav) {
      try {
        const names = nav.getState?.()?.routeNames;
        if (Array.isArray(names) && names.includes('Export')) {
          nav.navigate('Export');
          return;
        }
      } catch {
        /* ignore broken getState during hybrid navigators */
      }
      nav = typeof nav.getParent === 'function' ? nav.getParent() : undefined;
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          user?.id ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          ) : undefined
        }
      >
        {showBack ? <ScreenBackLink onPress={() => navigation.goBack()} /> : null}

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('reports.title')}</Text>
          <Text style={styles.pageSub}>{t('actions.statisticsDescription')}</Text>
        </View>

        <Text style={styles.sectionEyebrow}>{t('export.periodSection').toUpperCase()}</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            onPress={() => setMode('month')}
            style={[styles.segmentChip, mode === 'month' && styles.segmentChipActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === 'month' && styles.segmentTextActive]}>
              {t('reports.months')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('year')}
            style={[styles.segmentChip, mode === 'year' && styles.segmentChipActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === 'year' && styles.segmentTextActive]}>
              {t('reports.years')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionEyebrow, styles.sectionEyebrowSpaced]}>
          {t('export.vehiclesSection').toUpperCase()}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            onPress={() => setSelectedVehicleId(null)}
            style={[styles.filterChip, selectedVehicleId === null && styles.filterChipActive]}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.filterChipText, selectedVehicleId === null && styles.filterChipTextActive]}
            >
              {t('common.all')}
            </Text>
          </TouchableOpacity>
          {vehicles.map((item) => {
            const selected = selectedVehicleId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedVehicleId(selected ? null : item.id)}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]} numberOfLines={1}>
                  {item.make} {item.model}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionEyebrow, styles.sectionEyebrowSpaced]}>
          {t('export.categoriesSection').toUpperCase()}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            onPress={() => setTypeFilter(null)}
            style={[styles.filterChip, !typeFilter && styles.filterChipActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterChipText, !typeFilter && styles.filterChipTextActive]}>
              {t('export.allCategories')}
            </Text>
          </TouchableOpacity>
          {expenseTypes.map((ty) => {
            const on = typeFilter === ty.slug;
            return (
              <TouchableOpacity
                key={ty.id}
                onPress={() => setTypeFilter(on ? null : ty.slug)}
                style={[styles.filterChip, on ? styles.categoryChipActive : styles.categoryChipIdle]}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, on && styles.filterChipTextActive]}>{ty.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.periodNav}>
          <TouchableOpacity onPress={() => move(-1)} style={styles.arrowHit} hitSlop={12}>
            <Icon name="chevron-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.periodTitle} numberOfLines={1}>
            {periodLabel}
          </Text>
          <TouchableOpacity onPress={() => move(1)} style={styles.arrowHit} hitSlop={12}>
            <Icon name="chevron-right" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardKicker}>{t('reports.totalExpenses')}</Text>
          <Text style={styles.cardTitle}>{formatCurrency(total)}</Text>
          <View style={styles.chartWrap}>
            <DonutChart slices={slices} backgroundColor={donutBg} />
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>{periodLabel}</Text>
            <Text style={styles.cardFooterText}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <View style={styles.breakdown}>
          {byType.map((row) => (
            <View key={row.slug} style={styles.typeRow}>
              <Text style={styles.typeLabel}>
                {expenseTypes.find((ty) => ty.slug === row.slug)?.name || row.slug}
              </Text>
              <Text style={styles.typeValue}>{formatCurrency(row.value)}</Text>
            </View>
          ))}
        </View>

        {canExportPdf ? (
          <TouchableOpacity
            style={styles.exportPdfBtn}
            onPress={navigateToExport}
            activeOpacity={0.9}
          >
            <Icon name="file-pdf" size={20} color={COLORS.background} />
            <Text style={styles.exportPdfBtnText}>{t('export.exportPdf')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    pageHeader: {
      paddingTop: SPACING.sm,
      marginBottom: SPACING.lg,
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
    sectionEyebrow: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      letterSpacing: 2,
      color: COLORS.accent,
      marginBottom: SPACING.md,
    },
    sectionEyebrowSpaced: {
      marginTop: SPACING.lg,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    segmentChip: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    segmentChipActive: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    segmentText: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    segmentTextActive: {
      color: COLORS.background,
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingBottom: SPACING.xs,
    },
    filterChip: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      maxWidth: 220,
    },
    filterChipActive: {
      borderColor: COLORS.accent,
      borderWidth: 2,
      backgroundColor: hexToRgba(COLORS.accent, 0.12),
    },
    categoryChipIdle: {
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    categoryChipActive: {
      borderWidth: 1,
      borderColor: COLORS.accent,
      backgroundColor: hexToRgba(COLORS.accent, 0.1),
    },
    filterChipText: {
      fontFamily: FONTS.medium,
      fontSize: 12,
      color: COLORS.textSecondary,
    },
    filterChipTextActive: {
      color: COLORS.accent,
      fontWeight: '700',
    },
    periodNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
    },
    arrowHit: {
      padding: SPACING.sm,
    },
    periodTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: FONTS.bold,
      fontSize: 17,
      color: COLORS.text,
    },
    summaryCard: {
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      marginBottom: SPACING.lg,
    },
    cardKicker: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    cardTitle: {
      fontFamily: FONTS.bold,
      fontSize: 28,
      letterSpacing: -0.4,
      color: COLORS.text,
      marginTop: 4,
    },
    chartWrap: {
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    cardFooter: {
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    cardFooterText: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      color: COLORS.text,
    },
    breakdown: {
      gap: 0,
    },
    typeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    typeLabel: {
      fontFamily: FONTS.semiBold,
      fontSize: 14,
      color: COLORS.text,
      flex: 1,
      marginRight: SPACING.md,
    },
    typeValue: {
      fontFamily: FONTS.bold,
      fontSize: 14,
      color: COLORS.accent,
    },
    exportPdfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.xl,
      marginBottom: SPACING.md,
      backgroundColor: COLORS.accent,
      borderRadius: 999,
      paddingVertical: 14,
      minHeight: 52,
    },
    exportPdfBtnText: {
      fontFamily: FONTS.bold,
      fontSize: 13,
      letterSpacing: 1,
      color: COLORS.background,
    },
  });
}

export default ReportsScreen;
