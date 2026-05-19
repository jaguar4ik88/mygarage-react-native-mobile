import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import AnimatedView from '../components/AnimatedView';
import { COLORS, SPACING, RADIUS, hexToRgba, FONTS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';

type ActionsGridItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  onPress?: () => void;
  comingSoon?: boolean;
  requiresPro?: boolean;
};

interface ActionsScreenProps {
  onNavigateToReminders: () => void;
  onNavigateToSTO: () => void;
  onNavigateToFamilyGarage: () => void;
  onNavigateToLocation: () => void;
  onNavigateToReports: () => void;
  onNavigateToRecommendations?: () => void;
  onNavigateToExport?: () => void;
  onNavigateToDocuments?: () => void;
  navigation?: any;
}

const ActionsScreen: React.FC<ActionsScreenProps> = ({
  onNavigateToReminders,
  onNavigateToSTO,
  onNavigateToFamilyGarage,
  onNavigateToLocation,
  onNavigateToReports,
  onNavigateToRecommendations,
  onNavigateToExport,
  onNavigateToDocuments,
  navigation,
}) => {
  const { t } = useLanguage();
  const { appearanceKey } = useTheme();
  const { user, isGuest } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const horizontalPad = SPACING.lg;
  const gridGap = SPACING.md;
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - horizontalPad * 2 - gridGap) / 2;

  const isPro = user?.plan_type === 'pro' || user?.plan_type === 'premium';

  const loadData = async () => {
    if (!user?.id) return;
    try {
      await ApiService.getServiceHistory();
      await ApiService.getVehicles();
      await ApiService.getExpensesStatistics(user.id);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 1000);
  }, [user?.id]);

  const handleComingSoon = (feature: string) => {
    Alert.alert(
      t('common.comingSoon'),
      `${feature} ${t('common.comingSoonDescription')}`,
      [{ text: t('common.ok') }]
    );
  };

  const handleExportToPdf = useCallback(() => {
    if (onNavigateToExport) {
      onNavigateToExport();
      return;
    }
    navigation?.getParent()?.getParent?.()?.navigate('Export');
  }, [navigation, onNavigateToExport]);

  const openDocumentsHub = useCallback(() => {
    if (!user?.id || isGuest) {
      Alert.alert(t('auth.authRequired'), t('actions.requiresLogin'));
      return;
    }
    if (!isPro) {
      Alert.alert(t('subscription.proFeature') || 'PRO', t('subscription.documentsRequiresPro'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('subscription.upgrade') || 'Upgrade',
          onPress: () => {
            navigation?.getParent()?.getParent?.()?.navigate('Subscription');
          },
        },
      ]);
      return;
    }
    if (onNavigateToDocuments) {
      onNavigateToDocuments();
    } else {
      navigation?.navigate('DocumentsHub');
    }
  }, [user?.id, isGuest, isPro, navigation, onNavigateToDocuments, t]);

  const actionItems = useMemo(
    (): ActionsGridItem[] => [
      {
        id: 'reminders',
        title: t('navigation.reminders'),
        description: t('actions.remindersDescription'),
        icon: 'reminders',
        onPress: onNavigateToReminders,
      },
      {
        id: 'sto',
        title: t('navigation.sto'),
        description: t('actions.stoDescription'),
        icon: 'sto',
        onPress: onNavigateToSTO,
      },
      {
        id: 'recommendations',
        title: t('navigation.recommendations') || 'Рекомендации',
        description: t('manual.usefulTips') || '',
        icon: 'advice',
        onPress: onNavigateToRecommendations,
      },
      {
        id: 'statistics',
        title: t('actions.statistics'),
        description: t('actions.statisticsDescription'),
        icon: 'pie-chart',
        onPress: onNavigateToReports,
      },
      {
        id: 'documents',
        title: t('actions.documents'),
        description: t('actions.documentsDescription'),
        icon: 'folder',
        requiresPro: true,
        onPress: openDocumentsHub,
      },
      {
        id: 'pdf-export',
        title: t('actions.pdfExport') || 'Экспорт в PDF',
        description: t('actions.pdfExportDescription') || '',
        icon: 'file',
        requiresPro: true,
        onPress: () => {
          if (!user?.id || isGuest) {
            Alert.alert(t('auth.authRequired'), t('actions.requiresLogin'));
            return;
          }
          if (!isPro) {
            Alert.alert(
              t('subscription.proFeature') || 'Функция PRO',
              t('subscription.pdfExportRequiresPro') ||
                'Экспорт в PDF доступен только для PRO подписчиков',
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('subscription.upgrade') || 'Обновить',
                  onPress: () => {
                    navigation?.getParent()?.getParent?.()?.navigate('Subscription');
                  },
                },
              ]
            );
            return;
          }
          handleExportToPdf();
        },
      },
      {
        id: 'ai-assistant',
        title: t('actions.aiAssistant') || 'AI помощник',
        description: t('actions.aiAssistantDescription') || '',
        icon: 'bot',
        onPress: () => handleComingSoon(t('actions.aiAssistant') || 'AI помощник'),
        comingSoon: true,
      },
      {
        id: 'family',
        title: t('actions.familyGarage'),
        description: t('actions.familyGarageDescription'),
        icon: 'users',
        onPress: () => handleComingSoon(t('actions.familyGarage')),
        comingSoon: true,
      },
      {
        id: 'trips',
        title: t('actions.trips') || 'Поездки',
        description: t('actions.tripsDescription') || '',
        icon: 'route',
        onPress: () => handleComingSoon(t('actions.trips') || 'Поездки'),
        comingSoon: true,
      },
    ],
    [
      t,
      isPro,
      navigation,
      isGuest,
      user?.id,
      onNavigateToReminders,
      onNavigateToSTO,
      onNavigateToRecommendations,
      onNavigateToReports,
      handleExportToPdf,
      openDocumentsHub,
    ]
  );

  const primaryItems = useMemo(
    () => actionItems.filter((item) => !item.comingSoon),
    [actionItems]
  );
  const soonItems = useMemo(
    () => actionItems.filter((item) => item.comingSoon),
    [actionItems]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: COLORS.background,
        },
        scrollView: {
          flex: 1,
        },
        content: {
          paddingHorizontal: horizontalPad,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.xl,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: gridGap,
        },
        actionRow: {
          width: itemWidth,
          padding: SPACING.md,
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.border,
          overflow: 'hidden',
        },
        actionRowSoon: {
          opacity: 0.62,
          borderStyle: 'dashed',
        },
        iconColumn: {
          width: 44,
          flexShrink: 0,
          alignItems: 'center',
        },
        proBadgeUnderIcon: {
          marginTop: SPACING.xs,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.background,
          borderWidth: 1,
          borderColor: hexToRgba(COLORS.accent, 0.35),
          maxWidth: 52,
        },
        proBadgeText: {
          fontSize: 8,
          fontFamily: FONTS.bold,
          color: COLORS.accent,
          letterSpacing: 0.5,
        },
        actionTitle: {
          alignSelf: 'stretch',
          width: '100%',
          fontSize: 14,
          fontFamily: FONTS.semiBold,
          color: COLORS.text,
          marginBottom: SPACING.sm,
        },
        actionRowBody: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: SPACING.md,
          width: '100%',
        },
        iconBubble: {
          width: 40,
          height: 40,
          borderRadius: RADIUS.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hexToRgba(COLORS.accent, 0.12),
        },
        actionDescription: {
          flex: 1,
          minWidth: 0,
          fontSize: 11,
          fontFamily: FONTS.regular,
          color: COLORS.textMuted,
          lineHeight: 15,
        },
        soonSection: {
          marginTop: SPACING.lg,
        },
        soonHeading: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: COLORS.textSecondary,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: SPACING.md,
        },
      }),
    [appearanceKey, horizontalPad, gridGap, itemWidth]
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        <View style={styles.content}>
          <View style={styles.grid}>
            {primaryItems.map((item, index) => (
              <AnimatedView
                key={item.id}
                animation="slideInUp"
                delay={index * 70}
                duration={280}
              >
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => item.onPress?.()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.actionRowBody}>
                    <View style={styles.iconColumn}>
                      <View style={styles.iconBubble}>
                        <Icon name={item.icon} size={20} color={COLORS.accent} />
                      </View>
                      {item.requiresPro && !isPro ? (
                        <View style={styles.proBadgeUnderIcon}>
                          <Icon name="lock" size={9} color={COLORS.accent} style={{ marginRight: 3 }} />
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.actionDescription} numberOfLines={3}>
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </View>

          {soonItems.length > 0 ? (
            <View style={styles.soonSection}>
              <Text style={styles.soonHeading}>{t('common.comingSoon')}</Text>
              <View style={styles.grid}>
                {soonItems.map((item, index) => (
                  <AnimatedView
                    key={item.id}
                    animation="slideInUp"
                    delay={primaryItems.length * 70 + index * 50}
                    duration={280}
                  >
                    <TouchableOpacity
                      style={[styles.actionRow, styles.actionRowSoon]}
                      onPress={item.onPress}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={styles.actionRowBody}>
                        <View style={styles.iconColumn}>
                          <View style={styles.iconBubble}>
                            <Icon name={item.icon} size={20} color={COLORS.textMuted} />
                          </View>
                        </View>
                        <Text style={styles.actionDescription} numberOfLines={3}>
                          {item.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </AnimatedView>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActionsScreen;
