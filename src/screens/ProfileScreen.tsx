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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileEditModal from '../components/ProfileEditModal';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING, BASE_URL, RADIUS, ACTION_COLORS, hexToRgba } from '../constants';
import appConfig from '../../app.json';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/api';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onAddCar: () => void;
  navigation?: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack: _onBack,
  onLogout,
  onAddCar: _onAddCar,
  navigation,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { colorScheme, setColorScheme, appearanceKey } = useTheme();
  const { isGuest, user, refreshUser } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqData, setFaqData] = useState<any[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    setLoading(false);
    if (user?.id) {
      loadData();
    } else if (isGuest) {
      // guest
    } else {
      refreshUser().then(() => {
        if (user?.id) {
          loadData();
        }
      });
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    if (faqOpen) {
      loadFaq();
    }
  }, [faqOpen, language]);

  const loadData = async () => {
    try {
      const userDataRes = await ApiService.getProfile();
      setUserData(userDataRes);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFaq = async () => {
    try {
      setFaqLoading(true);
      const faq = await ApiService.getFaq(language);
      setFaqData(faq);
    } catch (error) {
      console.error('Error loading FAQ:', error);
    } finally {
      setFaqLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.exit'), t('profile.logoutConfirm'), [
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
            onLogout();
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('profile.deleteAccountTitle'), t('profile.deleteAccountMessage'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteAccountConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteAccount();
            Alert.alert(t('common.success') || 'Success', t('profile.deleteAccountSuccess'), [
              {
                text: t('common.ok') || 'OK',
                onPress: () => {
                  onLogout();
                },
              },
            ]);
          } catch (error) {
            console.error('Delete account error:', error);
            Alert.alert(t('common.error') || 'Error', t('profile.deleteAccountError'));
          }
        },
      },
    ]);
  };

  const handleRateApp = () => {
    let url = '';
    if (Platform.OS === 'ios') {
      url = 'itms-apps://apps.apple.com/app/id6753170441';
    } else if (Platform.OS === 'android') {
      url = 'market://details?id=uno.mygarage.app';
    } else {
      url = `${BASE_URL}/`;
    }

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open app store:', err);
      const fallbackUrl =
        Platform.OS === 'android'
          ? 'https://play.google.com/store/apps/details?id=uno.mygarage.app'
          : Platform.OS === 'ios'
            ? 'https://apps.apple.com/us/app/mygarage-uno/id6753170441'
            : `${BASE_URL}/`;
      Linking.openURL(fallbackUrl).catch(() => {
        Alert.alert(
          t('common.error'),
          t('profile.failedToOpenAppStore') || 'Не удалось открыть магазин приложений'
        );
      });
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale = language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const initials = React.useMemo(() => {
    const n = userData?.name?.trim();
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }, [userData?.name]);

  const avatarFg = colorScheme === 'precision' ? '#1a1b21' : '#FFFFFF';

  const planBadgeLabel = React.useMemo(() => {
    const p = user?.plan_type;
    if (!p || p === 'free') return 'FREE';
    return p.toUpperCase();
  }, [user?.plan_type]);

  const languageLabel =
    language === 'uk' ? 'Українська' : language === 'ru' ? 'Русский' : 'English';

  const styles = React.useMemo(() => createStyles(), [appearanceKey]);

  /** Вкл = Precision (основная тёмная), выкл = светлая схема */
  const handlePrecisionToggle = (enabled: boolean) => {
    void setColorScheme(enabled ? 'precision' : 'light');
  };

  const pickLanguage = () => {
    Alert.alert(t('profile.language'), t('common.selectLanguage'), [
      {
        text: t('profile.languageOptions.ukrainian'),
        onPress: () => setLanguage('uk'),
        style: language === 'uk' ? 'default' : 'cancel',
      },
      {
        text: t('profile.languageOptions.english'),
        onPress: () => setLanguage('en'),
        style: language === 'en' ? 'default' : 'cancel',
      },
      {
        text: t('profile.languageOptions.russian'),
        onPress: () => setLanguage('ru'),
        style: language === 'ru' ? 'default' : 'cancel',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        bounces
        {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
      >
        {loading && !userData && (
          <View style={styles.loadingTop}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        )}

        <View style={styles.pagePad}>
          {userData && userData.name ? (
            <View style={styles.heroCard}>
              <View style={[styles.heroAvatar, { backgroundColor: COLORS.accent }]}>
                <Text style={[styles.heroAvatarText, { color: avatarFg }]}>{initials}</Text>
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.heroName}>{userData.name}</Text>
                <Text style={styles.heroEmail}>{userData.email}</Text>
                {userData.currency ? (
                  <Text style={styles.heroMeta}>
                    {t('profile.currency')}: {userData.currency}
                  </Text>
                ) : null}
                <Text style={styles.heroMeta}>
                  {t('profile.memberSince')} {formatDate(userData.created_at)}
                </Text>
              </View>
              <View style={styles.heroAside}>
                <TouchableOpacity
                  onPress={() => navigation?.navigate('Subscription')}
                  style={styles.heroPlanBadge}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroPlanBadgeText}>{planBadgeLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.group}>
            <Text style={styles.groupHeading}>{t('profile.settings')}</Text>
            <View style={styles.groupSurface}>
              {isGuest ? (
                <TouchableOpacity
                  style={styles.profileRow}
                  onPress={() => navigation?.navigate('Auth', { mode: 'register' })}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowIconWrap}>
                    <Icon name="profile" size={18} color={COLORS.accent} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, { color: COLORS.accent }]}>
                      {t('profile.register')}
                    </Text>
                  </View>
                  <Icon name="forward" size={16} color={COLORS.accent} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.profileRow}
                  onPress={() => setIsEditOpen(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowIconWrap}>
                    <Icon name="profile" size={18} color={COLORS.accent} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{t('profile.editProfile')}</Text>
                  </View>
                  <Icon name="forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}

              <View style={styles.profileRow}>
                <View style={styles.rowIconWrap}>
                  <Icon name="notification" size={18} color={COLORS.accent} />
                </View>
                <View style={[styles.rowBody, { flex: 1 }]}>
                  <Text style={styles.rowTitle}>{t('profile.notifications')}</Text>
                </View>
                <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
              </View>

              <View style={styles.profileRow}>
                <View style={styles.rowIconWrap}>
                  <Icon name="theme" size={18} color={COLORS.accent} />
                </View>
                <View style={[styles.rowBody, { flex: 1 }]}>
                  <Text style={styles.rowTitle}>{t('profile.darkTheme')}</Text>
                </View>
                <Switch
                  value={colorScheme === 'precision'}
                  onValueChange={handlePrecisionToggle}
                />
              </View>

              <TouchableOpacity style={styles.profileRow} onPress={pickLanguage} activeOpacity={0.85}>
                <View style={styles.rowIconWrap}>
                  <Icon name="language" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t('profile.language')}</Text>
                  <Text style={styles.rowSub}>{languageLabel}</Text>
                </View>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              {user?.id ? (
                <TouchableOpacity
                  style={styles.profileRow}
                  onPress={() => navigation?.navigate('Subscription')}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowIconWrap}>
                    <Icon name="credit-card" size={18} color={COLORS.accent} />
                  </View>
                  <View style={[styles.rowBody, { flex: 1 }]}>
                    <Text style={styles.rowTitle}>{t('subscription.title') || 'Подписка'}</Text>
                  </View>
                  {user?.plan_type && user?.plan_type !== 'free' ? (
                    <View style={styles.inlinePlanBadge}>
                      <Text style={[styles.inlinePlanBadgeText, { color: avatarFg }]}>
                        {user.plan_type.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                  <Icon name="forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupHeading}>{t('profile.support')}</Text>
            <View style={styles.groupSurface}>
              <TouchableOpacity style={styles.profileRow} onPress={() => setFaqOpen(true)} activeOpacity={0.85}>
                <View style={styles.rowIconWrap}>
                  <Icon name="help" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t('profile.help')}</Text>
                </View>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileRow}
                onPress={() => Linking.openURL('mailto:feedback@mygarage.uno')}
                activeOpacity={0.85}
              >
                <View style={styles.rowIconWrap}>
                  <Icon name="contact" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t('profile.contactUs')}</Text>
                </View>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileRow} onPress={handleRateApp} activeOpacity={0.85}>
                <View style={styles.rowIconWrap}>
                  <Icon name="star" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t('profile.rateApp')}</Text>
                </View>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupHeading}>{t('profile.sectionInfo')}</Text>
            <View style={styles.groupSurface}>
              <TouchableOpacity style={styles.profileRow} onPress={() => setAboutOpen(true)} activeOpacity={0.85}>
                <View style={styles.rowIconWrap}>
                  <Icon name="about" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t('profile.aboutApp')}</Text>
                </View>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileRow} onPress={() => setTermsOpen(true)} activeOpacity={0.85}>
                <View style={styles.rowIconWrap}>
                  <Icon name="file" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t('profile.termsOfService')}</Text>
                </View>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileRow} onPress={() => setPrivacyOpen(true)} activeOpacity={0.85}>
                <View style={styles.rowIconWrap}>
                  <Icon name="shield" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t('profile.privacyPolicy')}</Text>
                </View>
                <Icon name="forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Icon name="logout" size={18} color={COLORS.accent} />
            <Text style={styles.logoutBtnText}>{t('profile.logoutAccount')}</Text>
          </TouchableOpacity>

          {user?.id ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.85}>
              <Icon name="delete" size={18} color={ACTION_COLORS.colorDelete} />
              <Text style={styles.deleteBtnText}>{t('profile.deleteAccount')}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      <ProfileEditModal
        visible={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={user}
        onSaved={loadData}
      />

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
              faqData.map((category) => (
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
              ))
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>{t('common.failedToLoadData')}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={privacyOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPrivacyOpen(false)}>
        <PrivacyPolicyScreen onBack={() => setPrivacyOpen(false)} />
      </Modal>

      <Modal visible={termsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTermsOpen(false)}>
        <TermsOfServiceScreen onBack={() => setTermsOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      overflow: 'hidden',
    },
    scrollView: {
      flex: 1,
      overflow: 'hidden',
    },
    scrollContent: {
      flexGrow: 1,
    },
    loadingTop: {
      padding: SPACING.lg,
      alignItems: 'center',
    },
    pagePad: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xl,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      overflow: 'hidden',
    },
    heroAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    heroAvatarText: {
      fontSize: 20,
      fontFamily: FONTS.bold,
    },
    heroBody: {
      flex: 1,
      minWidth: 0,
    },
    heroName: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: COLORS.text,
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    heroEmail: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
      marginBottom: 4,
    },
    heroMeta: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    heroAside: {
      alignItems: 'flex-end',
      flexShrink: 0,
      marginLeft: SPACING.sm,
      maxWidth: '42%',
    },
    heroPlanBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: hexToRgba(COLORS.accent, 0.35),
      backgroundColor: hexToRgba(COLORS.accent, 0.12),
    },
    heroPlanBadgeText: {
      fontSize: 10,
      fontFamily: FONTS.bold,
      color: COLORS.accent,
      letterSpacing: 0.8,
    },
    group: {
      marginBottom: SPACING.lg,
    },
    groupHeading: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: COLORS.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: SPACING.sm,
    },
    groupSurface: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      overflow: 'hidden',
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    rowIconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm,
      backgroundColor: hexToRgba(COLORS.text, 0.06),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: COLORS.text,
    },
    rowSub: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: COLORS.textMuted,
    },
    inlinePlanBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.accent,
      marginRight: SPACING.sm,
    },
    inlinePlanBadgeText: {
      fontSize: 10,
      fontFamily: FONTS.bold,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      marginTop: SPACING.sm,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      marginTop: SPACING.sm,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: hexToRgba(ACTION_COLORS.colorDelete, 0.4),
      backgroundColor: hexToRgba(ACTION_COLORS.colorDelete, 0.1),
    },
    logoutBtnText: {
      marginLeft: SPACING.sm,
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: COLORS.text,
    },
    deleteBtnText: {
      marginLeft: SPACING.sm,
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: ACTION_COLORS.colorDelete,
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
      fontFamily: FONTS.medium,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: FONTS.bold,
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
      fontFamily: FONTS.regular,
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
      fontFamily: FONTS.regular,
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
      fontFamily: FONTS.bold,
      color: COLORS.text,
      marginLeft: SPACING.sm,
    },
    faqQuestion: {
      marginBottom: SPACING.lg,
      paddingLeft: SPACING.md,
    },
    faqQuestionText: {
      fontSize: 16,
      fontFamily: FONTS.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    faqAnswerText: {
      fontSize: 14,
      fontFamily: FONTS.regular,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
  });

export default ProfileScreen;
