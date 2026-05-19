import { getAnalytics, setAnalyticsCollectionEnabled, setUserId, setUserProperties, logEvent } from '@react-native-firebase/analytics';

export type AnalyticsEventName =
  | 'auth_login_success'
  | 'auth_login_failure'
  | 'auth_register_success'
  | 'auth_register_failure'
  | 'auth_biometric_success'
  | 'google_signin_attempted'
  | 'google_signin_started'
  | 'google_signin_success'
  | 'google_signin_failed'
  | 'apple_signin_attempted'
  | 'apple_signin_started'
  | 'apple_signin_success'
  | 'apple_signin_failed'
  | 'history_add'
  | 'history_edit'
  | 'history_delete'
  | 'reminder_add'
  | 'reminder_delete'
  | 'sto_search_nearby'
  | 'sto_add_favorite'
  | 'sto_route_opened'
  | 'manual_section_toggle'
  | 'manual_pdf_open'
  | 'pdf_export';

export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

function sanitizeParams(params?: AnalyticsEventParams): Record<string, any> | undefined {
  if (!params) return undefined;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (typeof v === 'object' && v !== null) continue; // avoid nested objects
    out[k] = v;
  }
  return out;
}

export const Analytics = {
  async enableCollection(enabled: boolean): Promise<void> {
    try {
      const analytics = getAnalytics();
      await setAnalyticsCollectionEnabled(analytics, !!enabled);
    } catch {
      // ignore
    }
  },

  async setUserId(userId?: string | number | null): Promise<void> {
    try {
      const analytics = getAnalytics();
      await setUserId(analytics, userId ? String(userId) : null);
    } catch {
      // ignore
    }
  },

  async setUserProperties(props: AnalyticsEventParams): Promise<void> {
    try {
      const analytics = getAnalytics();
      const sanitized = sanitizeParams(props);
      if (!sanitized) return;
      await setUserProperties(analytics, sanitized);
    } catch {
      // ignore
    }
  },

  async track(event: AnalyticsEventName, params?: AnalyticsEventParams): Promise<void> {
    try {
      const analytics = getAnalytics();
      await logEvent(analytics, event, sanitizeParams(params));
    } catch {
      // ignore
    }
  },
};

export default Analytics;


