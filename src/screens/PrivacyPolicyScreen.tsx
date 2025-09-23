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
import { COLORS, FONTS, SPACING } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import ApiService from '../services/api';

interface PrivacySection {
  section: string;
  title: string;
  content: string;
}

interface PrivacyPolicyResponse {
  success: boolean;
  language: string;
  sections: PrivacySection[];
}

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const [sections, setSections] = useState<PrivacySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacyPolicy();
  }, [language]);

  const getFallbackContent = (): PrivacySection[] => {
    const fallbackSections = {
      ru: [
        {
          section: 'dataCollection',
          title: 'Сбор данных',
          content: 'Мы собираем только необходимую информацию для работы приложения: данные о ваших автомобилях, напоминания, историю обслуживания и основную информацию профиля.'
        },
        {
          section: 'dataUsage',
          title: 'Использование данных',
          content: 'Ваши данные используются для предоставления функций приложения, отправки напоминаний и улучшения пользовательского опыта. Мы не продаем ваши данные третьим лицам.'
        },
        {
          section: 'dataSharing',
          title: 'Передача данных',
          content: 'Мы не передаем ваши личные данные третьим лицам, за исключением случаев, когда это требуется по закону или для обеспечения безопасности.'
        },
        {
          section: 'dataSecurity',
          title: 'Безопасность данных',
          content: 'Мы используем современные методы шифрования и безопасности для защиты ваших данных. Все данные передаются по защищенному соединению HTTPS.'
        },
        {
          section: 'userRights',
          title: 'Права пользователя',
          content: 'Вы можете в любое время запросить доступ к своим данным, их изменение или удаление. Для этого обратитесь к нам через форму обратной связи.'
        },
        {
          section: 'contact',
          title: 'Контакты',
          content: 'По вопросам конфиденциальности обращайтесь по адресу: privacy@mygarage.uno'
        },
        {
          section: 'changes',
          title: 'Изменения политики',
          content: 'Мы можем обновлять эту политику конфиденциальности. О существенных изменениях мы уведомим пользователей через приложение.'
        }
      ],
      uk: [
        {
          section: 'dataCollection',
          title: 'Збір даних',
          content: 'Ми збираємо тільки необхідну інформацію для роботи додатку: дані про ваші автомобілі, нагадування, історію обслуговування та основну інформацію профілю.'
        },
        {
          section: 'dataUsage',
          title: 'Використання даних',
          content: 'Ваші дані використовуються для надання функцій додатку, надсилання нагадувань та покращення користувацького досвіду. Ми не продаємо ваші дані третім особам.'
        },
        {
          section: 'dataSharing',
          title: 'Передача даних',
          content: 'Ми не передаємо ваші персональні дані третім особам, за винятком випадків, коли це вимагається законом або для забезпечення безпеки.'
        },
        {
          section: 'dataSecurity',
          title: 'Безпека даних',
          content: 'Ми використовуємо сучасні методи шифрування та безпеки для захисту ваших даних. Всі дані передаються по захищеному з\'єднанню HTTPS.'
        },
        {
          section: 'userRights',
          title: 'Права користувача',
          content: 'Ви можете в будь-який час запросити доступ до своїх даних, їх зміну або видалення. Для цього зверніться до нас через форму зворотного зв\'язку.'
        },
        {
          section: 'contact',
          title: 'Контакти',
          content: 'З питаннями конфіденційності звертайтеся за адресою: privacy@mygarage.uno'
        },
        {
          section: 'changes',
          title: 'Зміни політики',
          content: 'Ми можемо оновлювати цю політику конфіденційності. Про істотні зміни ми повідомимо користувачів через додаток.'
        }
      ],
      en: [
        {
          section: 'dataCollection',
          title: 'Data Collection',
          content: 'We collect only the necessary information for the app to function: data about your vehicles, reminders, service history and basic profile information.'
        },
        {
          section: 'dataUsage',
          title: 'Data Usage',
          content: 'Your data is used to provide app features, send reminders and improve user experience. We do not sell your data to third parties.'
        },
        {
          section: 'dataSharing',
          title: 'Data Sharing',
          content: 'We do not share your personal data with third parties, except when required by law or for security purposes.'
        },
        {
          section: 'dataSecurity',
          title: 'Data Security',
          content: 'We use modern encryption and security methods to protect your data. All data is transmitted over secure HTTPS connection.'
        },
        {
          section: 'userRights',
          title: 'User Rights',
          content: 'You can request access to your data, its modification or deletion at any time. To do this, contact us through the feedback form.'
        },
        {
          section: 'contact',
          title: 'Contact',
          content: 'For privacy questions, contact us at: privacy@mygarage.uno'
        },
        {
          section: 'changes',
          title: 'Policy Changes',
          content: 'We may update this privacy policy. We will notify users about significant changes through the app.'
        }
      ]
    };

    return fallbackSections[language as keyof typeof fallbackSections] || fallbackSections.en;
  };

  const loadPrivacyPolicy = async () => {
    try {
      setError(null);
      
      const response = await ApiService.get(`/privacy-policy/${language}`) as PrivacyPolicyResponse;
      
      console.log('Privacy policy API response:', response);
      
      if (response && response.success && response.sections) {
        console.log('Using API content');
        setSections(response.sections);
      } else {
        // Fallback to static content
        console.log('API response invalid, using fallback content. Response:', response);
        setSections(getFallbackContent());
      }
    } catch (err) {
      console.error('Failed to load privacy policy from API, using fallback:', err);
      // Fallback to static content when API fails
      setSections(getFallbackContent());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPrivacyPolicy();
  };

  const openWebPrivacy = () => {
    const urls = {
      ru: 'https://mygarage.uno/privacy-ru',
      uk: 'https://mygarage.uno/privacy-uk', 
      en: 'https://mygarage.uno/privacy-en'
    };
    const url = urls[language as keyof typeof urls] || urls.en;
    Linking.openURL(url);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Загрузка политики конфиденциальности...</Text>
        </View>
      );
    }

    if (error && sections.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPrivacyPolicy}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.introText}>
          Мы серьезно относимся к защите вашей конфиденциальности. Ниже приведена краткая версия нашей политики конфиденциальности.
        </Text>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.fullVersionButton} onPress={openWebPrivacy}>
          <Text style={styles.fullVersionButtonText}>Прочитать полную версию</Text>
          <Icon name="forward" size={16} color={COLORS.accent} />
        </TouchableOpacity>

        <Text style={styles.lastUpdatedText}>
          Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
        </Text>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Политика конфиденциальности</Text>
        <View style={styles.placeholder} />
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
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
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

export default PrivacyPolicyScreen;