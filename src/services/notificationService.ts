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
  private navigationRef: any = null;

  async getPermissions() {
    return await Notifications.getPermissionsAsync();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return false;
      }

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
        // Для прошедших дат сразу деактивируем напоминание
        await this.markReminderAsInactive(reminder.id);
        
        // На iOS нельзя планировать уведомления в прошлом, поэтому показываем немедленно
        if (Platform.OS === 'ios') {
          // Показываем уведомление немедленно без планирования
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'MyGarage Reminder',
              body: `${reminder.title} - ${reminder.description}`,
              data: {
                reminderId: reminder.id,
                type: 'reminder',
              },
            },
            trigger: null, // Немедленное уведомление
            identifier: notificationId,
          });
          return; // Не планируем повторное уведомление
        } else {
          // На Android планируем через 1 секунду
          triggerDate = new Date(now.getTime() + 1000);
        }
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
      console.error(`Error scheduling notification for reminder ${reminder.id}:`, error);
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

      // Дедупликация по ID
      const uniqueReminders = reminders.reduce((acc, reminder) => {
        if (!acc.find(r => r.id === reminder.id)) {
          acc.push(reminder);
        }
        return acc;
      }, [] as Reminder[]);
      
      // Schedule notifications for all reminders (including past ones for immediate display)
      for (const reminder of uniqueReminders) {
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

  // Set navigation reference
  setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  // Navigate to reminders screen
  navigateToReminders() {
    if (this.navigationRef) {
      try {
        // Try to navigate to the reminders screen
        this.navigationRef.navigate('Reminders');
      } catch (error) {
        console.warn('Failed to navigate to reminders screen:', error);
        // Fallback: try to navigate to main tab and then reminders
        try {
          this.navigationRef.navigate('MainTabs', { screen: 'Reminders' });
        } catch (fallbackError) {
          console.warn('Fallback navigation also failed:', fallbackError);
        }
      }
    } else {
      console.warn('Navigation ref not set in NotificationService');
    }
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

  /**
   * Планирует периодические уведомления о добавлении трат
   * 3 раза в неделю (Понедельник, Среда, Пятница) в 19:00
   */
  async scheduleExpenseReminders() {
    try {
      await this.initialize();

      // Отменяем старые уведомления о тратах
      await this.cancelExpenseReminders();

      const now = new Date();
      const notifications: Array<{ date: Date; dayOfWeek: string }> = [];

      // Определяем дни недели для уведомлений: Понедельник (1), Среда (3), Пятница (5)
      const reminderDays = [1, 3, 5]; // Monday, Wednesday, Friday
      const notificationTime = 19; // 19:00 (7 PM)

      // Генерируем уведомления на ближайшие 8 недель (24 уведомления - 3 раза в неделю * 8 недель)
      for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
        for (const targetDayOfWeek of reminderDays) {
          const date = new Date(now);
          
          // JavaScript getDay(): 0=воскресенье, 1=понедельник, ..., 6=суббота
          // Наш формат: 1=понедельник, 3=среда, 5=пятница
          const currentDayOfWeek = now.getDay();
          
          // Преобразуем наш формат (1,3,5) в JS формат (1,3,5)
          const targetJsDay = targetDayOfWeek; // Уже в JS формате
          
          // Вычисляем дни до целевого дня недели
          let daysUntilTarget = targetJsDay - currentDayOfWeek;
          
          // Если день уже прошел на этой неделе, берем следующий неделю
          if (daysUntilTarget <= 0) {
            daysUntilTarget += 7;
          }
          
          // Добавляем недели
          daysUntilTarget += (weekOffset * 7);

          date.setDate(now.getDate() + daysUntilTarget);
          date.setHours(notificationTime, 0, 0, 0); // 19:00

          const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
          const dayOfWeekName = dayNames[targetJsDay];

          notifications.push({ date, dayOfWeek: dayOfWeekName });
        }
      }

      // Планируем уведомления
      for (let i = 0; i < notifications.length; i++) {
        const { date } = notifications[i];
        
        // Пропускаем уведомления в прошлом
        if (date.getTime() <= now.getTime()) {
          continue;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'MyGarage',
            body: 'Не забудьте добавить записи о тратах на автомобиль',
            data: {
              type: 'expense_reminder',
              weekNumber: Math.floor(i / 3), // Номер недели для отслеживания
            },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date,
          },
          identifier: `expense_reminder_${date.getTime()}`,
        });
      }

      console.log(`✅ Планировано ${notifications.length} уведомлений о тратах на ближайшие 8 недель`);
      
      // Запланировать обновление уведомлений через 7 дней (чтобы всегда были актуальные)
      setTimeout(() => {
        this.scheduleExpenseReminders();
      }, 7 * 24 * 60 * 60 * 1000); // Через 7 дней
      
    } catch (error) {
      console.error('Error scheduling expense reminders:', error);
    }
  }

  /**
   * Отменяет все уведомления о тратах
   */
  async cancelExpenseReminders() {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const expenseReminders = allNotifications.filter(
        notification => notification.identifier.startsWith('expense_reminder_')
      );

      for (const notification of expenseReminders) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      console.log(`Отменено ${expenseReminders.length} уведомлений о тратах`);
    } catch (error) {
      console.error('Error cancelling expense reminders:', error);
    }
  }

  /**
   * Инициализирует уведомления о тратах после успешного входа
   */
  async initializeExpenseReminders(userId: number) {
    try {
      // Планируем уведомления только для авторизованных пользователей
      await this.scheduleExpenseReminders();
    } catch (error) {
      console.error('Error initializing expense reminders:', error);
    }
  }

  /**
   * Отменяет все уведомления о тратах при выходе
   */
  async cancelExpenseRemindersOnLogout() {
    try {
      await this.cancelExpenseReminders();
    } catch (error) {
      console.error('Error cancelling expense reminders on logout:', error);
    }
  }
}

export default new NotificationService();
