import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vehicle, Reminder, ServiceHistory, User } from '../types';

class OfflineService {
  private readonly KEYS = {
    VEHICLES: 'offline_vehicles',
    REMINDERS: 'offline_reminders',
    HISTORY: 'offline_history',
    USER: 'offline_user',
    LAST_SYNC: 'last_sync',
    PENDING_CHANGES: 'pending_changes',
  };

  // Vehicle operations
  async saveVehicles(vehicles: Vehicle[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.VEHICLES, JSON.stringify(vehicles));
    } catch (error) {
      console.error('Error saving vehicles offline:', error);
    }
  }

  async getVehicles(): Promise<Vehicle[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.VEHICLES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting vehicles offline:', error);
      return [];
    }
  }

  async saveVehicle(vehicle: Vehicle): Promise<void> {
    try {
      const vehicles = await this.getVehicles();
      const existingIndex = vehicles.findIndex(v => v.id === vehicle.id);
      
      if (existingIndex >= 0) {
        vehicles[existingIndex] = vehicle;
      } else {
        vehicles.push(vehicle);
      }
      
      await this.saveVehicles(vehicles);
    } catch (error) {
      console.error('Error saving vehicle offline:', error);
    }
  }

  async deleteVehicle(vehicleId: number): Promise<void> {
    try {
      const vehicles = await this.getVehicles();
      const filteredVehicles = vehicles.filter(v => v.id !== vehicleId);
      await this.saveVehicles(filteredVehicles);
    } catch (error) {
      console.error('Error deleting vehicle offline:', error);
    }
  }

  // Reminder operations
  async saveReminders(reminders: Reminder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.REMINDERS, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminders offline:', error);
    }
  }

  async getReminders(): Promise<Reminder[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.REMINDERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting reminders offline:', error);
      return [];
    }
  }

  async getRemindersByVehicle(vehicleId: number): Promise<Reminder[]> {
    try {
      const reminders = await this.getReminders();
      return reminders.filter(r => r.vehicle_id === vehicleId);
    } catch (error) {
      console.error('Error getting reminders by vehicle offline:', error);
      return [];
    }
  }

  async saveReminder(reminder: Reminder): Promise<void> {
    try {
      const reminders = await this.getReminders();
      const existingIndex = reminders.findIndex(r => r.id === reminder.id);
      
      if (existingIndex >= 0) {
        reminders[existingIndex] = reminder;
      } else {
        reminders.push(reminder);
      }
      
      await this.saveReminders(reminders);
    } catch (error) {
      console.error('Error saving reminder offline:', error);
    }
  }

  async deleteReminder(reminderId: number): Promise<void> {
    try {
      const reminders = await this.getReminders();
      const filteredReminders = reminders.filter(r => r.id !== reminderId);
      await this.saveReminders(filteredReminders);
    } catch (error) {
      console.error('Error deleting reminder offline:', error);
    }
  }

  // Service history operations
  async saveServiceHistory(history: ServiceHistory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving service history offline:', error);
    }
  }

  async getServiceHistory(): Promise<ServiceHistory[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting service history offline:', error);
      return [];
    }
  }

  async saveServiceRecord(record: ServiceHistory): Promise<void> {
    try {
      const history = await this.getServiceHistory();
      const existingIndex = history.findIndex(h => h.id === record.id);
      
      if (existingIndex >= 0) {
        history[existingIndex] = record;
      } else {
        history.push(record);
      }
      
      await this.saveServiceHistory(history);
    } catch (error) {
      console.error('Error saving service record offline:', error);
    }
  }

  async deleteServiceRecord(recordId: number): Promise<void> {
    try {
      const history = await this.getServiceHistory();
      const filteredHistory = history.filter(h => h.id !== recordId);
      await this.saveServiceHistory(filteredHistory);
    } catch (error) {
      console.error('Error deleting service record offline:', error);
    }
  }

  // User operations
  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user offline:', error);
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user offline:', error);
      return null;
    }
  }

  // Sync operations
  async setLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.LAST_SYNC);
      return data ? new Date(data) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // Pending changes operations
  async addPendingChange(change: {
    type: 'create' | 'update' | 'delete';
    entity: 'vehicle' | 'reminder' | 'history';
    data: any;
    id?: number;
  }): Promise<void> {
    try {
      const pendingChanges = await this.getPendingChanges();
      pendingChanges.push({
        ...change,
        timestamp: new Date().toISOString(),
        id: change.id || Date.now(),
      });
      await AsyncStorage.setItem(this.KEYS.PENDING_CHANGES, JSON.stringify(pendingChanges));
    } catch (error) {
      console.error('Error adding pending change:', error);
    }
  }

  async getPendingChanges(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.PENDING_CHANGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending changes:', error);
      return [];
    }
  }

  async clearPendingChanges(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.PENDING_CHANGES);
    } catch (error) {
      console.error('Error clearing pending changes:', error);
    }
  }

  // Clear all offline data
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.KEYS.VEHICLES),
        AsyncStorage.removeItem(this.KEYS.REMINDERS),
        AsyncStorage.removeItem(this.KEYS.HISTORY),
        AsyncStorage.removeItem(this.KEYS.USER),
        AsyncStorage.removeItem(this.KEYS.LAST_SYNC),
        AsyncStorage.removeItem(this.KEYS.PENDING_CHANGES),
      ]);
    } catch (error) {
      console.error('Error clearing all offline data:', error);
    }
  }

  // Check if data is available offline
  async hasOfflineData(): Promise<boolean> {
    try {
      const [vehicles, reminders, history] = await Promise.all([
        this.getVehicles(),
        this.getReminders(),
        this.getServiceHistory(),
      ]);
      
      return vehicles.length > 0 || reminders.length > 0 || history.length > 0;
    } catch (error) {
      console.error('Error checking offline data:', error);
      return false;
    }
  }

  // Get offline data summary
  async getOfflineDataSummary(): Promise<{
    vehicles: number;
    reminders: number;
    history: number;
    lastSync: Date | null;
  }> {
    try {
      const [vehicles, reminders, history, lastSync] = await Promise.all([
        this.getVehicles(),
        this.getReminders(),
        this.getServiceHistory(),
        this.getLastSyncTime(),
      ]);
      
      return {
        vehicles: vehicles.length,
        reminders: reminders.length,
        history: history.length,
        lastSync,
      };
    } catch (error) {
      console.error('Error getting offline data summary:', error);
      return {
        vehicles: 0,
        reminders: 0,
        history: 0,
        lastSync: null,
      };
    }
  }
}

export default new OfflineService();
