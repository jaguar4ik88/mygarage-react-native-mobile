import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, BASE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import ApiService from '../services/api';

interface TermsSection {
  section: string;
  title: string;
  content: string;
}

interface TermsOfServiceResponse {
  success: boolean;
  language: string;
  sections: TermsSection[];
}

interface TermsOfServiceScreenProps {
  onBack: () => void;
}

const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const [sections, setSections] = useState<TermsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTermsOfService();
  }, [language]);

  const getFallbackContent = (): TermsSection[] => {
    const fallbackSections = {
      ru: [
        {
          section: 'acceptance',
          title: 'Принятие условий',
          content: 'Используя приложение myGarage, вы соглашаетесь с настоящими Условиями использования. Если вы не согласны с этими условиями, пожалуйста, не используйте приложение.'
        },
        {
          section: 'subscriptions',
          title: 'Подписки',
          content: 'Приложение предлагает автоматически продлеваемые подписки. Подписки автоматически продлеваются, если не отменить их за 24 часа до окончания периода. Оплата производится через ваш аккаунт Apple ID.'
        },
        {
          section: 'cancellation',
          title: 'Отмена подписки',
          content: 'Вы можете отменить подписку в любое время через настройки вашего Apple ID. После отмены доступ к функциям подписки сохранится до конца оплаченного периода.'
        },
        {
          section: 'userContent',
          title: 'Контент пользователя',
          content: 'Вы несете ответственность за весь контент, который вы загружаете в приложение. Мы не претендуем на права собственности на ваш контент.'
        },
        {
          section: 'prohibitedUse',
          title: 'Запрещенное использование',
          content: 'Запрещается использовать приложение для незаконных целей, нарушения прав других лиц или распространения вредоносного контента.'
        },
        {
          section: 'limitation',
          title: 'Ограничение ответственности',
          content: 'Приложение предоставляется "как есть". Мы не гарантируем бесперебойную работу приложения и не несем ответственности за любые убытки, возникшие в результате использования приложения.'
        },
        {
          section: 'changes',
          title: 'Изменения условий',
          content: 'Мы оставляем за собой право изменять эти условия в любое время. О существенных изменениях мы уведомим пользователей через приложение.'
        },
        {
          section: 'contact',
          title: 'Контакты',
          content: 'По вопросам использования приложения обращайтесь по адресу: support@mygarage.uno'
        }
      ],
      uk: [
        {
          section: 'acceptance',
          title: 'Прийняття умов',
          content: 'Використовуючи додаток myGarage, ви погоджуєтеся з цими Умовами використання. Якщо ви не згодні з цими умовами, будь ласка, не використовуйте додаток.'
        },
        {
          section: 'subscriptions',
          title: 'Підписки',
          content: 'Додаток пропонує автоматично відновлювані підписки. Підписки автоматично продовжуються, якщо не скасувати їх за 24 години до закінчення періоду. Оплата здійснюється через ваш обліковий запис Apple ID.'
        },
        {
          section: 'cancellation',
          title: 'Скасування підписки',
          content: 'Ви можете скасувати підписку в будь-який час через налаштування вашого Apple ID. Після скасування доступ до функцій підписки збережеться до кінця оплаченого періоду.'
        },
        {
          section: 'userContent',
          title: 'Контент користувача',
          content: 'Ви несете відповідальність за весь контент, який ви завантажуєте в додаток. Ми не претендуємо на права власності на ваш контент.'
        },
        {
          section: 'prohibitedUse',
          title: 'Заборонене використання',
          content: 'Заборонено використовувати додаток для незаконних цілей, порушення прав інших осіб або поширення шкідливого контенту.'
        },
        {
          section: 'limitation',
          title: 'Обмеження відповідальності',
          content: 'Додаток надається "як є". Ми не гарантуємо безперебійну роботу додатку і не несемо відповідальності за будь-які збитки, що виникли в результаті використання додатку.'
        },
        {
          section: 'changes',
          title: 'Зміни умов',
          content: 'Ми залишаємо за собою право змінювати ці умови в будь-який час. Про істотні зміни ми повідомимо користувачів через додаток.'
        },
        {
          section: 'contact',
          title: 'Контакти',
          content: 'З питаннями використання додатку звертайтеся за адресою: support@mygarage.uno'
        }
      ],
      en: [
        {
          section: 'acceptance',
          title: 'Acceptance of Terms',
          content: 'By using the myGarage app, you agree to these Terms of Service. If you do not agree with these terms, please do not use the app.'
        },
        {
          section: 'subscriptions',
          title: 'Subscriptions',
          content: 'The app offers auto-renewing subscriptions. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the period. Payment is charged through your Apple ID account.'
        },
        {
          section: 'cancellation',
          title: 'Cancellation',
          content: 'You can cancel your subscription at any time through your Apple ID settings. After cancellation, access to subscription features will remain until the end of the paid period.'
        },
        {
          section: 'userContent',
          title: 'User Content',
          content: 'You are responsible for all content you upload to the app. We do not claim ownership of your content.'
        },
        {
          section: 'prohibitedUse',
          title: 'Prohibited Use',
          content: 'It is prohibited to use the app for illegal purposes, violation of others\' rights, or distribution of harmful content.'
        },
        {
          section: 'limitation',
          title: 'Limitation of Liability',
          content: 'The app is provided "as is". We do not guarantee uninterrupted operation of the app and are not liable for any losses arising from the use of the app.'
        },
        {
          section: 'changes',
          title: 'Changes to Terms',
          content: 'We reserve the right to change these terms at any time. We will notify users about significant changes through the app.'
        },
        {
          section: 'contact',
          title: 'Contact',
          content: 'For questions about using the app, contact us at: support@mygarage.uno'
        }
      ]
    };

    return fallbackSections[language as keyof typeof fallbackSections] || fallbackSections.en;
  };

  const loadTermsOfService = async () => {
    try {
      setError(null);
      
      const response = await ApiService.get(`/terms-of-service/${language}`) as TermsOfServiceResponse;
      
      console.log('Terms of Service API response:', response);
      
      if (response && response.success && response.sections) {
        console.log('Using API content');
        setSections(response.sections);
      } else {
        // Fallback to static content
        console.log('API response invalid, using fallback content. Response:', response);
        setSections(getFallbackContent());
      }
    } catch (err) {
      console.error('Failed to load terms of service from API, using fallback:', err);
      // Fallback to static content when API fails
      setSections(getFallbackContent());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTermsOfService();
  };

  const openWebTerms = () => {
    const urls = {
      ru: `${BASE_URL}/terms-ru`,
      uk: `${BASE_URL}/terms-uk`,
      en: `${BASE_URL}/terms-en`
    };
    const url = urls[language as keyof typeof urls] || urls.en;
    Linking.openURL(url);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }

    if (error && sections.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTermsOfService}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.introText}>
          {language === 'ru' && 'Ниже приведены условия использования приложения myGarage.'}
          {language === 'uk' && 'Нижче наведені умови використання додатку myGarage.'}
          {language === 'en' && 'Below are the terms of service for the myGarage app.'}
        </Text>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.fullVersionButton} onPress={openWebTerms}>
          <Text style={styles.fullVersionButtonText}>
            {language === 'ru' && 'Прочитать полную версию'}
            {language === 'uk' && 'Прочитати повну версію'}
            {language === 'en' && 'Read full version'}
          </Text>
          <Icon name="forward" size={16} color={COLORS.accent} />
        </TouchableOpacity>

        <Text style={styles.lastUpdatedText}>
          {language === 'ru' && `Последнее обновление: ${new Date().toLocaleDateString('ru-RU')}`}
          {language === 'uk' && `Останнє оновлення: ${new Date().toLocaleDateString('uk-UA')}`}
          {language === 'en' && `Last updated: ${new Date().toLocaleDateString('en-US')}`}
        </Text>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerSideLeft}>
          <ScreenBackLink layout="toolbar" onPress={onBack} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {t('profile.termsOfService')}
        </Text>
        <View style={styles.headerSideRight} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  headerSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSideRight: {
    flex: 1,
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  introText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionContent: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  fullVersionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  fullVersionButtonText: {
    fontSize: 16,
    color: COLORS.accent,
    marginRight: SPACING.xs,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
});

export default TermsOfServiceScreen;

