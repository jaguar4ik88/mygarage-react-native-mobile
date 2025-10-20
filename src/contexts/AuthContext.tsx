import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api';
import BiometricService from '../services/biometricService';
import Analytics from '../services/analyticsService';
import { User } from '../types';

interface AuthState {
  isGuest: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, user?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  promptToLogin: () => void;
  checkAutoLogin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
  onLoginPrompt?: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onLoginPrompt }) => {
  const [state, setState] = useState<AuthState>({
    isGuest: false,
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Проверяем режим гостя
      const guestMode = await AsyncStorage.getItem('guest_mode');
      if (guestMode === 'true') {
        setState({
          isGuest: true,
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
        return;
      }

      // Проверяем наличие токена
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        // Загружаем данные пользователя
        try {
          const userData = await AsyncStorage.getItem('user_data');
          const user = userData ? JSON.parse(userData) : null;
          
          setState({
            isGuest: false,
            isAuthenticated: true,
            user,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error loading user data:', error);
          setState({
            isGuest: false,
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }
      } else {
        setState({
          isGuest: false,
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      setState({
        isGuest: false,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await ApiService.login(email, password);
      
      if (response.token) {
        // Сохраняем токен
        await AsyncStorage.setItem('auth_token', response.token);
        await ApiService.updateToken();
        
        // Сохраняем данные пользователя
        if (response.user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        }
        
        // Очищаем гостевой режим если был
        await AsyncStorage.removeItem('guest_mode');
        await clearGuestData();
        
        // Сохраняем для биометрии
        await AsyncStorage.setItem('last_login_email', email);
        await AsyncStorage.setItem('last_login_password', password);
        
        setState({
          isGuest: false,
          isAuthenticated: true,
          user: response.user,
          isLoading: false,
        });
        
        await Analytics.track('auth_login_success', { method: 'email' });
      }
    } catch (error) {
      await Analytics.track('auth_login_failed', { method: 'email' });
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      const response = await ApiService.loginWithGoogle(idToken);
      
      if (response.token) {
        await AsyncStorage.setItem('auth_token', response.token);
        await ApiService.updateToken();
        
        if (response.user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        }
        
        await AsyncStorage.removeItem('guest_mode');
        await clearGuestData();
        
        setState({
          isGuest: false,
          isAuthenticated: true,
          user: response.user,
          isLoading: false,
        });
        
        await Analytics.track('auth_login_success', { method: 'google' });
      }
    } catch (error) {
      await Analytics.track('auth_login_failed', { method: 'google' });
      throw error;
    }
  };

  const loginWithApple = async (identityToken: string, user?: string) => {
    try {
      const response = await ApiService.loginWithApple(identityToken, user);
      
      if (response.token) {
        await AsyncStorage.setItem('auth_token', response.token);
        await ApiService.updateToken();
        
        if (response.user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        }
        
        await AsyncStorage.removeItem('guest_mode');
        await clearGuestData();
        
        setState({
          isGuest: false,
          isAuthenticated: true,
          user: response.user,
          isLoading: false,
        });
        
        await Analytics.track('auth_login_success', { method: 'apple' });
      }
    } catch (error) {
      await Analytics.track('auth_login_failed', { method: 'apple' });
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await ApiService.register(email, password, name);
      
      if (response.token) {
        await AsyncStorage.setItem('auth_token', response.token);
        await ApiService.updateToken();
        
        if (response.user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        }
        
        await AsyncStorage.removeItem('guest_mode');
        await clearGuestData();
        
        // Сохраняем для биометрии
        await AsyncStorage.setItem('last_login_email', email);
        await AsyncStorage.setItem('last_login_password', password);
        
        setState({
          isGuest: false,
          isAuthenticated: true,
          user: response.user,
          isLoading: false,
        });
        
        await Analytics.track('auth_register_success');
      }
    } catch (error) {
      await Analytics.track('auth_register_failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('guest_mode');
      await AsyncStorage.removeItem('current_vehicle_id');
      
      // Очищаем токен в API Service
      await ApiService.updateToken();
      
      setState({
        isGuest: false,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      
      await Analytics.track('auth_logout');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const continueAsGuest = async () => {
    try {
      await AsyncStorage.setItem('guest_mode', 'true');
      
      setState({
        isGuest: true,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      
      await Analytics.track('auth_continue_as_guest');
    } catch (error) {
      console.error('Error setting guest mode:', error);
    }
  };

  const promptToLogin = () => {
    console.log('🔔 promptToLogin called, onLoginPrompt exists:', !!onLoginPrompt);
    Analytics.track('login_prompt_shown');
    if (onLoginPrompt) {
      console.log('🔔 Calling onLoginPrompt callback');
      onLoginPrompt();
    } else {
      console.warn('⚠️ onLoginPrompt callback is not defined!');
    }
  };

  const checkAutoLogin = async (): Promise<boolean> => {
    try {
      // Проверяем есть ли уже токен
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        // Уже залогинен - просто возвращаем true, НЕ запускаем биометрию автоматически
        // Биометрия должна запускаться только при ручном запросе из AuthScreen
        console.log('User already has token, skipping auto-login');
        return true;
      }

      // Если токена нет - не показываем биометрию автоматически
      // Пользователь должен сам выбрать: войти, зарегистрироваться или продолжить как гость
      console.log('No token found, user needs to choose login method');
      return false;
    } catch (error) {
      console.error('Error during auto login:', error);
      return false;
    }
  };

  const clearGuestData = async () => {
    try {
      // Очищаем все гостевые данные из AsyncStorage
      // В будущем здесь будут очищаться локально сохраненные авто, траты и т.д.
      await AsyncStorage.removeItem('guest_vehicles');
      await AsyncStorage.removeItem('guest_expenses');
      await AsyncStorage.removeItem('guest_reminders');
      console.log('Guest data cleared');
    } catch (error) {
      console.error('Error clearing guest data:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithGoogle,
    loginWithApple,
    register,
    logout,
    continueAsGuest,
    promptToLogin,
    checkAutoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

