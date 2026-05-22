import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../components/Input';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import Analytics from '../services/analyticsService';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const { appearanceKey } = useTheme();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    token: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: COLORS.background,
        },
        keyboardView: {
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.xxl,
          justifyContent: 'center',
        },
        pageTitle: {
          fontSize: 28,
          fontFamily: FONTS.bold,
          letterSpacing: -0.4,
          color: COLORS.text,
        },
        pageSub: {
          marginTop: 6,
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: COLORS.textSecondary,
          marginBottom: SPACING.lg,
        },
        form: {
          width: '100%',
        },
        /** Как primaryBtn на AuthScreen — полная «таблетка», не RADIUS.button */
        primaryBtn: {
          marginTop: SPACING.sm,
          backgroundColor: COLORS.accent,
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
        },
        primaryBtnDisabled: {
          opacity: 0.75,
        },
        primaryBtnText: {
          fontSize: 13,
          fontFamily: FONTS.bold,
          letterSpacing: 1.4,
          color: COLORS.background,
        },
        footerBackLink: {
          marginTop: SPACING.lg,
          alignItems: 'center',
          padding: SPACING.sm,
        },
        footerBackLinkText: {
          fontSize: 11,
          fontFamily: FONTS.medium,
          color: COLORS.textSecondary,
        },
      }),
    [appearanceKey]
  );

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('forgotPassword.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('forgotPassword.errors.invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateReset = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.token) {
      newErrors.token = t('forgotPassword.errors.codeRequired');
    }

    if (!formData.password) {
      newErrors.password = t('forgotPassword.errors.newPasswordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('forgotPassword.errors.passwordTooShort');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      await ApiService.forgotPassword(formData.email);
      await Analytics.track('password_reset_code_sent');

      Alert.alert(
        t('forgotPassword.emailSent'),
        t('forgotPassword.emailSentMessage'),
        [{ text: t('common.ok'), onPress: () => setStep('reset') }]
      );
    } catch (error: any) {
      await Analytics.track('password_reset_code_failed');

      let errorMessage = t('common.error');
      if (error.message?.includes('exists')) {
        errorMessage = t('forgotPassword.errors.emailNotFound');
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateReset()) return;

    setLoading(true);
    try {
      await ApiService.resetPassword(
        formData.email,
        formData.token,
        formData.password,
        formData.confirmPassword
      );

      await Analytics.track('password_reset_success');

      Alert.alert(
        t('forgotPassword.passwordReset'),
        t('forgotPassword.passwordResetMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.navigate('Auth'),
          },
        ]
      );
    } catch (error: any) {
      await Analytics.track('password_reset_failed');

      let errorMessage = t('common.error');
      if (error.message?.includes('token') || error.message?.includes('Invalid')) {
        errorMessage = t('forgotPassword.invalidToken');
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Auth');
  };

  const primaryLabel =
    step === 'email'
      ? t('forgotPassword.sendLink')
      : t('forgotPassword.resetPassword');

  const onPrimaryPress = step === 'email' ? handleSendCode : handleResetPassword;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenBackLink
            onPress={() => navigation.goBack()}
            label={t('forgotPassword.backToLogin')}
            uppercase={false}
          />

          <Text style={styles.pageTitle}>{t('forgotPassword.title')}</Text>
          <Text style={styles.pageSub}>
            {step === 'email'
              ? t('forgotPassword.subtitle')
              : t('forgotPassword.emailSentMessage')}
          </Text>

          <View style={styles.form}>
            {step === 'email' ? (
              <>
                <Input
                  label={t('auth.email')}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="emailAddress"
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  inputStyle={{ backgroundColor: COLORS.surface }}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                  onPress={onPrimaryPress}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.primaryBtnText}>{primaryLabel.toUpperCase()}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Input
                  label={t('forgotPassword.resetCode')}
                  value={formData.token}
                  onChangeText={(value) => handleInputChange('token', value)}
                  error={errors.token}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  spellCheck={false}
                  inputStyle={{ backgroundColor: COLORS.surface }}
                />

                <Input
                  label={t('forgotPassword.newPassword')}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  error={errors.password}
                  secureTextEntry
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                  textContentType="newPassword"
                  inputStyle={{ backgroundColor: COLORS.surface }}
                />

                <Input
                  label={t('auth.confirmPassword')}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  error={errors.confirmPassword}
                  secureTextEntry
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                  textContentType="newPassword"
                  inputStyle={{ backgroundColor: COLORS.surface }}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                  onPress={onPrimaryPress}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.primaryBtnText}>{primaryLabel.toUpperCase()}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={handleBackToLogin}
              style={styles.footerBackLink}
              activeOpacity={0.75}
            >
              <Text style={styles.footerBackLinkText}>{t('forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
