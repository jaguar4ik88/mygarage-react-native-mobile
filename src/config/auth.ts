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
    // Для iOS нужен короткий Client ID без .apps.googleusercontent.com
    // Временно используем Web Client ID как iOS Client ID
    ...(Platform.OS === 'ios' && {
      iosClientId: GOOGLE_WEB_CLIENT_ID.split('.')[0],
    }),
    offlineAccess: true,
  },
  
  apple: {
    // Apple Sign-In настраивается автоматически
    // через app.json: "usesAppleSignIn": true
  },
};

export default AUTH_CONFIG;

