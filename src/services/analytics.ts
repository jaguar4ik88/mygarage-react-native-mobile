import { getAnalytics, logEvent as firebaseLogEvent } from '@react-native-firebase/analytics';
import { getApps } from '@react-native-firebase/app';

class AnalyticsService {
  private isAvailable(): boolean {
    try {
      const apps = getApps();
      return apps.length > 0;
    } catch (error) {
      return false;
    }
  }

  async track(eventName: string | any, params?: Record<string, any>): Promise<void> {
    try {
      if (!this.isAvailable()) {
        console.log('[Analytics] Firebase not available, skipping:', eventName);
        return;
      }

      const analytics = getAnalytics();
      await firebaseLogEvent(analytics, eventName, params);
      console.log('[Analytics] Event tracked:', eventName, params);
    } catch (error) {
      console.error('[Analytics] Failed to track event:', eventName, error);
    }
  }

  async logScreenView(screenName: string): Promise<void> {
    await this.track('screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    });
  }

  async setUserId(userId: string): Promise<void> {
    try {
      if (!this.isAvailable()) {
        return;
      }

      const analytics = getAnalytics();
      await analytics.setUserId(userId);
      console.log('[Analytics] User ID set:', userId);
    } catch (error) {
      console.error('[Analytics] Failed to set user ID:', error);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    try {
      if (!this.isAvailable()) {
        return;
      }

      const analytics = getAnalytics();
      await analytics.setUserProperty(name, value);
      console.log('[Analytics] User property set:', name, value);
    } catch (error) {
      console.error('[Analytics] Failed to set user property:', error);
    }
  }
}

export default new AnalyticsService();

