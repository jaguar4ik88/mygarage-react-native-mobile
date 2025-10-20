import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS } from '../constants';
import Analytics from '../services/analytics';

interface LoginPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
  title?: string;
  message?: string;
  context?: 'addVehicle' | 'addExpense' | 'addReminder' | 'general';
}

const { width } = Dimensions.get('window');

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  visible,
  onClose,
  onLogin,
  onRegister,
  title,
  message,
  context = 'general',
}) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const handleClose = () => {
    Analytics.track('login_prompt_dismissed', { context });
    onClose();
  };

  const handleLogin = () => {
    Analytics.track('login_prompt_accepted', { context, action: 'login' });
    onLogin();
  };

  const handleRegister = () => {
    Analytics.track('login_prompt_accepted', { context, action: 'register' });
    onRegister();
  };

  const getDefaultTitle = () => {
    switch (context) {
      case 'addVehicle':
        return t('loginPrompt.addVehicle');
      case 'addExpense':
        return t('loginPrompt.addExpense');
      case 'addReminder':
        return t('loginPrompt.addReminder');
      default:
        return t('loginPrompt.title');
    }
  };

  const getDefaultMessage = () => {
    return t('loginPrompt.message');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                { backgroundColor: isDark ? COLORS.card : '#FFFFFF' },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Icon name="close" size={24} color={isDark ? COLORS.textMuted : COLORS.textMutedDark} />
              </TouchableOpacity>

              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: COLORS.accent + '20' }]}>
                <Icon name="login" size={40} color={COLORS.accent} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: isDark ? COLORS.text : COLORS.textDark }]}>
                {title || getDefaultTitle()}
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: isDark ? COLORS.textMuted : COLORS.textMutedDark }]}>
                {message || getDefaultMessage()}
              </Text>

              {/* Buttons */}
              <View style={styles.buttonsContainer}>
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
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 48,
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginPromptModal;

