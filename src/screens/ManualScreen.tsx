import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
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
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import ExternalApiService from '../services/externalApi';
import { useLanguage } from '../contexts/LanguageContext';
import Analytics from '../services/analyticsService';

const ManualScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [manualData, setManualData] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadManualData();
    }, [language])
  );

  const loadManualData = async () => {
    try {
      setLoading(true);
      
      // Fetch manuals from backend (DB-backed defaults are public)
      try {
        const apiManual = await ApiService.getUserManuals(language);
        const sections = Array.isArray(apiManual?.sections) ? apiManual.sections : [];
        if (sections.length === 0) {
          setManualData({});
          return;
        }

        const keyed: Record<string, any> = {};
        sections.forEach((entry: any) => {
          if (entry && entry.section && Array.isArray(entry.items)) {
            const sectionSlug = entry.section.slug;
            const key = `manual.sections.${sectionSlug}`;
            const localized = t(key);
            const sectionTitle = (!localized || localized === key) ? (entry.section.title || '') : localized;
            entry.items.forEach((item: any) => {
              const id = item.id || item.title || Math.random().toString();
              keyed[id] = {
                title: item.title || '',
                subtitle: sectionTitle,
                content: item.content || '',
                icon: item.icon,
                pdf_url: item.pdf_url,
              };
            });
          } else {
            const id = entry.id || entry.title || Math.random().toString();
            keyed[id] = {
              title: entry.title || t('manual.section'),
              content: entry.content || '',
              icon: entry.icon,
              pdf_url: entry.pdf_url,
            };
          }
        });
        setManualData(keyed);
        return;
      } catch (e) {
        console.error('Manual API error:', e);
        setManualData({});
        return;
      }
    } catch (error) {
      console.error('Error loading manual data:', error);
      Alert.alert(t('manual.error'), t('manual.failedToLoadManual'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadManualData();
    setRefreshing(false);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
    Analytics.track('manual_section_toggle', { section_id: sectionId, expanded: newExpanded.has(sectionId) });
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download functionality
    Analytics.track('manual_pdf_open');
    Alert.alert(t('manual.information'), t('manual.pdfDownloadComingSoon'));
  };

  if (loading) {
    return <LoadingSpinner text={t('manual.loading')} />;
  }


  const hasAnySection = !!manualData && Object.keys(manualData).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {!hasAnySection ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Icon name="info" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{t('manual.noManual')}</Text>
              <Text style={styles.emptyText}>{t('manual.noManualText')}</Text>
            </View>
          </Card>
        ) : (
          Object.entries(manualData).map(([sectionId, sectionData]: [string, any]) => {
            if (!sectionData) return null;

            const isExpanded = expandedSections.has(sectionId);

            return (
              <Card key={sectionId} style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(sectionId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionTitleContainer}>
                    <Icon name={sectionData.icon || 'info'} size={20} color={COLORS.accent} style={styles.sectionIcon} />
                    <View style={{flex: 1}}>
                      <Text style={styles.sectionTitle}>{sectionData.title || t(`manual.sections.${sectionId}`)}</Text>

                      {/* код ниже не работает */}
                      {(() => {
                        const computedSubtitle = sectionData.subtitle || (sectionData.sectionSlug ? t(`manual.sections.${sectionData.sectionSlug}`) : '');
                        return computedSubtitle ? (
                          <Text style={styles.sectionSubtitle}>{computedSubtitle}</Text>
                        ) : null;
                      })()}
                    </View>
                  </View>
                  <Icon 
                    name={isExpanded ? 'close' : 'add'} 
                    size={20} 
                    color={COLORS.accent}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.sectionContent}>
                    {Array.isArray(sectionData.content) ? (
                      sectionData.content.map((item: string, index: number) => (
                        <View key={index} style={styles.contentItem}>
                          <Text style={styles.bulletPoint}>•</Text>
                          <Text style={styles.contentText}>{item}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.contentText}>{sectionData.content}</Text>
                    )}
                    {sectionData.pdf_url && (
                      <TouchableOpacity style={styles.pdfButton}>
                        <Icon name="file-pdf" size={16} color={COLORS.accent} />
                        <Text style={styles.pdfButtonText}>{t('manual.openPdf')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}

        <Card style={styles.tipsCard}>
          <View style={styles.tipsTitleContainer}>
            <Icon name="lightbulb" size={20} color={COLORS.background} />
            <Text style={styles.tipsTitle}>{t('manual.usefulTips')}</Text>
          </View>
          <View style={styles.tipsContent}>
            <Text style={styles.tipText}>
              • {t('manual.tips.checkFluids')}
            </Text>
            <Text style={styles.tipText}>
              • {t('manual.tips.monitorTirePressure')}
            </Text>
            <Text style={styles.tipText}>
              • {t('manual.tips.dontIgnoreWarnings')}
            </Text>
            <Text style={styles.tipText}>
              • {t('manual.tips.keepMaintenanceRecords')}
            </Text>
          </View>
        </Card>

        {/* Removed extra bottom spacer to avoid gap above bottom tab bar */}
      </ScrollView>
    </SafeAreaView>
  );
};

const getSectionIcon = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'calendar-week': '📅',
    'calendar-alt': '📆',
    'tint': '💧',
    'tire': '🛞',
    'lightbulb': '💡',
    'exclamation-triangle': '⚠️',
  };
  return iconMap[iconName] || '📋';
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
  expandIcon: {
    fontSize: 20,
    color: COLORS.accent,
    fontWeight: 'bold',
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
  tipsCard: {
    margin: SPACING.lg,
    backgroundColor: COLORS.accent,
  },
  tipsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  tipsContent: {
  },
  tipText: {
    fontSize: 14,
    color: COLORS.background,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: SPACING.xxl,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accent + '20',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  pdfButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  noVehicleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noVehicleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  noVehicleText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ManualScreen;
