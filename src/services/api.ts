import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL, API_KEY } from '../constants';
import eventBus, { EVENTS } from './eventBus';
import { AuthResponse, User, Vehicle, Reminder, ServiceStation, ServiceHistory, ApiResponse, PaginatedApiResponse } from '../types';
import OfflineService from './offlineService';
import CrashlyticsService from './crashlyticsService';

class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private static readonly DICT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  
  // Список эндпоинтов, которые требуют авторизацию
  private readonly PROTECTED_ENDPOINTS = [
    '/user',
    '/vehicles',
    '/reminders',
    '/service-history',
    '/history',
    '/service-stations',
    '/user-stations',
    '/user-manuals',
    '/manuals',
    '/statistics',
    '/car-recommendations',
    '/expenses',
    '/profile',
  ];

  constructor() {
    this.baseURL = API_BASE_URL;
    this.loadToken();
    
    // Test API connection on Android
    if (Platform.OS === 'android') {
      console.log('🤖 Android detected - testing API connection...');
      this.testConnection();
    }
  }

  private async testConnection() {
    try {
      console.log('🧪 Testing API connection to:', this.baseURL);
      const response = await fetch(`${this.baseURL}/expense-types`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY || '',
        },
      });
      console.log('🧪 Test response status:', response.status);
      console.log('🧪 Test response OK:', response.ok);
      if (response.ok) {
        console.log('✅ API connection successful!');
      } else {
        console.log('❌ API connection failed!');
      }
    } catch (error) {
      console.error('🧪 Test connection failed:', error);
    }
  }

  private async loadToken(): Promise<void> {
    try {
      this.token = await AsyncStorage.getItem('auth_token');
      console.log('🔑 Loaded token from storage:', this.token ? 'exists' : 'null');
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  private async isGuestMode(): Promise<boolean> {
    try {
      const guestMode = await AsyncStorage.getItem('guest_mode');
      const authToken = await AsyncStorage.getItem('auth_token');
      console.log(`🔐 Auth check: guest_mode="${guestMode}", has_token=${!!authToken}`);
      return guestMode === 'true';
    } catch (error) {
      console.error('Error checking guest mode:', error);
      return false;
    }
  }

  private isProtectedEndpoint(endpoint: string): boolean {
    // Убираем query параметры для проверки
    const cleanEndpoint = endpoint.split('?')[0];
    
    const isProtected = this.PROTECTED_ENDPOINTS.some(protected_ep => {
      // Проверяем что endpoint начинается с защищенного пути или точно совпадает
      return cleanEndpoint === protected_ep || 
             cleanEndpoint.startsWith(protected_ep + '/');
    });
    
    console.log(`🛡️ Endpoint check: "${cleanEndpoint}" -> ${isProtected ? 'PROTECTED' : 'PUBLIC'}`);
    return isProtected;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('🔐 Sending auth token for request');
    } else {
      console.log('🔓 No auth token for request');
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Проверка на гостевой режим для защищенных эндпоинтов
    const isGuest = await this.isGuestMode();
    const isProtected = this.isProtectedEndpoint(endpoint);
    
    console.log(`🔍 API Check: endpoint="${endpoint}", isGuest=${isGuest}, isProtected=${isProtected}`);
    
    if (isGuest && isProtected) {
      console.log(`👤 Guest mode: Skipping API request to protected endpoint: ${endpoint}`);
      // Возвращаем пустой успешный ответ для гостей
      return {
        data: (Array.isArray([]) ? [] : {}) as T,
        success: true,
        message: 'Guest mode - no data available',
      };
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();
    // Ensure auth endpoints never send stale Authorization header
    if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
      if ('Authorization' in headers) {
        delete (headers as any)['Authorization'];
      }
    }
    const REQUEST_TIMEOUT_MS = 15000; // Increased timeout to 15 seconds

    // Log all API requests with detailed info
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    try {
      const headersToLog: Record<string, any> = { ...headers } as any;
      if (headersToLog['X-API-Key']) {
        const val = String(headersToLog['X-API-Key']);
        headersToLog['X-API-Key'] = `${val.slice(0, 4)}…(${val.length})`;
      }
      console.log('📋 Request headers (masked):', headersToLog);
    } catch {
      console.log('📋 Request headers: <unavailable>');
    }
    console.log('🔧 Base URL:', this.baseURL);
    console.log('📱 Platform:', Platform.OS);

    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

      // Extra diagnostics for auth endpoints (mask sensitive fields)
      try {
        if (endpoint.includes('/auth/login')) {
          const b = (options?.body ? JSON.parse(String(options.body)) : {}) as any;
          const maskedBody = {
            email: b?.email ?? '<undefined>',
            password: b.password
          };
          console.log('🧾 Login payload (masked):', maskedBody);
        }
      } catch {}

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors
      if (response.status === 401) {
        console.log('🔐 Authentication failed, clearing token');
        await this.removeToken();
        throw new Error('Authentication failed. Please login again.');
      }

      // Проверяем Content-Type перед парсингом JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', {
          status: response.status,
          contentType,
          url,
          response: text.substring(0, 200) + (text.length > 200 ? '...' : '')
        });
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
      }

      const data = await response.json();

      if (!response.ok) {
        try {
          const text = await response.clone().text();
          console.error('❗ Response body (first 300 chars):', text.slice(0, 300));
        } catch {}
        console.error('Request failed with status:', response.status);
        console.error('Error data:', data);
        
        // Handle validation errors (422) with detailed error messages
        if (response.status === 422 && data.errors) {
          const errorMessages = [];
          for (const [field, messages] of Object.entries(data.errors)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          }
          throw new Error(errorMessages.join('\n'));
        }
        
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      console.error('📱 Platform:', Platform.OS);
      console.error('🔗 URL:', url);
      console.error('📋 Headers:', headers);
      console.error('⏰ Timeout:', REQUEST_TIMEOUT_MS + 'ms');
      
      // Log to Crashlytics
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await CrashlyticsService.logApiError(
          endpoint,
          0, // status code unknown for network errors
          errorMessage
        );
      } catch (crashError) {
        console.error('Failed to log API error to Crashlytics:', crashError);
      }
      
      // Notify UI to show graceful banner
      eventBus.emit(EVENTS.API_ERROR, {
        url,
        method: options.method || 'GET',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Simple cache helpers for reference data (dictionaries)
  private async getCachedDict<T>(key: string): Promise<{ data: T | null; savedAt: number | null }> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { data: null, savedAt: null };
      const parsed = JSON.parse(raw);
      return { data: parsed?.data ?? null, savedAt: parsed?.savedAt ?? null };
    } catch (e) {
      return { data: null, savedAt: null };
    }
  }

  private async setCachedDict<T>(key: string, data: T): Promise<void> {
    try {
      const payload = JSON.stringify({ data, savedAt: Date.now() });
      await AsyncStorage.setItem(key, payload);
    } catch (e) {
      // ignore cache write errors
    }
  }

  // Auth methods
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (response.data.token) {
      await this.setToken(response.data.token);
    }

    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Prevent sending any stale token on login
    await this.removeToken();
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data.token) {
      await this.setToken(response.data.token);
    }

    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    await this.removeToken();
    const response = await this.request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });

    if (response.data.token) {
      await this.setToken(response.data.token);
    }

    return response.data;
  }

  async loginWithApple(identityToken: string, user?: string): Promise<AuthResponse> {
    await this.removeToken();
    const response = await this.request<AuthResponse>('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ identity_token: identityToken, user }),
    });

    if (response.data.token) {
      await this.setToken(response.data.token);
    }

    return response.data;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>('/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response.data;
  }

  async resetPassword(email: string, token: string, password: string, password_confirmation: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>('/password/reset', {
      method: 'POST',
      body: JSON.stringify({ email, token, password, password_confirmation }),
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.removeToken();
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  async removeToken(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  async updateToken(): Promise<void> {
    await this.loadToken();
  }

  // Offline mode methods
  async isOnline(): Promise<boolean> {
    // Поскольку API запросы работают, считаем что мы онлайн
    // TODO: В будущем можно добавить более надежную проверку
    return true;
  }

  async syncOfflineData(): Promise<void> {
    try {
      const isOnline = await this.isOnline();
      if (isOnline) {
        // Sync pending changes
        const pendingChanges = await OfflineService.getPendingChanges();
        for (const change of pendingChanges) {
          try {
            await this.request(change.endpoint, change.options);
            // await OfflineService.removePendingChange(change.id);
          } catch (error) {
            console.error('Error syncing change:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint);
    return response.data;
  }

  // User methods
  async getProfile(): Promise<User> {
    const response = await this.request<User>('/user');
    return response.data;
  }

  async updateProfile(payload: Partial<User>): Promise<User> {
    const response = await this.request<User>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  }

  // Vehicle methods
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Get current user first
        const user = await this.getProfile();
        const response = await this.request<Vehicle[]>(`/vehicles?user_id=${user.id}`);
        await OfflineService.saveVehicles(response.data);
        await OfflineService.setLastSyncTime();
        return response.data;
      } else {
        return await OfflineService.getVehicles();
      }
    } catch (error) {
      console.error('Error getting vehicles, falling back to offline:', error);
      return await OfflineService.getVehicles();
    }
  }

  async getVehicle(id: number): Promise<Vehicle> {
    const response = await this.request<Vehicle>(`/vehicles/${id}`);
    return response.data;
  }

  async addVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
    // Ensure we include current user_id for backend association
    const user = await this.getProfile();
    const response = await this.request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify({ ...vehicle, user_id: user.id }),
    });
    const created = response.data;
    try {
      // Optimistically update offline cache so Home sees the new vehicle immediately
      const existing = await OfflineService.getVehicles();
      const updated = Array.isArray(existing) ? [...existing] : [];
      const idx = updated.findIndex(v => v.id === created.id);
      if (idx >= 0) {
        updated[idx] = created as Vehicle;
      } else {
        updated.unshift(created as Vehicle);
      }
      await OfflineService.saveVehicles(updated);
      await OfflineService.setLastSyncTime();
    } catch (e) {
      console.warn('Failed to update offline vehicles after add:', e);
    }
    return created;
  }

  async updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle> {
    const response = await this.request<Vehicle>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vehicle),
    });
    return response.data;
  }

  async deleteVehicle(id: number): Promise<void> {
    await this.request(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  // Manual methods
  async getUserManuals(locale: string = 'uk'): Promise<any> {
    // MVP: always load default manuals (no per-user manuals)
    try {
      const response = await this.request<any>(`/manuals?prefer_defaults=true&locale=${locale}`);
      return response.data;
    } catch (primaryError) {
      console.warn('Primary manuals request failed, retrying without prefer_defaults flag:', primaryError);
      // Fallback: try base manuals endpoint
      const fallback = await this.request<any>(`/manuals?locale=${locale}`);
      return fallback.data;
    }
  }

  // Advice methods
  async getAdvice(locale: string = 'uk'): Promise<any> {
    const response = await this.request<any>(`/advice?locale=${locale}`);
    return response.data;
  }

  // Car recommendations
  async getCarRecommendationsForCar(maker: string, model: string, year?: number, _mileage?: number, locale: string = 'ru'): Promise<any[]> {
    // Normalize maker casing to improve matches on servers with case-sensitive queries
    const normalizedMaker = maker ? (maker.charAt(0).toUpperCase() + maker.slice(1).toLowerCase()) : maker;
    const params = new URLSearchParams();
    params.set('maker', normalizedMaker);
    params.set('model', model);
    if (year) params.set('year', String(year));
    if (locale) params.set('locale', locale);
    // locale is used client-side to pick translation
    const response = await this.request<any>(`/car-recommendations/for-car?${params.toString()}`);
    return (response as any)?.data || [];
  }

  async getAdviceSections(locale: string = 'uk'): Promise<any[]> {
    const cacheKey = `dict_advice_sections_${locale}`;
    const { data: cached, savedAt } = await this.getCachedDict<any[]>(cacheKey);
    const isFresh = savedAt ? (Date.now() - savedAt) < ApiService.DICT_TTL_MS : false;

    if (cached && isFresh) {
      // Fire-and-forget background refresh
      this.request<any[]>(`/advice-sections?locale=${locale}`).then(r => this.setCachedDict(cacheKey, r.data)).catch(() => {});
      return cached;
    }

    try {
      const response = await this.request<any[]>(`/advice-sections?locale=${locale}`);
      await this.setCachedDict(cacheKey, response.data);
      return response.data;
    } catch (e) {
      if (cached) return cached;
      throw e;
    }
  }

  // Reminder methods
  async getReminders(userId: number): Promise<Reminder[]> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Используем /reminders, который возвращает напоминания текущего пользователя
        const response = await this.request<Reminder[]>(`/reminders`);
        await OfflineService.saveReminders(response.data);
        return response.data;
      } else {
        return await OfflineService.getReminders();
      }
    } catch (error) {
      console.error('Error getting reminders, falling back to offline:', error);
      return await OfflineService.getReminders();
    }
  }

  async createReminder(userId: number, reminder: Partial<Reminder>): Promise<Reminder> {
    try {
      const isOnline = await this.isOnline();
      if (isOnline) {
        // Не передаем user_id в теле запроса, так как бэкенд автоматически добавляет его
        const response = await this.request<Reminder>(`/reminders`, {
          method: 'POST',
          body: JSON.stringify(reminder),
        });
        return response.data;
      } else {
        const offlineReminder: Reminder = {
          id: Date.now(),
          user_id: userId,
          vehicle_id: reminder.vehicle_id || 0,
          type: reminder.type || 'other',
          title: reminder.title || '',
          description: reminder.description || '',
          last_service_date: reminder.last_service_date,
          next_service_date: reminder.next_service_date || new Date().toISOString(),
          is_active: reminder.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await OfflineService.saveReminder(offlineReminder);
        await OfflineService.addPendingChange({
          id: Date.now(),
          type: 'create',
          entity: 'reminder',
          data: { ...reminder, user_id: userId },
        });
        return offlineReminder;
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.status,
        response: (error as any)?.response
      });
      throw error;
    }
  }

  async updateReminder(reminderId: number, reminder: Partial<Reminder>): Promise<Reminder> {
    const response = await this.request<Reminder>(`/reminders/${reminderId}`, {
      method: 'PUT',
      body: JSON.stringify(reminder),
    });
    return response.data;
  }

  async deleteReminder(reminderId: number): Promise<void> {
    await this.request(`/reminders/${reminderId}`, {
      method: 'DELETE',
    });
  }

  // Service station methods
  async getNearbyStations(latitude: number, longitude: number, radius?: number): Promise<ServiceStation[]> {
    const radiusParam = radius ? `&radius=${radius}` : '';
    const response = await this.request<ServiceStation[]>(
      `/stations/nearby?lat=${latitude}&lng=${longitude}${radiusParam}`
    );
    const raw = (response as any)?.data;
    const normalized = Array.isArray(raw)
      ? raw
      : (Array.isArray((response as any)?.data?.data) ? (response as any).data.data : []);
    return normalized as ServiceStation[];
  }

  async getUserStations(userId: number): Promise<ServiceStation[]> {
    const response = await this.request<ServiceStation[]>(`/service-stations/${userId}`);
    return (response as any)?.data || [];
  }

  async addUserStation(userId: number, station: Partial<ServiceStation>): Promise<ServiceStation> {
    const payload = { ...station, user_id: userId };
    const response = await this.request<ServiceStation>(`/service-stations/add`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return (response as any)?.data;
  }

  async deleteUserStation(id: number): Promise<void> {
    await this.request(`/service-stations/delete/${id}`, { method: 'DELETE' });
  }

  async updateUserStation(id: number, station: Partial<ServiceStation>): Promise<ServiceStation> {
    const response = await this.request<ServiceStation>(`/service-stations/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(station),
    });
    return (response as any)?.data;
  }

  // History methods
  async getServiceHistory(vehicleId?: number, page: number = 1, perPage: number = 20): Promise<{data: ServiceHistory[], pagination: { has_more: boolean }}> {
    if (vehicleId) {
      // Use vehicle-specific endpoint
      const response = await this.request<ServiceHistory[]>(`/vehicles/${vehicleId}/history?page=${page}&per_page=${perPage}`);
      return { 
        data: response.data, 
        pagination: { has_more: false } // Default fallback since ApiResponse doesn't include pagination
      };
    } else {
      // Get current user and use user-specific endpoint
      const user = await this.getProfile();
      const response = await this.request<ServiceHistory[]>(`/history/${user.id}?page=${page}&per_page=${perPage}`);
      return { 
        data: response.data, 
        pagination: { has_more: false } // Default fallback since ApiResponse doesn't include pagination
      };
    }
  }

  // New expenses history methods
  async getExpensesHistory(userId: number): Promise<ServiceHistory[]> {
    const response = await this.request<ServiceHistory[]>(`/history/${userId}`);
    return response.data;
  }

  async getExpensesStatistics(userId: number): Promise<any> {
    const response = await this.request<any>(`/history/${userId}/static`);
    return response.data;
  }

  async addServiceRecord(record: Partial<ServiceHistory>): Promise<ServiceHistory> {
    // Get current user first
    const user = await this.getProfile();
    const response = await this.request<ServiceHistory>(`/history/${user.id}/add`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
    return response.data;
  }

  async updateServiceRecord(id: number, record: Partial<ServiceHistory>): Promise<ServiceHistory> {
    // Get current user first
    const user = await this.getProfile();
    const response = await this.request<ServiceHistory>(`/history/${user.id}/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });
    return response.data;
  }

  async deleteServiceRecord(id: number): Promise<void> {
    // Get current user first
    const user = await this.getProfile();
    await this.request(`/history/${user.id}/delete/${id}`, {
      method: 'DELETE',
    });
  }

  // Reminder types methods
  async getReminderTypes(locale: string = 'uk'): Promise<any[]> {
    const cacheKey = `dict_reminder_types_${locale}`;
    const { data: cached, savedAt } = await this.getCachedDict<any[]>(cacheKey);
    const isFresh = savedAt ? (Date.now() - savedAt) < ApiService.DICT_TTL_MS : false;

    if (cached && isFresh) {
      this.request<any[]>(`/reminder-types?locale=${locale}`).then(r => this.setCachedDict(cacheKey, r.data)).catch(() => {});
      return cached;
    }

    try {
      const response = await this.request<any[]>(`/reminder-types?locale=${locale}`);
      await this.setCachedDict(cacheKey, response.data);
      return response.data;
    } catch (e) {
      if (cached) return cached;
      throw e;
    }
  }

  // Manual sections methods
  async getManualSections(locale: string = 'uk'): Promise<any[]> {
    const cacheKey = `dict_manual_sections_${locale}`;
    const { data: cached, savedAt } = await this.getCachedDict<any[]>(cacheKey);
    const isFresh = savedAt ? (Date.now() - savedAt) < ApiService.DICT_TTL_MS : false;

    if (cached && isFresh) {
      this.request<any[]>(`/manual-sections?locale=${locale}`).then(r => this.setCachedDict(cacheKey, r.data)).catch(() => {});
      return cached;
    }

    try {
      const response = await this.request<any[]>(`/manual-sections?locale=${locale}`);
      await this.setCachedDict(cacheKey, response.data);
      return response.data;
    } catch (e) {
      if (cached) return cached;
      throw e;
    }
  }

  // Expense types methods
  async getExpenseTypes(locale: string = 'uk'): Promise<Array<{ id: number; slug: string; name: string; translations: Record<string,string> }>> {
    const cacheKey = `dict_expense_types_${locale}`;
    const { data: cached, savedAt } = await this.getCachedDict<any[]>(cacheKey);
    const isFresh = savedAt ? (Date.now() - savedAt) < ApiService.DICT_TTL_MS : false;

    if (cached && isFresh) {
      this.request<any[]>(`/expense-types?locale=${locale}`).then(r => this.setCachedDict(cacheKey, r.data)).catch(() => {});
      return cached as any;
    }

    try {
      const response = await this.request<any[]>(`/expense-types?locale=${locale}`);
      await this.setCachedDict(cacheKey, response.data);
      return response.data as any;
    } catch (e) {
      if (cached) return cached as any;
      throw e;
    }
  }

  // FAQ methods
  async getFaq(locale: string = 'uk'): Promise<any[]> {
    console.log('ApiService: Getting FAQ for locale:', locale);
    const response = await this.request<any[]>(`/faq?locale=${locale}`);
    console.log('ApiService: FAQ response:', JSON.stringify(response, null, 2));
    return response.data;
  }

  async getFaqCategories(locale: string = 'uk'): Promise<any[]> {
    const response = await this.request<any[]>(`/faq/categories?locale=${locale}`);
    return response.data;
  }

  async getFaqQuestions(locale: string = 'uk', categoryId?: number, search?: string): Promise<any[]> {
    let url = `/faq/questions?locale=${locale}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await this.request<any[]>(url);
    return response.data;
  }
}

export default new ApiService();