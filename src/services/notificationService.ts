import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Reminder } from '../types';

const { SchedulableTriggerInputTypes } = Notifications;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private isInitialized = false;
  private onReminderStatusUpdate: ((reminderId: number, isActive: boolean) => void) | null = null;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Service Reminders',
          description: 'Vehicle maintenance notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
        });
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async scheduleReminderNotification(reminder: Reminder) {
    try {
      await this.initialize();

      // Не планируем уведомления для неактивных напоминаний
      if (!reminder.is_active) {
        return;
      }

      const notificationId = `reminder_${reminder.id}`;
      const rawDate = String(reminder.next_service_date || '');
      let triggerDate: Date;
      // If user provided only date (YYYY-MM-DD), default time to 09:00 local
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const [year, month, day] = rawDate.split('-').map((v) => parseInt(v, 10));
        triggerDate = new Date(year, month - 1, day, 9, 0, 0, 0);
      } else {
        triggerDate = new Date(rawDate);
      }

      // Safeguard: if computed time is in the past, fire shortly to avoid missing it
      const now = new Date();
      if (isNaN(triggerDate.getTime()) || triggerDate.getTime() <= now.getTime()) {
        // Если дата в прошлом или сегодня, показываем уведомление через 1 секунду
        triggerDate = new Date(now.getTime() + 1000);
      }

      // Cancel existing notification for this reminder
      await Notifications.cancelScheduledNotificationAsync(notificationId);

      // Schedule new notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'MyGarage Reminder',
          body: `${reminder.title} - ${reminder.description}`,
          data: {
            reminderId: reminder.id,
            type: 'reminder',
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
        identifier: notificationId,
      });

    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  async cancelReminderNotification(reminderId: number) {
    try {
      const notificationId = `reminder_${reminderId}`;
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async scheduleAllReminders(reminders: Reminder[]) {
    try {
      await this.initialize();

      // Cancel all existing reminder notifications
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const reminderNotifications = allNotifications.filter(
        notification => notification.identifier.startsWith('reminder_')
      );

      for (const notification of reminderNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      // Schedule notifications only for active reminders
      const toSchedule = reminders.filter(reminder => reminder.is_active);

      for (const reminder of toSchedule) {
        await this.scheduleReminderNotification(reminder);
      }

    } catch (error) {
      console.error('Error scheduling all reminders:', error);
    }
  }

  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Test notification
  async sendTestNotification() {
    try {
      await this.initialize();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'myGarage is working correctly!',
          data: { type: 'test' },
        },
        trigger: { 
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1 
        },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  // Handle notification response
  addNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Handle notification received while app is in foreground
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  // Set callback for reminder status updates
  setReminderStatusUpdateCallback(callback: (reminderId: number, isActive: boolean) => void) {
    this.onReminderStatusUpdate = callback;
  }

  // Mark reminder as inactive after notification is sent
  async markReminderAsInactive(reminderId: number) {
    try {
      // Импортируем ApiService динамически, чтобы избежать циклических зависимостей
      const { default: ApiService } = await import('./api');
      
      // Отправляем запрос на обновление статуса напоминания
      await ApiService.updateReminder(reminderId, { is_active: false });
      
      // Уведомляем UI об изменении статуса
      if (this.onReminderStatusUpdate) {
        this.onReminderStatusUpdate(reminderId, false);
      }
    } catch (error) {
      console.error('Error marking reminder as inactive:', error);
    }
  }
}

export default new NotificationService();
