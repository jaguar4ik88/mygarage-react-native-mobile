import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import { COLORS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const AdviceScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adviceData, setAdviceData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      loadAdvice();
      loadSections();
    }, [language])
  );

  const loadSections = async () => {
    try {
      const apiSections = await ApiService.getAdviceSections(language);
      console.log('Loaded sections:', apiSections);
      setSections(apiSections || []);
    } catch (e) {
      console.error('Sections API error:', e);
      setSections([]);
    }
  };

  const loadAdvice = async () => {
    try {
      setLoading(true);
      const apiAdvice = await ApiService.getAdvice(language);
      const sections = Array.isArray(apiAdvice?.sections) ? apiAdvice.sections : [];
      if (sections.length === 0) {
        setAdviceData({});
        return;
      }

      const keyed: Record<string, any> = {};
      sections.forEach((entry: any) => {
        if (entry && entry.section && Array.isArray(entry.items)) {
          const sectionSlug = entry.section.slug;
          const key = `advice.sections.${sectionSlug}`;
          const localized = t(key);
          const sectionTitle = (!localized || localized === key) ? (entry.section.title || '') : localized;
          entry.items.forEach((item: any) => {
            const id = (item.id || item.title || Math.random().toString()) + '';
            keyed[id] = {
              title: item.title || '',
              subtitle: sectionTitle,
              content: item.content || '',
              icon: item.icon,
              pdf_url: item.pdf_url,
              sectionSlug: sectionSlug,
            };
          });
        }
      });
      setAdviceData(keyed);
    } catch (e) {
      console.error('Advice API error:', e);
      setAdviceData({});
      Alert.alert(t('advice.error'), t('advice.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input (300ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAdvice(), loadSections()]);
    setRefreshing(false);
  };

  const toggle = (id: string) => {
    const s = new Set(expanded);
    if (s.has(id)) s.delete(id); else s.add(id);
    setExpanded(s);
  };

  const filteredAdviceData = React.useMemo(() => {
    if (!adviceData) return {};
    const bySection = !selectedSection
      ? adviceData
      : Object.fromEntries(
          Object.entries(adviceData).filter(([_, item]: [string, any]) => 
            item.sectionSlug === selectedSection
          )
        );

    if (!debouncedSearch) return bySection;
    const q = debouncedSearch.toLowerCase();
    return Object.fromEntries(
      Object.entries(bySection).filter(([_, item]: [string, any]) => {
        const title = (item.title || '').toLowerCase();
        const subtitle = (item.subtitle || '').toLowerCase();
        const content = Array.isArray(item.content)
          ? (item.content as string[]).join(' ').toLowerCase()
          : String(item.content || '').toLowerCase();
        return title.includes(q) || subtitle.includes(q) || content.includes(q);
      })
    );
  }, [adviceData, selectedSection, debouncedSearch]);

  if (loading) {
    return <LoadingSpinner text={t('advice.loading')} />;
  }

  const hasItems = !!filteredAdviceData && Object.keys(filteredAdviceData).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {sections.length > 0 && (
          <Card style={styles.filterCard}>
            <Text style={styles.filterTitle}>{t('advice.filterBySection')}</Text>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('advice.searchPlaceholder')}
              containerStyle={styles.searchContainer}
              inputStyle={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  !selectedSection && styles.filterButtonActive
                ]}
                onPress={() => setSelectedSection(null)}
              >
                <Text style={[
                  styles.filterButtonText,
                  !selectedSection && styles.filterButtonTextActive
                ]}>
                  {t('advice.allSections')}
                </Text>
              </TouchableOpacity>
              {sections.map((section: any) => {
                const key = `advice.sections.${section.slug}`;
                const localized = t(key);
                const sectionTitle = (!localized || localized === key) ? (section.title || '') : localized;
                const isActive = selectedSection === section.slug;
                
                return (
                  <TouchableOpacity
                    key={section.slug}
                    style={[
                      styles.filterButton,
                      isActive && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedSection(section.slug)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isActive && styles.filterButtonTextActive
                    ]}>
                      {sectionTitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>
        )}
        {!hasItems ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Icon name="info" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{t('advice.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('advice.emptyText')}</Text>
            </View>
          </Card>
        ) : (
          Object.entries(filteredAdviceData).map(([id, item]: [string, any]) => {
            const isExpanded = expanded.has(id);
            return (
              <Card key={id} style={styles.sectionCard}>
                <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(id)} activeOpacity={0.7}>
                  <View style={styles.sectionTitleContainer}>
                    <Icon name={item.icon || 'lightbulb'} size={20} color={COLORS.accent} style={styles.sectionIcon} />
                    <View style={{flex:1}}>
                      <Text style={styles.sectionTitle}>{item.title}</Text>
                      {item.subtitle ? <Text style={styles.sectionSubtitle}>{item.subtitle}</Text> : null}
                    </View>
                  </View>
                  <Icon name={isExpanded ? 'close' : 'add'} size={20} color={COLORS.accent} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.sectionContent}>
                    {Array.isArray(item.content) ? (
                      item.content.map((line: string, idx: number) => (
                        <View key={idx} style={styles.contentItem}>
                          <Text style={styles.bulletPoint}>•</Text>
                          <Text style={styles.contentText}>{line}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.contentText}>{item.content}</Text>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
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
  emptyCard: {
    margin: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bulletPoint: {
    color: COLORS.accent,
    fontSize: 16,
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  contentText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    flex: 1,
  },
  filterCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchContainer: {
    marginBottom: SPACING.md,
  },
  searchInput: {
    fontSize: 14,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
});

export default AdviceScreen;


