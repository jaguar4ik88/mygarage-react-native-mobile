import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Analytics from '../services/analyticsService';
import CrashlyticsService from '../services/crashlyticsService';
import { AUTH_CONFIG } from '../config/auth';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  navigation?: any;
  initialMode?: 'login' | 'register';
}

type AuthChromeFieldProps = {
  icon: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'ascii-capable';
  autoCapitalize?: 'none' | 'words';
  textContentType?: TextInput['props']['textContentType'];
  autoComplete?: TextInput['props']['autoComplete'];
  autoCorrect?: boolean;
};

function AuthChromeField({
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  textContentType,
  autoComplete,
  autoCorrect = false,
}: AuthChromeFieldProps) {
  const { appearanceKey } = useTheme();
  const chromeStyles = useMemo(
    () =>
      StyleSheet.create({
        fieldWrap: {
          marginBottom: SPACING.md,
        },
        fieldRow: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.xl,
          paddingHorizontal: SPACING.md,
          paddingVertical: 14,
          gap: SPACING.sm,
        },
        fieldRowError: {
          borderColor: hexToRgba(COLORS.error, 0.6),
        },
        fieldIcon: {
          marginRight: 2,
        },
        fieldInput: {
          flex: 1,
          fontSize: 15,
          fontFamily: FONTS.regular,
          color: COLORS.text,
          paddingVertical: 0,
        },
        fieldError: {
          marginTop: SPACING.xs,
          marginLeft: SPACING.xs,
          fontSize: 12,
          fontFamily: FONTS.medium,
          color: COLORS.error,
        },
      }),
    [appearanceKey]
  );

  return (
    <View style={chromeStyles.fieldWrap}>
      <View style={[chromeStyles.fieldRow, error ? chromeStyles.fieldRowError : null]}>
        <Icon name={icon} size={18} color={COLORS.textSecondary} style={chromeStyles.fieldIcon} />
        <TextInput
          style={chromeStyles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          spellCheck={false}
          textContentType={textContentType}
          autoComplete={autoComplete}
          selectionColor={COLORS.accent}
        />
      </View>
      {error ? <Text style={chromeStyles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, navigation, initialMode = 'login' }) => {
  const { appearanceKey } = useTheme();
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
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

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
          marginBottom: SPACING.md,
        },
        segmentWrap: {
          flexDirection: 'row',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surface,
          padding: 4,
          gap: 4,
          marginBottom: SPACING.lg,
        },
        segmentBtn: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
        },
        segmentBtnActive: {
          backgroundColor: COLORS.accent,
        },
        segmentLabel: {
          fontSize: 11,
          fontFamily: FONTS.semiBold,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        },
        segmentLabelActive: {
          color: COLORS.background,
        },
        segmentLabelMuted: {
          color: COLORS.textSecondary,
        },
        form: {
          width: '100%',
        },
        forgotPasswordButton: {
          alignSelf: 'flex-end',
          marginBottom: SPACING.md,
          marginTop: -SPACING.xs,
        },
        forgotPasswordText: {
          fontSize: 11,
          fontFamily: FONTS.medium,
          color: COLORS.textSecondary,
        },
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
        dividerContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: SPACING.lg,
        },
        dividerLine: {
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: COLORS.border,
        },
        dividerText: {
          marginHorizontal: SPACING.md,
          fontSize: 10,
          fontFamily: FONTS.semiBold,
          letterSpacing: 2,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
        },
        socialButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.surface,
          borderRadius: 999,
          paddingVertical: 14,
          paddingHorizontal: SPACING.md,
          marginBottom: SPACING.sm,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        socialButtonText: {
          marginLeft: SPACING.sm,
          fontSize: 14,
          fontFamily: FONTS.semiBold,
          color: COLORS.text,
        },
        legalDisclaimer: {
          marginTop: SPACING.lg,
          fontSize: 10,
          lineHeight: 15,
          fontFamily: FONTS.regular,
          color: COLORS.textMuted,
          textAlign: 'center',
        },
      }),
    [appearanceKey]
  );

  const configureGoogleSignIn = () => {
    try {
      // Для iOS используем CLIENT_ID из GoogleService-Info.plist
      // CLIENT_ID: 1041379542857-5i00r9ism77rikh77l5hn9lhednciv37.apps.googleusercontent.com
      // iOS Client ID (без .apps.googleusercontent.com): 1041379542857-5i00r9ism77rikh77l5hn9lhednciv37
      const config: any = {
        webClientId: AUTH_CONFIG.google.webClientId,
        offlineAccess: true,
        scopes: ['profile', 'email'],
      };
      
      if (Platform.OS === 'ios') {
        // iOS Client ID - используем из AUTH_CONFIG (который берет из GOOGLE_IOS_CLIENT_ID в .env)
        if (AUTH_CONFIG.google.iosClientId) {
          config.iosClientId = AUTH_CONFIG.google.iosClientId;
          console.log('✅ iOS Client ID configured:', config.iosClientId);
        }
        
        console.log('✅ iOS Web Client ID configured:', config.webClientId);
      }
      
      console.log('✅ Google Sign-In config:', {
        webClientId: config.webClientId,
        iosClientId: config.iosClientId,
        offlineAccess: config.offlineAccess,
        scopes: config.scopes,
      });
      
      GoogleSignin.configure(config);
      console.log('✅ Google Sign-In configured');
    } catch (error) {
      console.error('❌ Failed to configure Google Sign-In:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await Analytics.track('google_signin_started');
      
      // Проверяем доступность Google Play Services (только для Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }
      
      // Выполняем вход
      const signInResult = await GoogleSignin.signIn();
      
      console.log('SignIn result type:', typeof signInResult);
      console.log('SignIn result:', JSON.stringify(signInResult, null, 2));
      console.log('SignIn result.data:', signInResult?.data);
      
      // Проверяем, что вход прошел успешно
      // signIn может вернуть null если пользователь отменил вход
      if (!signInResult) {
        console.log('SignIn returned null - user cancelled');
        throw new Error('Google Sign-In cancelled by user');
      }
      
      // Проверяем наличие данных пользователя
      const hasData = signInResult.data !== null && signInResult.data !== undefined;
      
      console.log('Has data:', hasData);
      
      if (!hasData) {
        console.warn('SignIn completed but no user data - checking current user...');
        const currentUser = await GoogleSignin.getCurrentUser();
        console.log('Current user:', currentUser);
        
        if (!currentUser) {
          throw new Error('Google Sign-In failed: No user data received and user not signed in');
        }
      }
      
      console.log('Google Sign-In успешно, получаем токены...');
      
      // Получаем ID token через getTokens (правильный способ для react-native-google-signin)
      // signIn() может не возвращать idToken напрямую, нужно использовать getTokens()
      let idToken: string | null = null;
      
      try {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
        console.log('✅ Tokens received successfully');
      } catch (tokensError: any) {
        console.error('Error getting tokens:', tokensError);
        // Если getTokens не работает, проверяем текущего пользователя
        const currentUser = await GoogleSignin.getCurrentUser();
        console.log('Current user after signIn:', currentUser);
        
        if (!currentUser) {
          throw new Error('Google Sign-In failed: User not signed in and no tokens available');
        }
        
        // Пытаемся получить токены еще раз после проверки пользователя
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }
      
      console.log('Google Sign-In успешно, отправляем на сервер...');
      
      // Отправляем токен на сервер через AuthContext
      await loginWithGoogle(idToken);
      
      // Set user ID for Crashlytics
      const userInfo = signInResult.data?.user || (await GoogleSignin.getCurrentUser())?.user;
      if (userInfo?.id) {
        await CrashlyticsService.setUserId(userInfo.id);
        await CrashlyticsService.setAttribute('user_email', userInfo.email || 'unknown');
      }
      
      await Analytics.track('google_signin_success');
      
      // Небольшая задержка перед вызовом onAuthSuccess, чтобы избежать закрытия приложения
      setTimeout(() => {
        onAuthSuccess();
      }, 100);
      
    } catch (error: any) {
      // Пользователь отменил авторизацию - это не ошибка
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled Google Sign-In');
        setLoading(false);
        return;
      }
      
      // Реальная ошибка - отправляем в аналитику и Crashlytics
      const errorMessage = error?.message || 'Unknown error';
      await Analytics.track('google_signin_failed', { 
        error: errorMessage,
        code: error?.code,
        platform: Platform.OS,
        isTablet: Platform.OS === 'ios' ? (Platform as any).isPad || false : false,
      });
      
      // Логируем в Crashlytics для отладки
      await CrashlyticsService.recordError(
        new Error(`Google Sign-In failed: ${errorMessage}`),
        'Google Sign-In Error'
      );
      
      // Предотвращаем краш приложения
      try {
        if (error.code === statusCodes.IN_PROGRESS) {
          Alert.alert(t('common.error'), t('auth.signInInProgress') || 'Sign in is already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          // Эта ошибка только для Android
          Alert.alert(t('common.error'), t('auth.playServicesNotAvailable') || 'Google Play Services not available');
        } else {
          console.error('Google Sign-In error:', error);
          const userFriendlyMessage = errorMessage.includes('URL schemes') 
            ? t('auth.googleSignInConfigError') || 'Google Sign-In configuration error. Please contact support.'
            : errorMessage;
          Alert.alert(
            t('common.error'), 
            userFriendlyMessage || t('auth.googleSignInFailed') || 'Failed to sign in with Google'
          );
        }
      } catch (alertError) {
        console.error('Error showing alert:', alertError);
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
          {navigation ? (
            <ScreenBackLink onPress={() => navigation.goBack()} />
          ) : null}

          <Text style={styles.pageTitle}>{isLogin ? t('auth.tabLogin') : t('auth.tabRegister')}</Text>
          <Text style={styles.pageSub}>
            {isLogin ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
          </Text>

          <View style={styles.segmentWrap}>
            <Pressable
              onPress={() => {
                setIsLogin(true);
                setErrors({});
              }}
              style={[styles.segmentBtn, isLogin && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentLabel, isLogin ? styles.segmentLabelActive : styles.segmentLabelMuted]}>
                {t('auth.tabLogin')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsLogin(false);
                setErrors({});
              }}
              style={[styles.segmentBtn, !isLogin && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentLabel, !isLogin ? styles.segmentLabelActive : styles.segmentLabelMuted]}>
                {t('auth.tabRegister')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <AuthChromeField
                icon="person-outline"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder={t('auth.namePlaceholder')}
                error={errors.name}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
              />
            )}

            <AuthChromeField
              icon="mail-outline"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder={t('auth.emailPlaceholder')}
              error={errors.email}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <AuthChromeField
              icon="lock-closed-outline"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder={t('auth.passwordPlaceholder')}
              error={errors.password}
              secureTextEntry
              textContentType={isLogin ? 'password' : 'newPassword'}
              autoComplete={isLogin ? 'password' : 'password-new'}
              keyboardType="ascii-capable"
            />

            {isLogin && navigation ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPasswordButton}
                activeOpacity={0.75}
              >
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            ) : null}

            {!isLogin && (
              <AuthChromeField
                icon="lock-closed-outline"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                error={errors.confirmPassword}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                keyboardType="ascii-capable"
              />
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {(isLogin ? t('auth.login') : t('auth.createAccount')).toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('socialAuth.orDivider').toUpperCase()}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Icon name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.socialButtonText}>{t('socialAuth.continueWithGoogle')}</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Icon name="logo-apple" size={22} color={COLORS.text} />
                <Text style={styles.socialButtonText}>{t('socialAuth.continueWithApple')}</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.legalDisclaimer}>{t('auth.legalDisclaimer')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;
