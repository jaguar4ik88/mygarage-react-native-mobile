import { getApps } from '@react-native-firebase/app';
import { 
  getCrashlytics, 
  setCrashlyticsCollectionEnabled,
  setUserId as setUserIdCrashlytics,
  setAttribute as setAttributeCrashlytics,
  log as logCrashlytics,
  recordError as recordErrorCrashlytics,
  crash as crashApp
} from '@react-native-firebase/crashlytics';

/**
 * Crashlytics Service for error logging and tracking
 * Updated to use Firebase v22+ modular API
 */
class CrashlyticsService {
  private isInitialized: boolean = false;

  /**
   * Check if Firebase is available
   */
  private isFirebaseAvailable(): boolean {
    try {
      const apps = getApps();
      return apps.length > 0;
    } catch (error) {
      console.warn('Firebase check failed:', error);
      return false;
    }
  }

  /**
   * Get Crashlytics instance
   */
  private getCrashlyticsInstance() {
    return getCrashlytics();
  }

  /**
   * Initialize Crashlytics and set up global error handlers
   */
  async initialize(): Promise<void> {
    try {
      if (!this.isFirebaseAvailable()) {
        console.warn('⚠️ Firebase not available. Crashlytics disabled.');
        return;
      }

      // Enable Crashlytics collection
      const crashlyticsInstance = this.getCrashlyticsInstance();
      await setCrashlyticsCollectionEnabled(crashlyticsInstance, true);
      
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      this.isInitialized = true;
      console.log('✅ Crashlytics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Crashlytics:', error);
    }
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      // Log to Crashlytics only if initialized
      if (this.isInitialized) {
        this.recordError(error, isFatal ? 'fatal' : 'non-fatal');
      }
      
      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Handle unhandled promise rejections
    if (typeof global !== 'undefined') {
      const originalRejectionHandler = global.onunhandledrejection;
      const self = this;
      global.onunhandledrejection = function(event: any) {
        const error = event?.reason || new Error('Unhandled Promise Rejection');
        if (self.isInitialized) {
          self.recordError(error, 'promise-rejection');
        }
        
        if (originalRejectionHandler) {
          originalRejectionHandler.call(this, event);
        }
      };
    }
  }

  /**
   * Set user ID for tracking errors per user
   */
  async setUserId(userId: string | number): Promise<void> {
    try {
      const crashlyticsInstance = this.getCrashlyticsInstance();
      await setUserIdCrashlytics(crashlyticsInstance, String(userId));
    } catch (error) {
      console.error('Failed to set Crashlytics user ID:', error);
    }
  }

  /**
   * Set custom attributes for error context
   */
  async setAttribute(key: string, value: string): Promise<void> {
    try {
      const crashlyticsInstance = this.getCrashlyticsInstance();
      await setAttributeCrashlytics(crashlyticsInstance, key, value);
    } catch (error) {
      console.error('Failed to set Crashlytics attribute:', error);
    }
  }

  /**
   * Set multiple custom attributes at once
   */
  async setAttributes(attributes: Record<string, string>): Promise<void> {
    try {
      const crashlyticsInstance = this.getCrashlyticsInstance();
      // Set attributes one by one (modular API doesn't have batch setAttributes)
      for (const [key, value] of Object.entries(attributes)) {
        await setAttributeCrashlytics(crashlyticsInstance, key, value);
      }
    } catch (error) {
      console.error('Failed to set Crashlytics attributes:', error);
    }
  }

  /**
   * Log a non-fatal error to Crashlytics
   */
  recordError(error: Error | string, context?: string): void {
    try {
      if (!this.isFirebaseAvailable()) {
        console.error('Crashlytics not available:', error);
        return;
      }

      const crashlyticsInstance = this.getCrashlyticsInstance();
      const errorObject = typeof error === 'string' ? new Error(error) : error;
      
      if (context) {
        // Add context as part of the error
        logCrashlytics(crashlyticsInstance, `Context: ${context}`);
      }
      
      // Record the error
      recordErrorCrashlytics(crashlyticsInstance, errorObject);
      
      console.error('Error logged to Crashlytics:', errorObject.message);
    } catch (err) {
      console.error('Failed to record error to Crashlytics:', err);
    }
  }

  /**
   * Log a custom message to Crashlytics
   */
  log(message: string): void {
    try {
      const crashlyticsInstance = this.getCrashlyticsInstance();
      logCrashlytics(crashlyticsInstance, message);
    } catch (error) {
      console.error('Failed to log message to Crashlytics:', error);
    }
  }

  /**
   * Force a crash (for testing purposes only)
   * Use only in development!
   */
  crash(): void {
    if (__DEV__) {
      console.warn('⚠️ Force crashing the app for testing...');
      const crashlyticsInstance = this.getCrashlyticsInstance();
      crashApp(crashlyticsInstance);
    } else {
      console.error('Cannot force crash in production mode');
    }
  }

  /**
   * Check if Crashlytics is enabled
   */
  isCrashlyticsCollectionEnabled(): boolean {
    try {
      if (!this.isFirebaseAvailable()) {
        return false;
      }
      return this.isInitialized;
    } catch (error) {
      console.error('Failed to check Crashlytics status:', error);
      return false;
    }
  }

  /**
   * Log API error with details
   */
  async logApiError(endpoint: string, statusCode: number, error: Error | string): Promise<void> {
    try {
      await this.setAttribute('api_endpoint', endpoint);
      await this.setAttribute('status_code', String(statusCode));
      this.recordError(error, `API Error: ${endpoint}`);
    } catch (err) {
      console.error('Failed to log API error:', err);
    }
  }

  /**
   * Log screen view error
   */
  async logScreenError(screenName: string, error: Error | string): Promise<void> {
    try {
      const crashlyticsInstance = this.getCrashlyticsInstance();
      
      // Set screen attribute
      await setAttributeCrashlytics(crashlyticsInstance, 'screen_name', screenName);
      await setAttributeCrashlytics(crashlyticsInstance, 'error_type', 'screen_error');
      
      // Log context
      logCrashlytics(crashlyticsInstance, `Screen Error on: ${screenName}`);
      
      // Create error object
      const errorObject = typeof error === 'string' ? new Error(error) : error;
      
      // Record the error with unique message
      const errorWithContext = new Error(`[${screenName}] ${errorObject.message}`);
      errorWithContext.stack = errorObject.stack;
      
      recordErrorCrashlytics(crashlyticsInstance, errorWithContext);
      
      console.error('Screen error logged to Crashlytics:', screenName, errorObject.message);
    } catch (err) {
      console.error('Failed to log screen error:', err);
    }
  }

  /**
   * Log authentication error
   */
  async logAuthError(errorType: string, error: Error | string): Promise<void> {
    try {
      await this.setAttribute('auth_error_type', errorType);
      this.recordError(error, `Auth Error: ${errorType}`);
    } catch (err) {
      console.error('Failed to log auth error:', err);
    }
  }
}

export default new CrashlyticsService();

