import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from './Input';
import { COLORS, SPACING } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import ApiService from '../services/api';
import ModalPicker from 'react-native-modal';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  user: { name: string; email: string; currency?: string } | null;
  onSaved: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ visible, onClose, user, onSaved }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [loading, setLoading] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  const currencies = [
    { code: 'UAH', name: t('profile.currencies.UAH') },
    { code: 'USD', name: t('profile.currencies.USD') },
    { code: 'EUR', name: t('profile.currencies.EUR') },
    { code: 'GBP', name: t('profile.currencies.GBP') },
  ];

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setCurrency(user?.currency || 'UAH');
  }, [user, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('profile.emailRequired'));
      return;
    }
    try {
      setLoading(true);
      await ApiService.updateProfile({ name: name.trim(), email: email.trim(), currency: currency });
      Alert.alert(t('common.success'), t('profile.profileUpdated'));
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert(t('common.error'), t('profile.failedToUpdateProfile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text style={styles.modalSaveText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <Input label={t('profile.name')} value={name} onChangeText={setName} placeholder={t('profile.name')} />
              <Input label={t('profile.email')} value={email} onChangeText={setEmail} placeholder={t('profile.email')} keyboardType="email-address" />
              
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>{t('profile.currency')}</Text>
                <TouchableOpacity
                  style={styles.pickerWrapper}
                  onPress={() => setCurrencyPickerVisible(true)}
                >
                  <Text style={styles.pickerText}>
                    {currencies.find(c => c.code === currency)?.name || 'Select Currency'}
                  </Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Currency Picker Modal */}
      <ModalPicker
        isVisible={currencyPickerVisible}
        onBackdropPress={() => setCurrencyPickerVisible(false)}
      >
        <View style={styles.currencyPickerContainer}>
          <Text style={styles.currencyPickerTitle}>{t('profile.selectCurrency')}</Text>
          {currencies.map((curr) => (
            <TouchableOpacity
              key={curr.code}
              style={[
                styles.currencyOption,
                currency === curr.code && styles.currencyOptionSelected
              ]}
              onPress={() => {
                setCurrency(curr.code);
                setCurrencyPickerVisible(false);
              }}
            >
              <Text style={[
                styles.currencyOptionText,
                currency === curr.code && styles.currencyOptionTextSelected
              ]}>
                {curr.name}
              </Text>
              {currency === curr.code && (
                <Text style={styles.currencyCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ModalPicker>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
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
  modalSaveText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  form: {
    gap: SPACING.lg,
  },
  pickerContainer: {
    marginBottom: SPACING.md,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  pickerArrow: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  currencyPickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.md,
    maxHeight: 300,
  },
  currencyPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  currencyOptionSelected: {
    backgroundColor: COLORS.accent + '20',
  },
  currencyOptionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  currencyOptionTextSelected: {
    color: COLORS.accent,
    fontWeight: '500',
  },
  currencyCheckmark: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
});

export default ProfileEditModal;


