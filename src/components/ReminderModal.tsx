import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from './Card';
import Button from './Button';
import Icon from './Icon';
import DateInput from './DateInput';
import { COLORS, SPACING } from '../constants';
import ApiService from '../services/api';
import NotificationService from '../services/notificationService';
import { Reminder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

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
  const [loading, setLoading] = useState(false);
  const [reminderTypes, setReminderTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<Reminder['type']>('oil');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  
  // Date picker states

  // Load reminder types on component mount
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
      setNextServiceDate(editingReminder.next_service_date ? editingReminder.next_service_date.split('T')[0] : '');
    } else {
      setSelectedType('oil');
      setTitle('');
      setDescription('');
      setNextServiceDate('');
    }
  }, [editingReminder]);

  // Update title when type changes (for new reminders)
  useEffect(() => {
    if (!editingReminder && selectedType) {
      // Set title to the translated type name for new reminders
      const typeTitle = t(`reminders.types.${selectedType}`);
      setTitle(typeTitle);
    }
  }, [selectedType, editingReminder, t]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('addReminder.enterTitle'));
      return;
    }

    if (!nextServiceDate.trim()) {
      Alert.alert(t('common.error'), t('addReminder.enterNextServiceDate'));
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
        // Редактирование существующего напоминания
        createdReminder = await ApiService.updateReminder(editingReminder.id, reminderData);
        // Отменяем старое уведомление
        await NotificationService.cancelReminderNotification(editingReminder.id);
      } else {
        // Создание нового напоминания
        createdReminder = await ApiService.createReminder(userId, reminderData);
      }

      // Планируем уведомление для напоминания
      await NotificationService.scheduleReminderNotification(createdReminder);

      onReminderAdded();
      onClose();
    } catch (error) {
      console.error('Error saving reminder:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('common.error'), `${t('addReminder.createError')}: ${errorMessage}`);
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

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getNextMonthDate = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
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
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {editingReminder ? t('common.edit') : t('addReminder.title')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.form}>
                {/* Type Selection */}
                <View style={styles.section}>
                  <Text style={styles.label}>{t('addReminder.serviceType')}</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.typeScrollContainer}
                    contentContainerStyle={styles.typeScrollContent}
                  >
                    <View style={styles.typeGrid}>
                      {reminderTypes.map((type) => (
                        <TouchableOpacity
                          key={type.key}
                          style={[
                            styles.typeButton,
                            selectedType === type.key && styles.typeButtonSelected,
                          ]}
                          onPress={() => setSelectedType(type.key as Reminder['type'])}
                        >
                          <Icon
                            name={type.icon}
                            size={20}
                            color={selectedType === type.key ? COLORS.background : type.color}
                          />
                          <Text
                            style={[
                              styles.typeButtonText,
                              selectedType === type.key && styles.typeButtonTextSelected,
                            ]}
                          >
                            {type.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Title */}
                <View style={styles.section}>
                  <Text style={styles.label}>{t('addReminder.name')} *</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('addReminder.name')}
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.label}>{t('addReminder.description')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('addReminder.description')}
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </View>


                {/* Next Service */}
                <View style={styles.section}>
                  <DateInput
                    label={t('addReminder.nextService')}
                    value={nextServiceDate}
                    onDateChange={setNextServiceDate}
                    placeholder={t('addReminder.selectDate')}
                  />
                  <View style={styles.quickFillRow}>
                    <TouchableOpacity
                      style={styles.quickFillButton}
                      onPress={() => {
                        setNextServiceDate(getNextMonthDate());
                      }}
                    >
                      <Icon name="calendar" size={16} color={COLORS.accent} />
                      <Text style={styles.quickFillText}>{t('addReminder.nextMonth')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>


              <View style={styles.buttons}>
                <Button
                  title={t('common.cancel')}
                  onPress={handleClose}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title={t('common.save')}
                  onPress={handleSave}
                  loading={loading}
                  style={styles.saveButton}
                />
              </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40, // Для центрирования заголовка
  },
  scrollView: {
    flex: 1,
  },
  contentCard: {
    margin: SPACING.lg,
  },
  form: {
    gap: SPACING.lg,
    margin: SPACING.lg,
  },
  section: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  typeScrollContainer: {
    marginBottom: SPACING.sm,
  },
  typeScrollContent: {
    paddingRight: SPACING.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    width: '100%',
  },
  typeButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 4,
    minWidth: 88,
    maxWidth: 100,
    height: 84,
    justifyContent: 'center',
  },
  typeButtonSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  typeButtonText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
  },
  typeButtonTextSelected: {
    color: COLORS.background,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfWidth: {
    flex: 1,
  },
  quickFillRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  quickFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  quickFillText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.md,
    margin: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default ReminderModal;
