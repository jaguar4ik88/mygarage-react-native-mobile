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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import Input from '../components/Input';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import Analytics from '../services/analyticsService';
import BiometricService from '../services/biometricService';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
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
  }, []);

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
        const response = await ApiService.login(
          formData.email,
          formData.password
        );

        if (response.token) {
          await AsyncStorage.setItem('auth_token', response.token);
          // Сохраняем данные для биометрической аутентификации
          await AsyncStorage.setItem('last_login_email', formData.email);
          await AsyncStorage.setItem('last_login_password', formData.password);
          await ApiService.updateToken();
          await Analytics.track('auth_login_success');
          onAuthSuccess();
        } else {
          await Analytics.track('auth_login_failure');
          Alert.alert(t('common.error'), t('auth.invalidCredentials'));
        }
      } else {
        const response = await ApiService.register(
          formData.email,
          formData.password,
          formData.name
        );

        if (response.token) {
          await AsyncStorage.setItem('auth_token', response.token);
          await ApiService.updateToken();
          await Analytics.track('auth_register_success');
          onAuthSuccess();
        } else {
          await Analytics.track('auth_register_failure');
          Alert.alert(t('common.error'), t('auth.registrationError'));
        }
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
            />

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
                textContentType="password"
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
  switchButton: {
    marginTop: SPACING.md,
  },
});

export default AuthScreen;
