import * as React from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import Analytics from '../services/analyticsService';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    token: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← {t('forgotPassword.backToLogin')}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.logo}>myGarage</Text>
            <Text style={styles.title}>{t('forgotPassword.title')}</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? t('forgotPassword.subtitle')
                : t('forgotPassword.emailSentMessage')}
            </Text>
          </View>

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
                />

                <Button
                  title={t('forgotPassword.sendLink')}
                  onPress={handleSendCode}
                  loading={loading}
                  style={styles.submitButton}
                />
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
                />

                <Button
                  title={t('forgotPassword.resetPassword')}
                  onPress={handleResetPassword}
                  loading={loading}
                  style={styles.submitButton}
                />
              </>
            )}

            <TouchableOpacity
              onPress={handleBackToLogin}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>
                {t('forgotPassword.backToLogin')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  backButton: {
    marginTop: SPACING.md,
    alignItems: 'center',
    padding: SPACING.md,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;

