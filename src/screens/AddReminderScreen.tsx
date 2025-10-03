import * as React from 'react';
import { useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import Card from '../components/Card';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import NotificationService from '../services/notificationService';
import { Reminder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AddReminderScreenProps {
  userId: number;
  onReminderAdded: () => void;
  onClose: () => void;
}

const AddReminderScreen: React.FC<AddReminderScreenProps> = ({
  userId,
  onReminderAdded,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [reminderTypes, setReminderTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<Reminder['type']>('oil');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState('');
  const [lastServiceMileage, setLastServiceMileage] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  
  // Date picker states
  const [showLastDatePicker, setShowLastDatePicker] = useState(false);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);
  const [lastDate, setLastDate] = useState(new Date());
  const [nextDate, setNextDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [isLastDatePicker, setIsLastDatePicker] = useState(true);

  // Load reminder types on component mount
  React.useEffect(() => {
    const loadReminderTypes = async () => {
      try {
        const types = await ApiService.getReminderTypes(language);
        setReminderTypes(types);
      } catch (error) {
        console.error('Error loading reminder types:', error);
      }
    };
    
    loadReminderTypes();
  }, [language]);

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
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
        last_service_date: lastServiceDate || new Date().toISOString(),
        next_service_date: nextServiceDate || new Date().toISOString(),
        is_active: true,
      };

      console.log('Sending reminder data:', reminderData);

      const createdReminder = await ApiService.createReminder(userId, reminderData);
      
      // Планируем уведомление для напоминания
      await NotificationService.scheduleReminderNotification(createdReminder);
      
      onReminderAdded();
      onClose();
    } catch (error) {
      console.error('Error creating reminder:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('common.error'), `${t('addReminder.createError')}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
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

  const openDatePicker = (isLast: boolean) => {
    setIsLastDatePicker(isLast);
    setTempDate(isLast ? lastDate : nextDate);
    if (Platform.OS === 'android') {
      setShowLastDatePicker(isLast);
      setShowNextDatePicker(!isLast);
    } else {
      setShowLastDatePicker(isLast);
      setShowNextDatePicker(!isLast);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (selectedDate) {
        if (isLastDatePicker) {
          setLastDate(selectedDate);
          setLastServiceDate(formatDateForInput(selectedDate));
        } else {
          setNextDate(selectedDate);
          setNextServiceDate(formatDateForInput(selectedDate));
        }
      }
      setShowLastDatePicker(false);
      setShowNextDatePicker(false);
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const confirmDate = () => {
    if (isLastDatePicker) {
      setLastDate(tempDate);
      setLastServiceDate(formatDateForInput(tempDate));
    } else {
      setNextDate(tempDate);
      setNextServiceDate(formatDateForInput(tempDate));
    }
    setShowLastDatePicker(false);
    setShowNextDatePicker(false);
  };

  const cancelDatePicker = () => {
    setShowLastDatePicker(false);
    setShowNextDatePicker(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','left','right','bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
        <Card style={styles.contentCard}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('addReminder.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

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
                        size={24}
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

            {/* Last Service */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addReminder.lastService')}</Text>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.subLabel}>{t('addReminder.date')}</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => openDatePicker(true)}
                  >
                    <Text style={[styles.dateInputText, !lastServiceDate && styles.placeholderText]}>
                      {lastServiceDate || t('addReminder.selectDate')}
                    </Text>
                    <Icon name="calendar" size={16} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.subLabel}>{t('addReminder.mileage')}</Text>
                  <TextInput
                    style={styles.input}
                    value={lastServiceMileage}
                    onChangeText={setLastServiceMileage}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Next Service */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addReminder.nextService')} *</Text>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.subLabel}>Дата *</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => openDatePicker(false)}
                  >
                    <Text style={[styles.dateInputText, !nextServiceDate && styles.placeholderText]}>
                      {nextServiceDate || t('addReminder.selectDate')}
                    </Text>
                    <Icon name="calendar" size={16} color={COLORS.accent} />
                  </TouchableOpacity>
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.subLabel}>{t('addReminder.mileage')}</Text>
                  <TextInput
                    style={styles.input}
                    value={nextServiceMileage}
                    onChangeText={setNextServiceMileage}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Quick Fill Buttons */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addReminder.quickFill')}</Text>
              <View style={styles.quickFillRow}>
                <TouchableOpacity
                  style={styles.quickFillButton}
                  onPress={() => {
                    setLastServiceDate(getTodayDate());
                    setNextServiceDate(getNextMonthDate());
                  }}
                >
                  <Icon name="calendar" size={16} color={COLORS.accent} />
                  <Text style={styles.quickFillText}>{t('addReminder.today')}</Text>
                </TouchableOpacity>
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

          {/* Date Pickers */}
          {(showLastDatePicker || showNextDatePicker) && Platform.OS === 'android' && (
            <DateTimePicker
              value={isLastDatePicker ? lastDate : nextDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          {/* iOS Modal Date Picker */}
          <Modal
            visible={Platform.OS === 'ios' && (showLastDatePicker || showNextDatePicker)}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {isLastDatePicker ? t('addReminder.selectLastServiceDate') : t('addReminder.selectNextServiceDate')}
                  </Text>
                </View>
                
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  style={styles.datePicker}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={cancelDatePicker}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={confirmDate}
                  >
                    <Text style={styles.confirmButtonText}>{t('addReminder.select')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={styles.buttons}>
            <Button
              title={t('common.cancel')}
              onPress={onClose}
              variant="secondary"
              style={styles.cancelButton}
            />
            <Button
              title={t('common.save')}
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            />
          </View>
        </Card>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  contentCard: {
    margin: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  form: {
    gap: SPACING.lg,
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
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
    minWidth: 100,
    maxWidth: 120,
    height: 100,
    justifyContent: 'center',
  },
  typeButtonSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  typeButtonText: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
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
  dateInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '50%',
  },
  modalHeader: {
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  datePicker: {
    height: 200,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.accent,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default AddReminderScreen;
