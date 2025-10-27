import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileEditModal from '../components/ProfileEditModal';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import appConfig from '../../app.json';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/api';
import { User, Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import CrashlyticsService from '../services/crashlyticsService';
import Paywall from '../components/Paywall';
import NotificationService from '../services/notificationService';
import * as Notifications from 'expo-notifications';

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onAddCar: () => void;
  navigation?: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onLogout,
  onAddCar,
  navigation,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, isDark } = useTheme();
  const { isGuest, user } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqData, setFaqData] = useState<any[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  
  // DEV: Временное состояние для тестирования Paywall
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('unlimited_vehicles');

  useEffect(() => {
    if (user?.id) {
      loadData();
    } else if (isGuest) {
      // Для гостевого режима показываем пустой экран без загрузки
      setLoading(false);
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    if (faqOpen) {
      loadFaq();
    }
  }, [faqOpen, language]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, vehiclesData] = await Promise.all([
        ApiService.getProfile(),
        ApiService.getVehicles(),
      ]);
      
      setUserData(userData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert(t('profile.error'), t('profile.failedToLoadProfile'));
    } finally {
      setLoading(false);
    }
  };

  const loadFaq = async () => {
    try {
      setFaqLoading(true);
      console.log('Loading FAQ for language:', language);
      const faq = await ApiService.getFaq(language);
      console.log('FAQ data loaded:', JSON.stringify(faq, null, 2));
      setFaqData(faq);
    } catch (error) {
      console.error('Error loading FAQ:', error);
    } finally {
      setFaqLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    Alert.alert(
      t('profile.deleteVehicle'),
      `${t('profile.deleteVehicleConfirm')} ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteVehicle(vehicle.id);
              await loadData();
            } catch (error) {
              Alert.alert(t('profile.error'), t('profile.failedToDeleteVehicle'));
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.exit'),
      t('profile.logoutConfirm'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.logout();
              onLogout();
            } catch (error) {
              console.error('Logout error:', error);
              onLogout(); // Force logout even if API call fails
            }
          },
        },
      ]
    );
  };

  const handleRateApp = () => {
    let url = '';
    
    if (Platform.OS === 'ios') {
      // Приоритет: сначала пытаемся открыть в App Store приложении
      url = 'itms-apps://apps.apple.com/app/id6753170441';
    } else if (Platform.OS === 'android') {
      // Пытаемся открыть в Google Play приложении
      url = 'market://details?id=uno.mygarage.app';
    } else {
      url = 'https://mygarage.uno/';
    }
    
    Linking.openURL(url).catch(err => {
      console.error('Failed to open app store:', err);
      // Fallback на веб-версию
      const fallbackUrl = Platform.OS === 'android' 
        ? 'https://play.google.com/store/apps/details?id=uno.mygarage.app'
        : Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/mygarage-uno/id6753170441'
        : 'https://mygarage.uno/';
      Linking.openURL(fallbackUrl).catch(() => {
        Alert.alert(t('common.error'), t('profile.failedToOpenAppStore') || 'Не удалось открыть магазин приложений');
      });
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'uk' ? 'uk-UA' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Recreate styles when theme changes so COLORS mutations take effect immediately
  const styles = React.useMemo(() => createStyles(), [isDark]);

  if (loading) {
    return <LoadingSpinner text={t('profile.loadingProfile')} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left','right','bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {userData && userData.name && (
          <Card style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userData.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{userData.name}</Text>
                <Text style={styles.userEmail}>{userData.email}</Text>
                {userData.currency && (
                  <Text style={styles.userCurrency}>
                    {t('profile.currency')}: {userData.currency}
                  </Text>
                )}
                <Text style={styles.userDate}>
                  {t('profile.memberSince')} {formatDate(userData.created_at)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditOpen(true)} style={styles.editProfileButton}>
                <Icon name="edit" size={18} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </Card>
        )}


        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          
          {isGuest ? (
            <TouchableOpacity 
              style={styles.settingItem} 
              onPress={() => {
                if (navigation) {
                  navigation.navigate('Auth', { mode: 'register' });
                }
              }}
            >
              <Icon name="profile" size={20} color={COLORS.accent} style={styles.settingIcon} />
              <Text style={[styles.settingText, { color: COLORS.accent }]}>
                {t('profile.register')}
              </Text>
              <Icon name="forward" size={16} color={COLORS.accent} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.settingItem} onPress={() => setIsEditOpen(true)}>
              <Icon name="profile" size={20} color={COLORS.text} style={styles.settingIcon} />
              <Text style={styles.settingText}>{t('profile.editProfile') || 'Edit profile'}</Text>
              <Icon name="forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          <View style={styles.settingItem}>
            <Icon name="notification" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.notifications')}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <Icon name="theme" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.darkTheme')}</Text>
            <Switch value={true} disabled />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                t('profile.language'),
                t('common.selectLanguage'),
                [
                  {
                    text: t('profile.languageOptions.ukrainian'),
                    onPress: () => setLanguage('uk'),
                    style: language === 'uk' ? 'default' : 'cancel'
                  },
                  {
                    text: t('profile.languageOptions.english'),
                    onPress: () => setLanguage('en'),
                    style: language === 'en' ? 'default' : 'cancel'
                  },
                  {
                    text: t('profile.languageOptions.russian'),
                    onPress: () => setLanguage('ru'),
                    style: language === 'ru' ? 'default' : 'cancel'
                  }
                ]
              );
            }}
          >
            <Icon name="language" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.language')}</Text>
            <Text style={styles.languageValue}>
              {language === 'uk' ? 'Українська' : language === 'ru' ? 'Русский' : 'English'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => setAboutOpen(true)}>
            <Icon name="about" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.aboutApp')}</Text>
            <Icon name="forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Crashlytics Test Button - только в DEV режиме */}
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.settingItem, styles.testButton]} 
              onPress={() => {
                Alert.alert(
                  '🧪 Test Crashlytics',
                  'Выберите тип теста:',
                  [
                    {
                      text: '1. Тестовая ошибка',
                      onPress: () => {
                        try {
                          CrashlyticsService.log('User clicked test error button');
                          CrashlyticsService.setAttribute('test_type', 'manual_error');
                          const testError = new Error('Test Crashlytics Error - это тестовая ошибка!');
                          CrashlyticsService.recordError(testError, 'Manual Test from Profile');
                          Alert.alert('✅ Готово!', 'Ошибка отправлена в Crashlytics.\nПроверьте Firebase Console через 5-10 минут.');
                        } catch (e) {
                          Alert.alert('Ошибка', 'Не удалось отправить тест');
                        }
                      }
                    },
                    {
                      text: '2. API ошибка',
                      onPress: async () => {
                        CrashlyticsService.log('Testing API error');
                        await CrashlyticsService.logApiError('/test/endpoint', 500, 'Test API Error');
                        Alert.alert('✅ Готово!', 'API ошибка отправлена в Crashlytics.');
                      }
                    },
                    {
                      text: '3. Screen ошибка',
                      onPress: async () => {
                        CrashlyticsService.log('Testing screen error');
                        await CrashlyticsService.logScreenError('ProfileScreen', 'Test Screen Error');
                        Alert.alert('✅ Готово!', 'Screen ошибка отправлена в Crashlytics.');
                      }
                    },
                    {
                      text: '4. Краш приложения ⚠️',
                      onPress: () => {
                        Alert.alert(
                          '⚠️ Внимание!',
                          'Приложение принудительно упадёт. Продолжить?',
                          [
                            { text: 'Отмена', style: 'cancel' },
                            { 
                              text: 'Краш!', 
                              style: 'destructive',
                              onPress: () => {
                                CrashlyticsService.log('User triggered test crash');
                                // Принудительный краш
                                setTimeout(() => {
                                  throw new Error('TEST CRASH - Принудительный краш для тестирования Crashlytics');
                                }, 100);
                              }
                            }
                          ]
                        );
                      }
                    },
                    {
                      text: 'Отмена',
                      style: 'cancel'
                    }
                  ]
                );
              }}
            >
              <Icon name="error" size={20} color="#FF6B6B" style={styles.settingIcon} />
              <Text style={[styles.settingText, { color: '#FF6B6B' }]}>🧪 Test Crashlytics</Text>
              <Icon name="forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {/* DEV: Временный пункт для тестирования Paywall */}
          {__DEV__ && (
            <>
              <TouchableOpacity 
                style={[styles.settingItem, { backgroundColor: 'rgba(139, 250, 139, 0.1)', borderColor: 'rgba(139, 250, 139, 0.3)', borderWidth: 1 }]} 
                onPress={() => setShowPaywall(true)}
              >
                <Icon name="star" size={20} color="#8bfa8b" style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: '#8bfa8b' }]}>🎨 Test Paywall</Text>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.settingItem, { backgroundColor: 'rgba(37, 103, 153, 0.1)', borderColor: 'rgba(37, 103, 153, 0.3)', borderWidth: 1 }]} 
                onPress={async () => {
                  try {
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: t('notifications.expenseReminderTitle') || 'MyGarage',
                        body: t('notifications.expenseReminderBody') || 'Не забудьте добавить записи о тратах на автомобиль',
                        data: {
                          type: 'expense_reminder',
                        },
                      },
                      trigger: null, // Немедленное уведомление
                    });
                    Alert.alert('Успех', 'Тестовое уведомление отправлено!');
                  } catch (error) {
                    console.error('Error sending test notification:', error);
                    Alert.alert('Ошибка', 'Не удалось отправить уведомление');
                  }
                }}
              >
                <Icon name="bell" size={20} color={COLORS.accent} style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: COLORS.accent }]}>🔔 Test Expense Notification</Text>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.settingItem} onPress={() => setPrivacyOpen(true)}>
            <Icon name="shield" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.privacyPolicy')}</Text>
            <Icon name="forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Card>

        
          {/* Subscription section */}
          {!isGuest && (
            <Card style={styles.sectionCard}>
              <TouchableOpacity 
                style={styles.settingItem} 
                onPress={() => navigation?.navigate('Subscription')}
              >
                <Icon name="star" size={20} color={COLORS.text} style={styles.settingIcon} />
                <Text style={styles.settingText}>
                  {t('subscription.title') || 'Підписка'}
                </Text>
                {user?.plan_type !== 'free' && (
                  <View style={styles.proBadgeSmall}>
                    <Text style={styles.proBadgeSmallText}>
                      {user?.plan_type?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              </Card>
          )}
       

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.support')}</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => setFaqOpen(true)}>
            <Icon name="help" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.help')}</Text>
            <Icon name="forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => Linking.openURL('mailto:feedback@mygarage.uno')}>
            <Icon name="contact" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.contactUs')}</Text>
            <Icon name="forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleRateApp}>
            <Icon name="star" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.rateApp')}</Text>
            <Icon name="forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Card>

        <Button
          title={t('profile.logoutAccount')}
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
          icon="logout"
        />

        <View style={styles.bottomSpacing} />
      </ScrollView>
      <ProfileEditModal
        visible={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={user}
        onSaved={loadData}
      />
      {/* About Modal */}
      <Modal visible={aboutOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAboutOpen(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAboutOpen(false)}>
              <Text style={styles.modalCancelText}>{t('common.close') || 'Close'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.aboutApp')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.aboutText}>MyGarage v{(appConfig as any)?.expo?.version || '—'}</Text>
            <Text style={styles.aboutText}>© 2025 MyGarage</Text>
            <Text style={[styles.aboutText, { marginTop: SPACING.md }]}>{t('profile.licenses') || 'Licenses'}</Text>
            <Text style={styles.aboutText}>This app uses open-source libraries.</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* FAQ Modal */}
      <Modal visible={faqOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFaqOpen(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFaqOpen(false)}>
              <Text style={styles.modalCancelText}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.faqTitle')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {faqLoading ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : faqData.length > 0 ? (
              faqData.map((category) => {
                console.log('Rendering category:', category.name, 'Questions:', category.questions?.length || 0);
                return (
                  <View key={category.id} style={styles.faqCategory}>
                    <View style={styles.faqCategoryHeader}>
                      <Icon name={category.icon} size={20} color={COLORS.primary} />
                      <Text style={styles.faqCategoryTitle}>{category.name}</Text>
                    </View>
                    {category.questions && category.questions.length > 0 ? (
                      category.questions.map((question: any) => (
                        <View key={question.id} style={styles.faqQuestion}>
                          <Text style={styles.faqQuestionText}>{question.question}</Text>
                          <Text style={styles.faqAnswerText}>{question.answer}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.faqAnswerText}>Нет вопросов в этой категории</Text>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>{t('common.failedToLoadData')}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={privacyOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPrivacyOpen(false)}>
        <PrivacyPolicyScreen onBack={() => setPrivacyOpen(false)} />
      </Modal>

      {/* DEV: Paywall для тестирования стилей */}
      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          navigation?.navigate('Subscription');
        }}
        feature={paywallFeature}
      />

    </SafeAreaView>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.sm,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    margin: SPACING.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileButton: {
    padding: SPACING.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  userCurrency: {
    fontSize: 12,
    color: COLORS.accent,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  userDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sectionCard: {
    margin: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyVehicles: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyVehiclesText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  addCarButton: {
    width: '100%',
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  vehicleVin: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  vehicleActions: {
    flexDirection: 'row',
  },
  vehicleActionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  vehicleActionText: {
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
    width: 24,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  languageValue: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  proBadgeSmall: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  proBadgeSmallText: {
    color: COLORS.background,
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  testButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1,
  },
  settingArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  logoutButton: {
    margin: SPACING.lg,
    borderColor: COLORS.accent,
  },
  bottomSpacing: {
    height: SPACING.xxl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  aboutText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: SPACING.md,
  },
  faqCategory: {
    marginBottom: SPACING.xl,
  },
  faqCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  faqQuestion: {
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.md,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  faqAnswerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default ProfileScreen;
