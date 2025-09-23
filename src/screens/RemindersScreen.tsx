import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import AnimatedView from '../components/AnimatedView';
import ReminderModal from '../components/ReminderModal';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { Reminder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import Analytics from '../services/analyticsService';

interface RemindersScreenProps {}

const RemindersScreen: React.FC<RemindersScreenProps> = () => {
  const { t, language } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get current user first
      const user = await ApiService.getProfile();
      setUserId(user.id);
      
      // Load reminders
      const data = await ApiService.getReminders(user.id);
      setReminders(data);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('reminders.error'), t('reminders.failedToLoadReminders'));
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await ApiService.getReminders(userId);
      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert(t('reminders.error'), t('reminders.failedToLoadReminders'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDeleteReminder = async (reminderId: number) => {
    Alert.alert(
      t('reminders.deleteReminder'),
      t('reminders.deleteConfirm'),
      [
        { text: t('reminders.cancel'), style: 'cancel' },
        {
          text: t('reminders.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteReminder(reminderId);
              await Analytics.track('reminder_delete', { reminder_id: reminderId });
              await loadData();
            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert(t('reminders.error'), t('reminders.failedToDeleteReminder'));
            }
          },
        },
      ]
    );
  };

  const handleAddReminder = () => {
    setEditingReminder(null);
    setIsModalOpen(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const handleReminderAdded = () => {
    Analytics.track('reminder_add');
    loadData();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'uk' ? 'uk-UA' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const deriveStatus = (reminder: Reminder): 'completed' | 'pending' => {
    if (!reminder.is_active) return 'completed';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return COLORS.success; // Зеленый для отработанных
      case 'pending':
        return COLORS.error; // Красный для ожидающих
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('reminders.completed');
      case 'pending':
        return t('reminders.pending');
      default:
        return status;
    }
  };

  const getReminderCardStyle = (reminder: Reminder) => {
    const status = deriveStatus(reminder);
    if (status === 'pending') {
      return styles.pendingReminderCard;
    } else if (status === 'completed') {
      return styles.completedReminderCard;
    }
    return styles.reminderCard;
  };


  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  return (
     <SafeAreaView style={styles.container} edges={['left','right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >

        <AnimatedView animation="fadeIn" delay={0}>
          <View style={styles.addButtonContainer}>
            <Button
              title={t('reminders.addReminder')}
              onPress={handleAddReminder}
              variant="outline"
              style={styles.addReminderButton}
            />
          </View>

            {reminders.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="notification" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>{t('reminders.noReminders')}</Text>
                <Text style={styles.emptyText}>
                  {t('reminders.noRemindersText')}
                </Text>
              </View>
            ) : (
              <View style={styles.remindersList}>
                {reminders.map((reminder, index) => (
                  <AnimatedView
                    key={reminder.id}
                    animation="slideInRight"
                    delay={index * 100}
                  >
                    <Card style={getReminderCardStyle(reminder)}>
                      <View style={styles.reminderHeader}>
                        <View style={styles.reminderInfo}>
                          <View style={styles.reminderTitleRow}>
                            <Text style={[
                              styles.reminderTitle,
                              deriveStatus(reminder) === 'completed' && styles.completedTitle
                            ]}>
                              {t(`reminders.types.${reminder.type}`) || reminder.title}
                            </Text>
                          </View>
                          <Text style={[
                            styles.reminderDescription,
                            deriveStatus(reminder) === 'completed' && styles.completedDescription
                          ]}>
                            {reminder.description}
                          </Text>
                        </View>
                        <View style={styles.reminderActions}>
                          <TouchableOpacity
                            onPress={() => handleEditReminder(reminder)}
                            style={styles.actionButton}
                          >
                            <Icon name="edit" size={16} color={COLORS.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteReminder(reminder.id)}
                            style={styles.actionButton}
                          >
                            <Icon name="delete" size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.reminderDetails}>
                        <View style={styles.reminderDetail}>
                          <Icon name="calendar" size={14} color={COLORS.textMuted} />
                          <Text style={styles.reminderDetailText}>
                            {formatDate(reminder.next_service_date)}
                          </Text>
                        </View>
                        
                        
                        <View style={styles.reminderDetail}>
                          <View
                            style={[
                              styles.statusIndicator,
                              { backgroundColor: getStatusColor(deriveStatus(reminder)) },
                            ]}
                          />
                          <Text style={styles.reminderDetailText}>
                            {getStatusText(deriveStatus(reminder))}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </AnimatedView>
                ))}
              </View>
            )}
        </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>

      <ReminderModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReminderAdded={handleReminderAdded}
        editingReminder={editingReminder}
        userId={userId}
      />
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  remindersList: {
    margin: SPACING.lg,
    gap: SPACING.md,
  },
  reminderCard: {
    padding: SPACING.lg,
  },
  pendingReminderCard: {
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    backgroundColor: COLORS.surface,
  },
  completedReminderCard: {
    padding: SPACING.lg,
    opacity: 0.7,
    backgroundColor: COLORS.surface,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  urgentBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
  },
  urgentText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  completedDescription: {
    color: COLORS.textMuted,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  reminderInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  reminderDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
  },
  reminderDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  reminderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  reminderDetailText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addButtonContainer: {
    margin: SPACING.lg,
  },
  addReminderButton: {
    width: '100%',
  },
});

export default RemindersScreen;