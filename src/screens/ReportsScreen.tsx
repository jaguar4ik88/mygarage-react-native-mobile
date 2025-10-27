import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { COLORS } from '../constants';
import DonutChart from '../components/DonutChart';
import Icon from '../components/Icon';
import api from '../services/api';
import { Vehicle, ServiceHistory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type RangeMode = 'month' | 'year';

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const yearStart = (y: number) => new Date(y, 0, 1);
const yearEnd = (y: number) => new Date(y, 11, 31, 23, 59, 59, 999);

const formatCurrency = (n: number) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(n);

const ReportsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { user, isGuest } = useAuth();
  const [mode, setMode] = useState<RangeMode>('month');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [records, setRecords] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Color pool for expense types
  const COLOR_POOL = ['#FFD400', '#FF6F00', '#FFC107', '#60a5fa', '#ef4444', '#22c55e', '#a78bfa', '#f59e0b', '#10b981', '#f472b6', '#fb7185', '#94a3b8', '#34d399', '#9ca3af', '#f97316', '#84cc16', '#e11d48', '#7c3aed', '#0ea5e9', '#06b6d4'];

  // Assign colors to expense types from database
  const typeColors = useMemo(() => {
    const colors: Record<string, string> = {};
    expenseTypes.forEach((type, index) => {
      colors[type.slug] = COLOR_POOL[index % COLOR_POOL.length];
    });
    return colors;
  }, [expenseTypes]);

  useEffect(() => {
    (async () => {
      const vs = await api.getVehicles();
      setVehicles(vs);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const types = await api.getExpenseTypes(t('common.locale'));
      setExpenseTypes(types.map(type => ({ id: type.id, slug: type.slug, name: type.translations?.[t('common.locale')] || type.name })));
    })();
  }, [t]);

  useEffect(() => {
    if (user?.id) {
      (async () => {
        setLoading(true);
        try {
          // Используем данные пользователя из контекста, а не делаем новый запрос
          const hist = await api.getExpensesHistory(user.id);
          setRecords(hist);
        } catch (error) {
          console.error('Error loading reports data:', error);
          setRecords([]);
        } finally {
          setLoading(false);
        }
      })();
    } else if (isGuest) {
      // Для гостевого режима показываем пустой экран без загрузки
      setLoading(false);
    }
  }, [user?.id, isGuest, mode, cursor, selectedVehicleId, typeFilter]);

  const { from, to, title } = useMemo(() => {
    if (mode === 'month') {
      const f = monthStart(cursor);
      const t = monthEnd(cursor);
      const title = `${f.toLocaleString('ru-RU', { month: 'long' })} - ${t.getFullYear()}`;
      return { from: f, to: t, title };
    }
    const y = cursor.getFullYear();
    return { from: yearStart(y), to: yearEnd(y), title: String(y) };
  }, [mode, cursor]);

  // Helpers
  const getRecordTypeSlug = (r: ServiceHistory): string => {
    if (r.expense_type_id) {
      const found = expenseTypes.find(t => t.id === r.expense_type_id);
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
    return records.filter(r => {
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
      .filter(r => r.value > 0)
      .map((row) => ({ value: row.value, color: typeColors[row.slug] || '#9ca3af' }));
  }, [byType, typeColors]);

  const move = (delta: number) => {
    if (mode === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    } else {
      setCursor(new Date(cursor.getFullYear() + delta, 0, 1));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{t('reports.title')}</Text>

      <View style={styles.segment}>
        <TouchableOpacity onPress={() => setMode('month')} style={[styles.segmentBtn, mode==='month' && styles.segmentActive]}> 
          <Text style={[styles.segmentText, mode==='month' && styles.segmentTextActive]}>{t('reports.months')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('year')} style={[styles.segmentBtn, mode==='year' && styles.segmentActive]}>
          <Text style={[styles.segmentText, mode==='year' && styles.segmentTextActive]}>{t('reports.years')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 12 }}>
        <FlatList
          data={vehicles}
          horizontal
          keyExtractor={(v) => String(v.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const selected = selectedVehicleId === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedVehicleId(selected ? null : item.id)}
                style={[styles.vehiclePill, selected && styles.vehiclePillActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.vehiclePillText, selected && styles.vehiclePillTextActive]} numberOfLines={1}>
                  {item.make} {item.model}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => setTypeFilter(null)} style={[styles.filterPill, !typeFilter && styles.filterPillActive]}>
          <Text style={[styles.filterText, !typeFilter && styles.filterTextActive]}>{t('common.all')}</Text>
        </TouchableOpacity>
        {expenseTypes.map(t => (
          <TouchableOpacity 
            key={t.id} 
            onPress={() => setTypeFilter(t.slug)} 
            style={[
              styles.filterPill, 
              typeFilter===t.slug && styles.filterPillActive,
              { 
                backgroundColor: typeColors[t.slug] || COLORS.card,
                opacity: typeFilter===t.slug ? 1 : 0.6,
                borderColor: typeFilter===t.slug ? '#ef4444' : COLORS.border,
                borderWidth: typeFilter===t.slug ? 2 : 1
              }
            ]}
          >
            <Text style={[styles.filterText, typeFilter===t.slug && styles.filterTextActive]}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.periodNav}>
        <TouchableOpacity onPress={() => move(-1)} style={styles.arrowBtn}>
          <Icon name="chevron-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.periodTitle}>{title}</Text>
        <TouchableOpacity onPress={() => move(1)} style={styles.arrowBtn}>
          <Icon name="chevron-right" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>{t('reports.averagePer')} {mode === 'month' ? t('reports.month') : t('reports.year')}</Text>
        <Text style={styles.cardTitle}>{formatCurrency(total)}</Text>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <DonutChart slices={slices} />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>∑ {t('reports.totalExpenses')}</Text>
          <Text style={styles.cardFooterText}>{formatCurrency(total)}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {byType.map((row) => (
          <View key={row.slug} style={styles.typeRow}>
            <Text style={styles.typeLabel}>{expenseTypes.find(t => t.slug===row.slug)?.name || row.slug}</Text>
            <Text style={styles.typeValue}>{formatCurrency(row.value)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, paddingHorizontal: 16, paddingTop: 24 },
  segment: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginRight: 10, backgroundColor: COLORS.card },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { color: COLORS.text, fontWeight: '600' },
  segmentTextActive: { color: '#000' },
  vehiclePill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.card },
  vehiclePillActive: { backgroundColor: COLORS.primary },
  vehiclePillText: { color: COLORS.text },
  vehiclePillTextActive: { color: '#000', fontWeight: '700' },
  filterPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.card },
  filterPillActive: { backgroundColor: COLORS.primary },
  filterText: { color: COLORS.text },
  filterTextActive: { color: '#000', fontWeight: '700' },
  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  arrowBtn: { padding: 8 },
  periodTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  card: { marginTop: 12, marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardSubtitle: { color: COLORS.textSecondary },
  cardTitle: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 4 },
  cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between' },
  cardFooterText: { color: COLORS.text, fontWeight: '600' },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  typeLabel: { color: COLORS.text, fontWeight: '600' },
  typeValue: { color: COLORS.text, fontWeight: '700' },
});

export default ReportsScreen;


