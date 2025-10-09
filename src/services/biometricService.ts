import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometryType?: string;
}

class BiometricService {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({allowDeviceCredentials: true});
  }

  /**
   * Проверяет доступность биометрической аутентификации
   */
  async isAvailable(): Promise<{available: boolean; biometryType?: string}> {
    try {
      const {available, biometryType} = await this.rnBiometrics.isSensorAvailable();
      return {available, biometryType};
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return {available: false};
    }
  }

  /**
   * Выполняет биометрическую аутентификацию
   */
  async authenticate(promptMessage: string = 'Подтвердите вход в приложение'): Promise<BiometricResult> {
    try {
      const {available} = await this.isAvailable();
      
      if (!available) {
        return {
          success: false,
          error: 'Биометрическая аутентификация недоступна на этом устройстве'
        };
      }

      const {success} = await this.rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Отмена'
      });

      return {
        success,
        biometryType: await this.getBiometryType()
      };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      
      // Обработка различных типов ошибок
      if (error?.code === -4 || error?.message?.includes('canceled') || error?.message?.includes('UI canceled')) {
        return {
          success: false,
          error: 'Аутентификация отменена пользователем'
        };
      }
      
      if (error?.code === -1004 || error?.message?.includes('not enrolled')) {
        return {
          success: false,
          error: 'Биометрическая аутентификация не настроена в системе'
        };
      }
      
      if (error?.code === -1000 || error?.message?.includes('not available')) {
        return {
          success: false,
          error: 'Биометрическая аутентификация временно недоступна'
        };
      }

      return {
        success: false,
        error: 'Ошибка биометрической аутентификации'
      };
    }
  }

  /**
   * Получает тип биометрической аутентификации
   */
  private async getBiometryType(): Promise<string | undefined> {
    try {
      const {biometryType} = await this.rnBiometrics.isSensorAvailable();
      
      switch (biometryType) {
        case BiometryTypes.TouchID:
          return 'Touch ID';
        case BiometryTypes.FaceID:
          return 'Face ID';
        case BiometryTypes.Biometrics:
          return 'Биометрия';
        default:
          return 'Биометрическая аутентификация';
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Проверяет, настроена ли биометрическая аутентификация в системе
   */
  async isEnrolled(): Promise<boolean> {
    try {
      const {available} = await this.isAvailable();
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Получает дружественное название типа биометрии
   */
  getBiometryDisplayName(biometryType?: string, t?: (key: string) => string): string {
    if (!t) {
      // Fallback to Russian if no translation function provided
      switch (biometryType) {
        case BiometryTypes.TouchID:
          return 'Touch ID';
        case BiometryTypes.FaceID:
          return 'Face ID';
        case BiometryTypes.Biometrics:
          return 'отпечатком пальца';
        default:
          return 'биометрической аутентификацией';
      }
    }

    switch (biometryType) {
      case BiometryTypes.TouchID:
        return t('auth.biometricTypes.touchId');
      case BiometryTypes.FaceID:
        return t('auth.biometricTypes.faceId');
      case BiometryTypes.Biometrics:
        return t('auth.biometricTypes.fingerprint');
      default:
        return t('auth.biometricTypes.biometrics');
    }
  }
}

export default new BiometricService();
