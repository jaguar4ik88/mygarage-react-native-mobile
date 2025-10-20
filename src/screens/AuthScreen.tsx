import * as React from 'react';
import { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Button from '../components/Button';
import Input from '../components/Input';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Analytics from '../services/analyticsService';
import BiometricService from '../services/biometricService';
import CrashlyticsService from '../services/crashlyticsService';
import { AUTH_CONFIG } from '../config/auth';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  navigation?: any;
  initialMode?: 'login' | 'register';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, navigation, initialMode = 'login' }) => {
  const { t } = useLanguage();
  const { login, register, loginWithGoogle, loginWithApple } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');

  // Проверяем доступность биометрии при загрузке экрана
  useEffect(() => {
    checkBiometricAvailability();
    configureGoogleSignIn();
  }, []);

  const configureGoogleSignIn = () => {
    try {
      // Firebase автоматически настраивает Google Sign-In из GoogleService-Info.plist
      // Нужно только указать webClientId для верификации токенов
      GoogleSignin.configure({
        webClientId: AUTH_CONFIG.google.webClientId,
        offlineAccess: true,
      });
      console.log('✅ Google Sign-In configured with Firebase');
    } catch (error) {
      console.error('❌ Failed to configure Google Sign-In:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const {available, biometryType: type} = await BiometricService.isAvailable();
      setBiometricAvailable(available);
      setBiometryType(type || '');
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricAvailable) return;

    setLoading(true);
    try {
      const result = await BiometricService.authenticate('Войдите в myGarage');
      
      if (result.success) {
        // Попытка войти с сохраненными данными
        const savedEmail = await AsyncStorage.getItem('last_login_email');
        const savedPassword = await AsyncStorage.getItem('last_login_password');
        
        if (savedEmail && savedPassword) {
          try {
            const response = await ApiService.login(savedEmail, savedPassword);
            if (response.token) {
              await AsyncStorage.setItem('auth_token', response.token);
              await ApiService.updateToken();
              await Analytics.track('auth_biometric_success');
              onAuthSuccess();
              return;
            }
          } catch (error) {
            console.log('Auto-login failed, clearing saved credentials:', error);
            // Очищаем недействительные данные
            await AsyncStorage.removeItem('last_login_email');
            await AsyncStorage.removeItem('last_login_password');
          }
        }
        
        Alert.alert(
          'Биометрическая аутентификация',
          'Для использования биометрии необходимо сначала войти обычным способом'
        );
      } else if (result.error && !result.error.includes('отменена пользователем')) {
        // Показываем ошибку только если это не отмена пользователем
        Alert.alert('Ошибка', result.error);
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      Alert.alert('Ошибка', 'Не удалось выполнить биометрическую аутентификацию');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await Analytics.track('google_signin_started');
      
      // Проверяем доступность Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Выполняем вход
      const userInfo = await GoogleSignin.signIn();
      
      // Получаем ID token
      const idToken = userInfo.data?.idToken;
      
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }
      
      console.log('Google Sign-In успешно, отправляем на сервер...');
      
      // Отправляем токен на сервер через AuthContext
      await loginWithGoogle(idToken);
      
      // Set user ID for Crashlytics
      if (userInfo.data?.user?.id) {
        await CrashlyticsService.setUserId(userInfo.data.user.id);
        await CrashlyticsService.setAttribute('user_email', userInfo.data.user.email || 'unknown');
      }
      
      await Analytics.track('google_signin_success');
      onAuthSuccess();
      
    } catch (error: any) {
      // Пользователь отменил авторизацию - это не ошибка
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled Google Sign-In');
        return;
      }
      
      // Реальная ошибка - отправляем в аналитику
      await Analytics.track('google_signin_failed', { error: error?.message });
      
      if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Error', 'Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        console.error('Google Sign-In error:', error);
        Alert.alert('Error', error.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (loading) return;
    
    // Apple Sign-In доступен только на iOS
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign-In is only available on iOS devices');
      return;
    }

    try {
      setLoading(true);
      await Analytics.track('apple_signin_started');
      
      // Проверяем доступность Apple Authentication
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device');
      }
      
      // Выполняем запрос авторизации Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      const { identityToken, user, fullName } = credential;
      
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }
      
      // Формируем данные пользователя для отправки на сервер
      // Apple передаёт fullName только при первой авторизации
      let userData = user;
      if (fullName) {
        userData = JSON.stringify({
          name: {
            firstName: fullName.givenName || '',
            lastName: fullName.familyName || '',
          }
        });
        console.log('✅ Отправляем имя на сервер:', userData);
      } else {
        console.log('⚠️ fullName не получен от Apple (не первый вход)');
      }
      
      // Отправляем токен на сервер через AuthContext
      await loginWithApple(identityToken, userData);
      
      // Set user ID for Crashlytics
      if (user) {
        await CrashlyticsService.setUserId(user);
        await CrashlyticsService.setAttribute('user_email', credential.email || 'unknown');
      }
      
      await Analytics.track('apple_signin_success');
      onAuthSuccess();
      
    } catch (error: any) {
      // Пользователь отменил авторизацию - это не ошибка
      if (error.code === 'ERR_CANCELED' || error.message?.includes('canceled')) {
        console.log('User cancelled Apple Sign-In');
        return;
      }
      
      // Реальная ошибка
      await Analytics.track('apple_signin_failed', { error: error?.message });
      console.error('Apple Sign-In error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.passwordMinLength');
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = t('auth.nameRequired');
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = t('auth.confirmPasswordRequired');
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        // Используем login из AuthContext - он обновит isAuthenticated
        await login(formData.email, formData.password);
        
        // Сохраняем данные для биометрической аутентификации (дополнительно)
        await AsyncStorage.setItem('last_login_email', formData.email);
        await AsyncStorage.setItem('last_login_password', formData.password);
        
        // Set user ID for Crashlytics
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          if (user?.id) {
            await CrashlyticsService.setUserId(user.id);
            await CrashlyticsService.setAttribute('user_email', user.email || 'unknown');
          }
        }
        
        onAuthSuccess();
      } else {
        // Используем register из AuthContext - он обновит isAuthenticated
        await register(formData.email, formData.password, formData.name);
        
        // Set user ID for Crashlytics
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          if (user?.id) {
            await CrashlyticsService.setUserId(user.id);
            await CrashlyticsService.setAttribute('user_email', user.email || 'unknown');
          }
        }
        
        onAuthSuccess();
      }
    } catch (error: any) {
      await Analytics.track(isLogin ? 'auth_login_failure' : 'auth_register_failure', {
        message: error?.message || 'unknown',
      });
      
      // Parse validation errors and show them in the form
      if (error.message && error.message.includes(':')) {
        const errorLines = error.message.split('\n');
        const newErrors: Record<string, string> = {};
        
        errorLines.forEach((line: string) => {
          const [field, message] = line.split(': ');
          if (field && message) {
            // Map API field names to form field names
            const formField = field === 'email' ? 'email' : 
                            field === 'password' ? 'password' : 
                            field === 'name' ? 'name' : field;
            newErrors[formField] = message;
          }
        });
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return; // Don't show alert if we set field errors
        }
      }
      
      Alert.alert(t('common.error'), error.message || t('auth.authError'));
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
          {navigation && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color={COLORS.accent} />
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.logo}>myGarage</Text>
            <Text style={styles.subtitle}>
              {t('auth.manageYourCar')}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <Input
                label={t('auth.name')}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                error={errors.name}
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                textContentType="name"
              />
            )}

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textContentType="emailAddress"
            />

            <Input
              label={t('auth.password')}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              error={errors.password}
              secureTextEntry
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              textContentType="password"
              autoComplete="password"
              importantForAutofill="yes"
              keyboardType="ascii-capable"
            />

            {isLogin && navigation && (
              <TouchableOpacity 
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            )}

            {!isLogin && (
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
                autoComplete="password-new"
                importantForAutofill="yes"
                keyboardType="ascii-capable"
              />
            )}

            <Button
              title={isLogin ? t('auth.login') : t('auth.register')}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />


            {isLogin && biometricAvailable && (
              <Button
                title={`${t('auth.biometricSignIn')} ${BiometricService.getBiometryDisplayName(biometryType, t)}`}
                onPress={handleBiometricAuth}
                loading={loading}
                variant="outline"
                style={styles.biometricButton}
              />
            )}

            {/* Social Auth Divider */}
            {isLogin && (
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('socialAuth.orDivider')}</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {/* Google Sign-In */}
            {isLogin && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Icon name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>{t('socialAuth.continueWithGoogle')}</Text>
              </TouchableOpacity>
            )}

            {/* Apple Sign-In */}
            {isLogin && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Icon name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>{t('socialAuth.continueWithApple')}</Text>
              </TouchableOpacity>
            )}

            <Button
              title={isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
              onPress={() => setIsLogin(!isLogin)}
              variant="outline"
              style={styles.switchButton}
            />

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    marginLeft: SPACING.xs,
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
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  biometricButton: {
    marginTop: SPACING.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.textMuted,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  socialButtonText: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  switchButton: {
    marginTop: SPACING.md,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: SPACING.sm,
  },
  forgotPasswordText: {
    color: COLORS.accent,
    fontSize: 14,
  },
});

export default AuthScreen;
