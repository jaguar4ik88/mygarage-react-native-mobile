import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle } from '../types';

const RecommendationsScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, isGuest } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  useEffect(() => {
    if (user?.id) {
      loadVehicles();
    } else if (isGuest) {
      // Для гостевого режима показываем пустой экран без загрузки
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    if (vehicles.length > 0) {
      loadRecommendationsForSelected();
    }
  }, [vehicles, selectedIndex, language]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const list = await ApiService.getVehicles();
      setVehicles(list);
      if (list.length === 0) {
        setRecommendations([]);
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('common.failedToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendationsForSelected = async () => {
    try {
      const v = vehicles[selectedIndex];
      if (!v) return;
      if (!v.year || v.year <= 0) {
        setRecommendations([]);
        return;
      }
      let recos = await ApiService.getCarRecommendationsForCar(v.make, v.model, v.year, v.mileage, language);
      // Клиентский fallback: если по году пусто, пробуем без года (все периоды)
      if (!recos || recos.length === 0) {
        recos = await ApiService.getCarRecommendationsForCar(v.make, v.model, undefined, undefined, language);
      }
      setRecommendations(recos || []);
      setPage(1);
    } catch (e) {
      setRecommendations([]);
      setPage(1);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const renderVehicleChip = ({ item, index }: { item: Vehicle; index: number }) => {
    const isActive = index === selectedIndex;
    return (
      <TouchableOpacity
        onPress={() => setSelectedIndex(index)}
        style={[styles.vehicleChip, isActive && styles.vehicleChipActive]}
        activeOpacity={0.8}
      >
        <Icon name="car" size={16} color={isActive ? COLORS.card : COLORS.text} />
        <Text style={[styles.vehicleChipText, isActive && styles.vehicleChipTextActive]} numberOfLines={1}>
          {item.make} {item.model} {item.year || ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const getLocalizedText = (rec: any) => {
    const translations = (rec?.translations || []) as Array<{ locale: string; recommendation: string }>;
    const byLocale = Object.fromEntries(translations.map(t => [t.locale, t.recommendation]));
    return byLocale[language] || byLocale['ru'] || byLocale['uk'] || byLocale['en'] || '';
  };

  const dataPaged = recommendations.slice(0, page * pageSize);
  const hasMore = dataPaged.length < recommendations.length;

  const loadMore = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    // Simulate async tick to keep UX consistent
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoadingMore(false);
    }, 50);
  };

  const renderRecommendation = ({ item }: { item: any }) => {
    const section = item?.manual_section || item?.manualSection;
    const slug = section?.slug;
    const normalizedKey = (slug || section?.key || '')
      ? String(slug || section?.key).replace(/-/g, '_')
      : '';
    const localized = normalizedKey ? t(`manual.sections.${normalizedKey}`) : '';
    const backendLocalized = section?.localized_title;
    const sectionTitle = backendLocalized
      || ((localized && normalizedKey && localized !== `manual.sections.${normalizedKey}`) ? localized : '')
      || section?.title
      || section?.key
      || item?.item;

    return (
    <Card key={`${item.id}`} style={styles.card}>
      <Text style={styles.itemTitle}>{sectionTitle}</Text>
      {!!item.year && (
        <Text style={styles.itemSubtitle}>{item.year}</Text>
      )}
      <Text style={styles.itemIntervalLine}>
        {t('recommendations.replacementInterval') || 'Интервал замены'}: {item.mileage_interval?.toString()} {t('common.kilometers') || 'км'}
      </Text>
      <Text style={styles.itemText}>{getLocalizedText(item)}</Text>
    </Card>
  ); } 

  const ListFooter = () => (
    <View style={{ paddingVertical: SPACING.lg }}>
      {isLoadingMore && <ActivityIndicator color={COLORS.accent} />}
      {!isLoadingMore && hasMore && (
        <Text style={{ textAlign: 'center', color: COLORS.textMuted }}>{t('common.pullToLoadMore') || 'Прокрутите, чтобы загрузить ещё'}</Text>
      )}
    </View>
  );

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  const current = vehicles[selectedIndex];
  const missingYear = current && (!current.year || current.year <= 0);

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <FlatList
        data={missingYear ? [] : dataPaged}
        renderItem={renderRecommendation}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            {/* Vehicle selector under the stack header */}
            <View style={styles.carouselWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vehicleChips}
              >
                <View style={styles.vehicleChipsRow}>
                  {vehicles.map((v, idx) => (
                    <View key={v.id} style={{ marginRight: SPACING.sm }}>
                      {renderVehicleChip({ item: v, index: idx } as any)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
            {vehicles.length === 0 && (
              <Card style={styles.card}>
                <Text style={styles.emptyText}>{t('common.noVehicles') || 'Нет добавленных авто'}</Text>
              </Card>
            )}
            {current && missingYear && (
              <Card style={styles.cardWarning}>
                <Text style={styles.warningTitle}>{t('recommendations.missingYearTitle') || 'Укажите год авто'}</Text>
                <Text style={styles.warningText}>
                  {t('recommendations.missingYearText') || 'Для получения рекомендаций добавьте год выпуска на странице авто.'}
                </Text>
              </Card>
            )}
            {current && !missingYear && dataPaged.length === 0 && (
              <Card style={styles.card}>
                <Text style={styles.warningTitle}>{t('recommendations.noDataTitle') || 'Нет рекомендаций'}</Text>
                <Text style={styles.warningText}>
                  {t('recommendations.noDataText') || 'Для выбранных марки, модели и года рекомендации отсутствуют.'}
                </Text>
              </Card>
            )}
          </>
        }
        ListFooterComponent={<ListFooter />}
        onEndReachedThreshold={0.25}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: SPACING.xl + 90 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  carouselWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
  },
  vehicleChips: {
    paddingHorizontal: SPACING.lg,
    paddingRight: SPACING.lg,
  },
  vehicleChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  vehicleChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  vehicleChipText: {
    color: COLORS.text,
    fontSize: 14,
    maxWidth: 220,
  },
  vehicleChipTextActive: {
    color: COLORS.card,
  },
  card: {
    margin: SPACING.lg,
    marginTop: SPACING.md,
  },
  cardWarning: {
    margin: SPACING.lg,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  warningTitle: {
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  warningText: {
    color: COLORS.textSecondary,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemInterval: {
    fontSize: 14,
    color: COLORS.accent,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  itemIntervalLine: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
  },
  itemText: {
    color: COLORS.text,
  },
});

export default RecommendationsScreen;


