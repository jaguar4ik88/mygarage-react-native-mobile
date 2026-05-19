import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Search, ChevronDown } from 'lucide-react-native';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

type AdviceItem = {
  title: string;
  subtitle: string;
  content: string | string[];
  icon?: string;
  pdf_url?: string;
  sectionSlug: string;
};

type SectionGroup = {
  slug: string;
  title: string;
  items: { id: string; item: AdviceItem }[];
};

const AdviceScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const { appearanceKey } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adviceData, setAdviceData] = useState<Record<string, AdviceItem> | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAdvice();
      loadSections();
    }, [language])
  );

  const loadSections = async () => {
    try {
      const apiSections = await ApiService.getAdviceSections(language);
      setSections(apiSections || []);
    } catch (e) {
      console.error('Sections API error:', e);
      setSections([]);
    }
  };

  const loadAdvice = async () => {
    try {
      const apiAdvice = await ApiService.getAdvice(language);
      const apiSections = Array.isArray(apiAdvice?.sections) ? apiAdvice.sections : [];
      if (apiSections.length === 0) {
        setAdviceData({});
        return;
      }

      const keyed: Record<string, AdviceItem> = {};
      apiSections.forEach((entry: any) => {
        if (entry?.section && Array.isArray(entry.items)) {
          const sectionSlug = entry.section.slug;
          const key = `advice.sections.${sectionSlug}`;
          const localized = t(key);
          const sectionTitle =
            !localized || localized === key ? entry.section.title || '' : localized;
          entry.items.forEach((item: any) => {
            const id = `${item.id || item.title || Math.random()}`;
            keyed[id] = {
              title: item.title || '',
              subtitle: sectionTitle,
              content: item.content || '',
              icon: item.icon,
              pdf_url: item.pdf_url,
              sectionSlug,
            };
          });
        }
      });
      setAdviceData(keyed);
    } catch (e) {
      console.error('Advice API error:', e);
      setAdviceData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAdvice(), loadSections()]);
    setRefreshing(false);
  };

  const filteredAdviceData = useMemo(() => {
    if (!adviceData) return {};
    if (!debouncedSearch) return adviceData;
    const q = debouncedSearch.toLowerCase();
    return Object.fromEntries(
      Object.entries(adviceData).filter(([_, item]) => {
        const title = (item.title || '').toLowerCase();
        const subtitle = (item.subtitle || '').toLowerCase();
        const content = Array.isArray(item.content)
          ? item.content.join(' ').toLowerCase()
          : String(item.content || '').toLowerCase();
        return title.includes(q) || subtitle.includes(q) || content.includes(q);
      })
    );
  }, [adviceData, debouncedSearch]);

  const sectionGroups: SectionGroup[] = useMemo(() => {
    const entries = Object.entries(filteredAdviceData);
    if (entries.length === 0) return [];

    const map = new Map<string, SectionGroup>();
    for (const [id, item] of entries) {
      const slug = item.sectionSlug || '__misc';
      if (!map.has(slug)) {
        map.set(slug, { slug, title: item.subtitle || slug, items: [] });
      }
      map.get(slug)!.items.push({ id, item });
    }

    const slugOrder = sections.map((s: any) => s.slug);
    const ordered: SectionGroup[] = [];
    const used = new Set<string>();

    for (const slug of slugOrder) {
      const g = map.get(slug);
      if (g?.items.length) {
        ordered.push(g);
        used.add(slug);
      }
    }
    for (const [slug, g] of map.entries()) {
      if (!used.has(slug) && g.items.length) {
        ordered.push(g);
      }
    }
    return ordered;
  }, [filteredAdviceData, sections]);

  const toggleSection = (slug: string) => {
    setOpenSlug((prev) => (prev === slug ? null : slug));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: COLORS.background,
        },
        scroll: { flex: 1 },
        scrollPad: {
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xxl,
        },
        pageTitle: {
          fontFamily: FONTS.bold,
          fontSize: 28,
          letterSpacing: -0.5,
          color: COLORS.text,
        },
        pageSub: {
          fontFamily: FONTS.regular,
          fontSize: 14,
          color: COLORS.textSecondary,
          marginTop: SPACING.xs,
          marginBottom: SPACING.lg,
          lineHeight: 20,
        },
        searchRow: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: RADIUS.pill,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surface,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm + 4,
          marginBottom: SPACING.lg,
        },
        searchIconWrap: {
          marginRight: SPACING.sm,
        },
        searchInput: {
          flex: 1,
          fontFamily: FONTS.regular,
          fontSize: 14,
          color: COLORS.text,
          padding: 0,
        },
        sectionOuter: {
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surface,
          marginBottom: SPACING.md,
          overflow: 'hidden',
        },
        sectionHeaderBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: SPACING.md,
        },
        sectionTitle: {
          fontFamily: FONTS.semiBold,
          fontSize: 14,
          color: COLORS.text,
        },
        sectionMeta: {
          fontFamily: FONTS.regular,
          fontSize: 12,
          color: COLORS.textSecondary,
          marginTop: 4,
          lineHeight: 16,
        },
        expandedInner: {
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          /** Как bg-background/40 в макете: чуть ниже по тону, чем шапка секции на surface */
          backgroundColor: COLORS.background,
          padding: SPACING.md,
        },
        articleSpacing: {
          marginTop: SPACING.md,
        },
        article: {
          borderRadius: RADIUS.lg,
          backgroundColor: COLORS.surface,
          padding: SPACING.md,
        },
        articleTitle: {
          fontFamily: FONTS.semiBold,
          fontSize: 14,
          color: COLORS.accent,
          lineHeight: 20,
        },
        articleBody: {
          fontFamily: FONTS.regular,
          fontSize: 13,
          lineHeight: 20,
          color: COLORS.textSecondary,
          marginTop: SPACING.sm,
        },
        bulletRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: SPACING.xs,
        },
        bullet: {
          color: COLORS.accent,
          fontSize: 12,
          marginRight: SPACING.sm,
          marginTop: 2,
        },
        emptySoon: {
          fontFamily: FONTS.regular,
          fontSize: 13,
          color: COLORS.textSecondary,
          textAlign: 'center',
          paddingVertical: SPACING.lg,
          lineHeight: 18,
        },
        emptyBlock: {
          alignItems: 'center',
          paddingVertical: SPACING.xxl,
          paddingHorizontal: SPACING.md,
        },
        emptyTitle: {
          fontFamily: FONTS.bold,
          fontSize: 18,
          color: COLORS.text,
          marginTop: SPACING.md,
          marginBottom: SPACING.xs,
        },
        emptyText: {
          fontFamily: FONTS.regular,
          fontSize: 14,
          color: COLORS.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
        },
        loadingRow: {
          padding: SPACING.md,
          alignItems: 'center',
        },
      }),
    [appearanceKey]
  );

  const renderContent = (item: AdviceItem) => {
    if (Array.isArray(item.content)) {
      return item.content.map((line: string, idx: number) => (
        <View key={idx} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.articleBody, { marginTop: 0, flex: 1 }]}>{line}</Text>
        </View>
      ));
    }
    return <Text style={styles.articleBody}>{item.content}</Text>;
  };

  const showNoSearch =
    debouncedSearch.length > 0 &&
    sectionGroups.length === 0 &&
    adviceData &&
    Object.keys(adviceData).length > 0;

  const showGlobalEmpty =
    !loading && adviceData && Object.keys(adviceData).length === 0 && !debouncedSearch;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollPad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        <Text style={styles.pageTitle}>{t('advice.pageTitle')}</Text>
        <Text style={styles.pageSub}>{t('advice.pageSubtitle')}</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchIconWrap}>
            <Search size={16} color={COLORS.textSecondary} strokeWidth={2} />
          </View>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('advice.searchPlaceholder')}
            placeholderTextColor={hexToRgba(COLORS.textSecondary, 0.65)}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        ) : null}

        {showGlobalEmpty ? (
          <View style={styles.emptyBlock}>
            <Icon name="info" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t('advice.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('advice.emptyText')}</Text>
          </View>
        ) : showNoSearch ? (
          <View style={styles.emptyBlock}>
            <Icon name="search" size={28} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t('advice.noSearchResults')}</Text>
            <Text style={styles.emptyText}>{t('advice.tryDifferentQuery')}</Text>
          </View>
        ) : (
          sectionGroups.map((group) => {
            const isOpen = openSlug === group.slug;
            return (
              <View key={group.slug} style={styles.sectionOuter}>
                <TouchableOpacity
                  style={styles.sectionHeaderBtn}
                  onPress={() => toggleSection(group.slug)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                    <Text style={styles.sectionTitle}>{group.title}</Text>
                    <Text style={styles.sectionMeta}>
                      {t('advice.materialsCount', { count: group.items.length })}
                    </Text>
                  </View>
                  <ChevronDown
                    size={18}
                    color={COLORS.textSecondary}
                    strokeWidth={2}
                    style={{
                      transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
                    }}
                  />
                </TouchableOpacity>
                {isOpen && group.items.length > 0 ? (
                  <View style={styles.expandedInner}>
                    {group.items.map(({ id, item }, idx) => (
                      <View key={id} style={[styles.article, idx > 0 ? styles.articleSpacing : null]}>
                        <Text style={styles.articleTitle}>{item.title}</Text>
                        {renderContent(item)}
                      </View>
                    ))}
                  </View>
                ) : null}
                {isOpen && group.items.length === 0 ? (
                  <Text style={styles.emptySoon}>{t('advice.comingMaterials')}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdviceScreen;
