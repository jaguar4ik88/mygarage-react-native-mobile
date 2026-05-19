import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '../components/Icon';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Vehicle } from '../types';

interface RecommendationsScreenProps {
  navigation?: any;
}

const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({
  navigation: navigationProp,
}) => {
  const { t, language } = useLanguage();
  const { appearanceKey } = useTheme();
  const styles = useMemo(() => createStyles(), [appearanceKey]);
  const hookNav = useNavigation();
  const navigation = navigationProp ?? hookNav;
  const { user, isGuest } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadVehicles();
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    if (vehicles.length > 0) {
      loadRecommendationsForSelected();
    }
  }, [vehicles, selectedIndex, language]);

  useEffect(() => {
    if (isGuest || !user?.id) {
      setIsInitialLoading(false);
      return;
    }
    if (vehicles.length > 0 || user?.id) {
      setIsInitialLoading(false);
    }
  }, [vehicles.length, user?.id, isGuest]);

  const loadVehicles = async () => {
    try {
      const list = await ApiService.getVehicles();
      setVehicles(list);
      if (list.length === 0) {
        setRecommendations([]);
      }
    } catch {
      // silent
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
      let recos = await ApiService.getCarRecommendationsForCar(
        v.make,
        v.model,
        v.year,
        v.mileage,
        language
      );
      if (!recos || recos.length === 0) {
        recos = await ApiService.getCarRecommendationsForCar(
          v.make,
          v.model,
          undefined,
          undefined,
          language
        );
      }
      setRecommendations(recos || []);
      setPage(1);
    } catch {
      setRecommendations([]);
      setPage(1);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const renderVehicleChip = useCallback(
    (item: Vehicle, index: number) => {
      const isActive = index === selectedIndex;
      return (
        <TouchableOpacity
          onPress={() => setSelectedIndex(index)}
          style={[styles.vehicleChip, isActive && styles.vehicleChipActive]}
          activeOpacity={0.85}
        >
          <Icon name="car" size={16} color={isActive ? COLORS.background : COLORS.textSecondary} />
          <Text
            style={[styles.vehicleChipText, isActive && styles.vehicleChipTextActive]}
            numberOfLines={1}
          >
            {item.make} {item.model} {item.year || ''}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedIndex, styles]
  );

  const getLocalizedText = (rec: any) => {
    const translations = (rec?.translations || []) as Array<{ locale: string; recommendation: string }>;
    const byLocale = Object.fromEntries(translations.map((tr) => [tr.locale, tr.recommendation]));
    return byLocale[language] || byLocale['ru'] || byLocale['uk'] || byLocale['en'] || '';
  };

  /**
   * Рекомендации без изображений: игнорируем любые URL картинок из API.
   */
  const sanitizeRecommendationBody = (rec: any): string => {
    const raw = getLocalizedText(rec);
    if (!raw || typeof raw !== 'string') return '';
    return raw.replace(/!\[[^\]]*]\([^)]+\)/g, '').replace(/https?:\/\/[^\s]+\.(png|jpe?g|gif|webp)(\?[^\s]*)?/gi, '');
  };

  const dataPaged = recommendations.slice(0, page * pageSize);
  const hasMore = dataPaged.length < recommendations.length;

  const loadMore = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setIsLoadingMore(false);
    }, 50);
  };

  const renderRecommendation = useCallback(
    ({ item }: { item: any }) => {
      const section = item?.manual_section || item?.manualSection;
      const slug = section?.slug;
      const normalizedKey = (slug || section?.key || '')
        ? String(slug || section?.key).replace(/-/g, '_')
        : '';
      const localized = normalizedKey ? t(`manual.sections.${normalizedKey}`) : '';
      const backendLocalized = section?.localized_title;
      const sectionTitle =
        backendLocalized ||
        (localized && normalizedKey && localized !== `manual.sections.${normalizedKey}`
          ? localized
          : '') ||
        section?.title ||
        section?.key ||
        item?.item;

      const bodyText = sanitizeRecommendationBody(item);

      return (
        <View style={styles.recRow}>
          <View style={styles.recIconWrap}>
            <Icon name="lightbulb" size={22} color={COLORS.textSecondary} />
          </View>
          <View style={styles.recBody}>
            <Text style={styles.recTitle} numberOfLines={3}>
              {sectionTitle}
            </Text>
            {!!item.year && <Text style={styles.recMeta}>{item.year}</Text>}
            <Text style={styles.recInterval}>
              {t('recommendations.replacementInterval')}: {item.mileage_interval?.toString()}{' '}
              {t('common.kilometers')}
            </Text>
            {bodyText ? <Text style={styles.recText}>{bodyText}</Text> : null}
          </View>
        </View>
      );
    },
    [styles, t, language]
  );

  const ListFooter = () => (
    <View style={styles.listFooter}>
      {isLoadingMore ? <ActivityIndicator color={COLORS.accent} /> : null}
      {!isLoadingMore && hasMore ? (
        <Text style={styles.loadMoreHint}>{t('common.pullToLoadMore')}</Text>
      ) : null}
    </View>
  );

  const current = vehicles[selectedIndex];
  const missingYear = current && (!current.year || current.year <= 0);
  const showBack =
    typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const listHeader = useMemo(
    () => (
      <>
        {isInitialLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        ) : null}

        {showBack ? <ScreenBackLink onPress={() => navigation.goBack()} /> : null}

        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>{t('navigation.recommendations')}</Text>
            <Text style={styles.pageSub}>{t('recommendations.pageSubtitle')}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {vehicles.map((v, idx) => (
            <View key={v.id} style={styles.chipWrap}>
              {renderVehicleChip(v, idx)}
            </View>
          ))}
        </ScrollView>

        {vehicles.length === 0 ? (
          <View style={styles.bannerMuted}>
            <Text style={styles.bannerText}>{t('common.noVehicles')}</Text>
          </View>
        ) : null}

        {current && missingYear ? (
          <View style={styles.bannerWarn}>
            <Text style={styles.bannerTitle}>{t('recommendations.missingYearTitle')}</Text>
            <Text style={styles.bannerSub}>{t('recommendations.missingYearText')}</Text>
          </View>
        ) : null}

        {current && !missingYear && dataPaged.length === 0 ? (
          <View style={styles.bannerMuted}>
            <Text style={styles.bannerTitle}>{t('recommendations.noDataTitle')}</Text>
            <Text style={styles.bannerSub}>{t('recommendations.noDataText')}</Text>
          </View>
        ) : null}

        {current && !missingYear && dataPaged.length > 0 ? (
          <Text style={styles.sectionHeading}>{t('recommendations.sectionList').toUpperCase()}</Text>
        ) : null}
      </>
    ),
    [
      current,
      dataPaged.length,
      isInitialLoading,
      missingYear,
      navigation,
      renderVehicleChip,
      showBack,
      styles,
      t,
      vehicles,
    ]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={missingYear ? [] : dataPaged}
        renderItem={renderRecommendation}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        ListFooterComponent={<ListFooter />}
        onEndReachedThreshold={0.25}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    listContent: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    loaderWrap: {
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    pageHeader: {
      marginBottom: SPACING.lg,
      paddingTop: SPACING.sm,
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
    chipsScroll: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: SPACING.md,
      gap: SPACING.sm,
    },
    chipWrap: {
      marginRight: SPACING.sm,
    },
    vehicleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      maxWidth: 260,
    },
    vehicleChipActive: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    vehicleChipText: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.text,
      flexShrink: 1,
    },
    vehicleChipTextActive: {
      color: COLORS.background,
    },
    sectionHeading: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      letterSpacing: 2,
      color: COLORS.accent,
      marginBottom: SPACING.md,
    },
    recRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    recIconWrap: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: hexToRgba(COLORS.text, 0.07),
      alignItems: 'center',
      justifyContent: 'center',
    },
    recBody: {
      flex: 1,
      minWidth: 0,
    },
    recTitle: {
      fontFamily: FONTS.semiBold,
      fontSize: 15,
      color: COLORS.text,
      marginBottom: 4,
    },
    recMeta: {
      fontFamily: FONTS.regular,
      fontSize: 12,
      color: COLORS.textMuted,
      marginBottom: 4,
    },
    recInterval: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: SPACING.sm,
    },
    recText: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.text,
      lineHeight: 20,
    },
    bannerMuted: {
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    bannerWarn: {
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: hexToRgba(COLORS.accent, 0.45),
      backgroundColor: hexToRgba(COLORS.accent, 0.08),
    },
    bannerTitle: {
      fontFamily: FONTS.bold,
      fontSize: 15,
      color: COLORS.text,
      marginBottom: 6,
    },
    bannerSub: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    bannerText: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textSecondary,
    },
    listFooter: {
      paddingVertical: SPACING.lg,
      alignItems: 'center',
    },
    loadMoreHint: {
      textAlign: 'center',
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textMuted,
    },
  });
}

export default RecommendationsScreen;
