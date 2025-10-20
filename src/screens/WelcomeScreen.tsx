import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS } from '../constants';
import LoadingSpinner from '../components/LoadingSpinner';
import Analytics from '../services/analytics';

interface WelcomeScreenProps {
  navigation: any;
}

const { width, height } = Dimensions.get('window');

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { isAuthenticated, isGuest, continueAsGuest, checkAutoLogin } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    handleAutoLogin();
    
    // Track welcome screen view
    Analytics.track('welcome_screen_viewed');
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCheckingAuth]);

  useEffect(() => {
    // Если пользователь залогинен или гость, переходим на Home
    if ((isAuthenticated || isGuest) && !isCheckingAuth) {
      navigation.replace('Home');
    }
  }, [isAuthenticated, isGuest, isCheckingAuth]);

  const handleAutoLogin = async () => {
    try {
      const autoLoginSuccess = await checkAutoLogin();
      
      if (autoLoginSuccess) {
        // Успешный автоматический вход - навигация произойдет через useEffect
        setIsCheckingAuth(false);
      } else {
        // Нет автоматического входа - показываем Welcome Screen
        setIsCheckingAuth(false);
      }
    } catch (error) {
      console.error('Auto login error:', error);
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = () => {
    Analytics.track('welcome_login_tapped');
    navigation.navigate('Auth', { mode: 'login' });
  };

  const handleRegister = () => {
    Analytics.track('welcome_register_tapped');
    navigation.navigate('Auth', { mode: 'register' });
  };

  const handleContinueAsGuest = async () => {
    try {
      Analytics.track('continue_as_guest');
      await continueAsGuest();
      navigation.replace('Home');
    } catch (error) {
      console.error('Error continuing as guest:', error);
    }
  };

  if (isCheckingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? COLORS.background : '#FFFFFF' }]}>
      {/* Logo/Image Section */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🚗</Text>
        </View>
        <Text style={[styles.title, { color: isDark ? COLORS.text : COLORS.textDark }]}>
          {t('welcome.title')}
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? COLORS.textMuted : COLORS.textMutedDark }]}>
          {t('welcome.subtitle')}
        </Text>
      </Animated.View>

      {/* Buttons Section */}
      <Animated.View
        style={[
          styles.buttonsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Login Button */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: COLORS.accent }]}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.login')}</Text>
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              borderColor: COLORS.accent,
              backgroundColor: 'transparent',
            },
          ]}
          onPress={handleRegister}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: COLORS.accent }]}>
            {t('welcome.register')}
          </Text>
        </TouchableOpacity>

        {/* Continue as Guest */}
        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleContinueAsGuest}
          activeOpacity={0.7}
        >
          <Text style={[styles.guestButtonText, { color: isDark ? COLORS.textMuted : COLORS.textMutedDark }]}>
            {t('welcome.continueAsGuest')}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom decoration */}
      <View style={styles.bottomDecoration}>
        <Text style={[styles.versionText, { color: isDark ? COLORS.textMuted : COLORS.textMutedDark }]}>
          v1.6.0
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.15,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  guestButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomDecoration: {
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    fontSize: 12,
  },
});

export default WelcomeScreen;

