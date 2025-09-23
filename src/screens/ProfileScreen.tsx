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
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqData, setFaqData] = useState<any[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
      
      setUser(userData);
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
        {user && (
          <Card style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.currency && (
                  <Text style={styles.userCurrency}>
                    {t('profile.currency')}: {user.currency}
                  </Text>
                )}
                <Text style={styles.userDate}>
                  {t('profile.memberSince')} {formatDate(user.created_at)}
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
          
          <TouchableOpacity style={styles.settingItem} onPress={() => setIsEditOpen(true)}>
            <Icon name="profile" size={20} color={COLORS.text} style={styles.settingIcon} />
            <Text style={styles.settingText}>{t('profile.editProfile') || 'Edit profile'}</Text>
            <Icon name="forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

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
        </Card>

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

          <TouchableOpacity style={styles.settingItem} onPress={() => Linking.openURL('https://mygarage.uno/')}>
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
  settingArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  logoutButton: {
    margin: SPACING.lg,
    borderColor: COLORS.error,
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
