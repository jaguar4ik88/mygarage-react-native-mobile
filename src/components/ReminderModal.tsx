import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './Button';
import Icon from './Icon';
import DateInput from './DateInput';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants';
import ApiService from '../services/api';
import NotificationService from '../services/notificationService';
import { Reminder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onReminderAdded: () => void;
  editingReminder?: Reminder | null;
  userId: number | null;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  visible,
  onClose,
  onReminderAdded,
  editingReminder,
  userId,
}) => {
  const { t, language } = useLanguage();
  const { appearanceKey } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), [appearanceKey]);

  const [loading, setLoading] = useState(false);
  const [reminderTypes, setReminderTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<Reminder['type']>('oil');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');

  useEffect(() => {
    const loadReminderTypes = async () => {
      try {
        const types = await ApiService.getReminderTypes(language);
        setReminderTypes(types);
      } catch (error) {
        console.error('Error loading reminder types:', error);
      }
    };

    if (visible) {
      loadReminderTypes();
    }
  }, [visible, language]);

  useEffect(() => {
    if (editingReminder) {
      setSelectedType(editingReminder.type as Reminder['type']);
      setTitle(editingReminder.title || '');
      setDescription(editingReminder.description || '');
      setNextServiceDate(
        editingReminder.next_service_date ? editingReminder.next_service_date.split('T')[0] : ''
      );
    } else {
      setSelectedType('oil');
      setTitle('');
      setDescription('');
      setNextServiceDate('');
    }
  }, [editingReminder]);

  useEffect(() => {
    if (!editingReminder && selectedType) {
      const typeTitle = t(`reminders.types.${selectedType}`);
      setTitle(typeTitle);
    }
  }, [selectedType, editingReminder, t]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('addReminder.errors.nameRequired'));
      return;
    }

    if (!nextServiceDate.trim()) {
      Alert.alert(t('common.error'), t('addReminder.errors.nextDateRequired'));
      return;
    }

    try {
      setLoading(true);

      const reminderData: Partial<Reminder> = {
        type: selectedType as Reminder['type'],
        title: title.trim(),
        description: description.trim(),
        next_service_date: nextServiceDate || new Date().toISOString(),
        is_active: true,
      };

      if (!userId) {
        Alert.alert(t('common.error'), 'User not found');
        return;
      }

      let createdReminder: Reminder;

      if (editingReminder) {
        createdReminder = await ApiService.updateReminder(editingReminder.id, reminderData);
        await NotificationService.cancelReminderNotification(editingReminder.id);
      } else {
        createdReminder = await ApiService.createReminder(userId, reminderData);
      }

      await NotificationService.scheduleReminderNotification(createdReminder);

      onReminderAdded();
      onClose();
    } catch (error) {
      console.error('Error saving reminder:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('common.error'), `${t('addReminder.errors.saveFailed')}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedType('oil');
    setTitle('');
    setDescription('');
    setNextServiceDate('');
    onClose();
  };

  const getNextMonthDate = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.headerClose, pressed && styles.pressed]}
              hitSlop={12}
            >
              <Icon name="close" size={22} color={COLORS.textSecondary} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {editingReminder ? t('common.edit') : t('addReminder.title')}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{
              paddingBottom: insets.bottom + SPACING.xxl,
              paddingHorizontal: SPACING.lg,
            }}
          >
            <View style={styles.form}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('addReminder.serviceType')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typeRow}
                >
                  {reminderTypes.map((type) => {
                    const sel = selectedType === type.key;
                    return (
                      <TouchableOpacity
                        key={type.key}
                        style={[styles.typePill, sel && styles.typePillSelected]}
                        onPress={() => setSelectedType(type.key as Reminder['type'])}
                        activeOpacity={0.85}
                      >
                        <Icon
                          name={type.icon}
                          size={18}
                          color={sel ? COLORS.background : COLORS.textSecondary}
                        />
                        <Text style={[styles.typePillText, sel && styles.typePillTextSelected]} numberOfLines={2}>
                          {type.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{`${t('addReminder.name')} *`}</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('addReminder.name')}
                  placeholderTextColor={COLORS.textMuted}
                  selectionColor={COLORS.accent}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('addReminder.description')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('addReminder.description')}
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  selectionColor={COLORS.accent}
                />
              </View>

              <View style={styles.fieldBlock}>
                <DateInput
                  label={t('addReminder.nextService')}
                  value={nextServiceDate}
                  onDateChange={setNextServiceDate}
                  placeholder={t('addReminder.selectDate')}
                  labelStyle={styles.fieldLabel}
                  fieldStyle={styles.dateFieldOverride}
                />
                <TouchableOpacity
                  style={styles.quickFill}
                  onPress={() => setNextServiceDate(getNextMonthDate())}
                  activeOpacity={0.85}
                >
                  <Icon name="calendar" size={16} color={COLORS.accent} />
                  <Text style={styles.quickFillText}>{t('addReminder.nextMonth')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('common.save').toUpperCase()}</Text>
              )}
            </TouchableOpacity>

            <Button
              title={t('common.cancel')}
              onPress={handleClose}
              variant="outline"
              style={styles.cancelOutline}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    headerClose: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerSpacer: {
      width: 44,
    },
    pressed: {
      opacity: 0.65,
    },
    headerTitle: {
      flex: 1,
      fontFamily: FONTS.bold,
      fontSize: 18,
      letterSpacing: -0.3,
      color: COLORS.text,
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    form: {
      gap: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    fieldBlock: {
      gap: SPACING.sm,
    },
    fieldLabel: {
      fontFamily: FONTS.semiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: COLORS.textSecondary,
    },
    typeRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    typePill: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      gap: 6,
      minWidth: 92,
      maxWidth: 112,
    },
    typePillSelected: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    typePillText: {
      fontFamily: FONTS.medium,
      fontSize: 10,
      textAlign: 'center',
      color: COLORS.textSecondary,
      lineHeight: 13,
    },
    typePillTextSelected: {
      color: COLORS.background,
    },
    input: {
      fontFamily: FONTS.regular,
      fontSize: 15,
      color: COLORS.text,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 14,
    },
    dateFieldOverride: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    quickFill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    quickFillText: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: COLORS.accent,
    },
    primaryBtn: {
      marginTop: SPACING.xl,
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
      fontFamily: FONTS.bold,
      fontSize: 13,
      letterSpacing: 1.4,
      color: COLORS.background,
    },
    cancelOutline: {
      marginTop: SPACING.md,
      borderRadius: 999,
    },
  });
}

export default ReminderModal;
