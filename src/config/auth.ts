import { GOOGLE_WEB_CLIENT_ID } from '@env';
import { Platform } from 'react-native';

/**
 * Authentication configuration
 * 
 * Google OAuth:
 * - webClientId: только OAuth-клиент типа «Веб-приложение» (.apps.googleusercontent.com).
 *   На iOS client id приложения берётся из GoogleService-Info.plist (CLIENT_ID).
 * 
 * Apple Sign-In:
 * - Настраивается автоматически через app.json
 */

export const AUTH_CONFIG = {
  google: {
    /**
     * Сервер OAuth 2 клиент типа «Веб-приложение» из GCP/Firebase (не iOS клиент!).
     * Нужен для idToken аудитории / serverClientID в GIDSignIn на iOS.
     */
    webClientId: GOOGLE_WEB_CLIENT_ID,
    /**
     * false на iOS: см. офлайн / server auth (redirect_uri 400 при true).
     * Android: можно true, если реально нужен server auth code.
     */
    offlineAccess: Platform.OS !== 'ios',
  },
  
  apple: {
    // Apple Sign-In настраивается автоматически
    // через app.json: "usesAppleSignIn": true
  },
};

export default AUTH_CONFIG;

