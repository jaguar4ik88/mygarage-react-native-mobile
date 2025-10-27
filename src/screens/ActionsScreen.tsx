import React, { useState, useCallback, useEffect } from 'react';
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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Card from '../components/Card';
import Icon from '../components/Icon';
import AnimatedView from '../components/AnimatedView';
import { COLORS, FONTS, SPACING } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import PdfExportService from '../services/pdfExportService';
import Analytics from '../services/analyticsService';
import { Vehicle, ServiceHistory } from '../types';

interface ActionsScreenProps {
  onNavigateToReminders: () => void;
  onNavigateToSTO: () => void;
  onNavigateToFamilyGarage: () => void;
  onNavigateToLocation: () => void;
  onNavigateToReports: () => void;
  onNavigateToRecommendations?: () => void;
  onNavigateToExport?: () => void;
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
  navigation,
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    thisMonth: 0,
    thisYear: 0,
  });
  
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - SPACING.lg * 2 - SPACING.sm) / 2; // ширина экрана минус padding и gap

  const isPro = user?.plan_type === 'pro' || user?.plan_type === 'premium';

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      const [historyResponse, vehiclesData, statisticsData] = await Promise.all([
        ApiService.getServiceHistory(),
        ApiService.getVehicles(),
        ApiService.getExpensesStatistics(user.id),
      ]);
      
      setHistory(historyResponse.data || []);
      setVehicles(vehiclesData || []);
      setStats({
        totalSpent: statisticsData.total_expenses || 0,
        thisMonth: statisticsData.monthly_expenses?.[statisticsData.monthly_expenses.length - 1]?.total_cost || 0,
        thisYear: statisticsData.total_expenses || 0,
      });
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

  const handleExportToPdf = () => {
    // Навигация к экрану экспорта
    if (navigation) {
      navigation.navigate('Export');
    } else if (onNavigateToExport) {
      onNavigateToExport();
    }
  };

  const actionItems = [
    {
      id: 'reminders',
      title: t('navigation.reminders'),
      description: t('actions.remindersDescription'),
      icon: 'reminders',
      color: '#3b82f6',
      onPress: onNavigateToReminders,
    },
    {
      id: 'sto',
      title: t('navigation.sto'),
      description: t('actions.stoDescription'),
      icon: 'sto',
      color: '#06b6d4',
      onPress: onNavigateToSTO,
    },
    {
      id: 'recommendations',
      title: t('navigation.recommendations') || 'Рекомендации',
      description: t('manual.usefulTips') || '',
      icon: 'advice',
      color: '#f97316',
      onPress: onNavigateToRecommendations,
    },
    {
      id: 'statistics',
      title: t('actions.statistics'),
      description: t('actions.statisticsDescription'),
      icon: 'pie-chart',
      color: '#10b981',
      onPress: onNavigateToReports,
    },
    // Экспорт PDF - только для PRO пользователей
    ...(isPro ? [{
      id: 'pdf-export',
      title: t('actions.pdfExport') || 'Экспорт в PDF',
      description: t('actions.pdfExportDescription') || 'Экспорт всех расходов в PDF',
      icon: 'file',
      color: '#ec4899',
      onPress: handleExportToPdf,
    }] : []),
    {
      id: 'ai-assistant',
      title: t('actions.aiAssistant') || 'AI помощник',
      description: t('actions.aiAssistantDescription') || 'Умный помощник для автомобиля',
      icon: 'bot',
      color: '#8b5cf6',
      onPress: () => handleComingSoon(t('actions.aiAssistant') || 'AI помощник'),
      comingSoon: true,
    },
    {
      id: 'family',
      title: t('actions.familyGarage'),
      description: t('actions.familyGarageDescription'),
      icon: 'users',
      color: '#6366f1',
      onPress: () => handleComingSoon(t('actions.familyGarage')),
      comingSoon: true,
    },
    {
      id: 'trips',
      title: t('actions.trips') || 'Поездки',
      description: t('actions.tripsDescription') || 'История поездок',
      icon: 'route',
      color: '#ef4444',
      onPress: () => handleComingSoon(t('actions.trips') || 'Поездки'),
      comingSoon: true,
    },
  ];

  const renderActionItem = ({ item, index }: { item: any; index: number }) => (
    <AnimatedView
      animation="slideInUp"
      delay={index * 100}
      duration={300}
    >
      <TouchableOpacity
        style={[styles.actionItem, { borderLeftColor: item.color, opacity: item.comingSoon ? 0.5 : 1 }]}
        onPress={item.onPress}
        disabled={!!item.comingSoon}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Icon name={item.icon} size={24} color="white" />
        </View>
        <Text style={styles.actionTitle}>{item.title}</Text>
      </TouchableOpacity>
    </AnimatedView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.content}>
          <Text style={styles.subtitle}>{t('actions.subtitle')}</Text>
          
          <View style={styles.grid}>
            {actionItems.map((item, index) => (
              <AnimatedView
                key={item.id}
                animation="slideInUp"
                delay={index * 100}
                duration={300}
              >
                <TouchableOpacity
                  style={[styles.actionItem, { 
                    width: itemWidth,
                    borderLeftColor: item.color, 
                    opacity: item.comingSoon ? 0.5 : 1 
                  }]}
                  onPress={item.onPress}
                  disabled={!!item.comingSoon}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionTitle}>{item.title}</Text>
                  <View style={styles.descriptionRow}>
                    <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={24} color="white" />
                    </View>
                    <Text style={styles.actionDescription}>{item.description}</Text>
                  </View>
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </View>
        </View>
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
  content: {
    padding: SPACING.lg,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    flex: 1,
    marginLeft: SPACING.sm,
  },
});

export default ActionsScreen;
