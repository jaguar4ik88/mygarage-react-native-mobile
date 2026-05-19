import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@env';
import { Platform } from 'react-native';

/**
 * Authentication configuration
 * 
 * Google Sign-In:
 * - webClientId: Web Client ID - используется на всех платформах для верификации
 * - iosClientId: iOS Client ID - нужен только для iOS устройств
 * 
 * Оба загружаются из .env файла
 * 
 * Apple Sign-In:
 * - Настраивается автоматически через app.json
 */

export const AUTH_CONFIG = {
  google: {
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // Для iOS используем GOOGLE_IOS_CLIENT_ID из .env
    // iosClientId должен быть БЕЗ .apps.googleusercontent.com (только ID часть)
    ...(Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID && {
      iosClientId: GOOGLE_IOS_CLIENT_ID.replace('.apps.googleusercontent.com', ''),
    }),
    offlineAccess: true,
  },
  
  apple: {
    // Apple Sign-In настраивается автоматически
    // через app.json: "usesAppleSignIn": true
  },
};

export default AUTH_CONFIG;

