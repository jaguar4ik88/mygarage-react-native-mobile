// Конфигурация подписок для myGarage

export const SUBSCRIPTION_CONFIG = {
  // RevenueCat API ключи из переменных окружения
  // Установите в .env: EXPO_PUBLIC_REVENUECAT_API_KEY_IOS и EXPO_PUBLIC_REVENUECAT_API_KEY_GOOGLE
  REVENUECAT_API_KEY: {
    ios: (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '').trim(),
    android: (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_GOOGLE || '').trim()
  },

  // ID продуктов в App Store Connect и Google Play Console
  PRODUCT_IDS: {
    pro_monthly: 'pro_garage_monthly_subscription',
    premium_monthly: 'premium_garage_monthly_subscription'
  },

  // Entitlements (права доступа) в RevenueCat Dashboard
  ENTITLEMENTS: {
    pro_access: 'pro_access',
    premium_access: 'premium_access'
  },

  // Маппинг функций к подпискам
  FEATURE_ACCESS: {
    // Базовые функции (доступны всем)
    basic: ['vehicles_management', 'basic_reminders', 'sto_search', 'advice', 'profile_settings', 'model_recommendations', 'expenses_statistics', 'expenses_history'],
    
    // PRO функции
    pro: ['photo_documents', 'receipt_photos', 'pdf_export', 'unlimited_vehicles', 'unlimited_reminders', 'expense_reminders'],
    
    // PREMIUM функции
    premium: ['ai_assistant', 'trips', 'fuel_tracking', 'mileage_tracking', 'smart_reminders', 'cloud_storage']
  },

  // Лимиты для каждого типа подписки
  LIMITS: {
    free: {
      max_vehicles: 1,
      max_reminders: 5
    },
    pro: {
      max_vehicles: 3,
      max_reminders: null // безлимит
    },
    premium: {
      max_vehicles: 3,
      max_reminders: null // безлимит
    }
  },

  // Цены (в центах)
  PRICES: {
    pro_monthly: 499, // $4.99
    premium_monthly: 999 // $9.99 (когда будет готово)
  }
};

// Утилиты для работы с подписками
export const subscriptionUtils = {
  /**
   * Проверить, может ли пользователь добавить автомобиль
   */
  canAddVehicle(currentCount: number, subscriptionType: string): boolean {
    const limit = SUBSCRIPTION_CONFIG.LIMITS[subscriptionType as keyof typeof SUBSCRIPTION_CONFIG.LIMITS]?.max_vehicles;
    return limit === null || currentCount < limit;
  },

  /**
   * Проверить, может ли пользователь добавить напоминание
   */
  canAddReminder(currentCount: number, subscriptionType: string): boolean {
    const limit = SUBSCRIPTION_CONFIG.LIMITS[subscriptionType as keyof typeof SUBSCRIPTION_CONFIG.LIMITS]?.max_reminders;
    return limit === null || currentCount < limit;
  },

  /**
   * Получить максимальное количество автомобилей
   */
  getMaxVehicles(subscriptionType: string): number {
    return SUBSCRIPTION_CONFIG.LIMITS[subscriptionType as keyof typeof SUBSCRIPTION_CONFIG.LIMITS]?.max_vehicles || 1;
  },

  /**
   * Получить максимальное количество напоминаний
   */
  getMaxReminders(subscriptionType: string): number | null {
    return SUBSCRIPTION_CONFIG.LIMITS[subscriptionType as keyof typeof SUBSCRIPTION_CONFIG.LIMITS]?.max_reminders || 5;
  },

  /**
   * Проверить доступ к функции
   */
  hasAccessToFeature(feature: string, subscriptionType: string): boolean {
    const basicFeatures = SUBSCRIPTION_CONFIG.FEATURE_ACCESS.basic;
    const proFeatures = SUBSCRIPTION_CONFIG.FEATURE_ACCESS.pro;
    const premiumFeatures = SUBSCRIPTION_CONFIG.FEATURE_ACCESS.premium;

    // Базовые функции доступны всем
    if (basicFeatures.includes(feature)) {
      return true;
    }

    // PRO функции доступны PRO и PREMIUM пользователям
    if (proFeatures.includes(feature)) {
      return subscriptionType === 'pro' || subscriptionType === 'premium';
    }

    // PREMIUM функции доступны только PREMIUM пользователям
    if (premiumFeatures.includes(feature)) {
      return subscriptionType === 'premium';
    }

    return false;
  },

  /**
   * Форматировать цену
   */
  formatPrice(priceInCents: number): string {
    if (priceInCents === 0) return 'Бесплатно';
    return `$${(priceInCents / 100).toFixed(2)}/мес`;
  },

  /**
   * Получить название подписки
   */
  getSubscriptionName(subscriptionType: string): string {
    const names = {
      free: 'Free',
      pro: 'Pro',
      premium: 'Premium'
    };
    return names[subscriptionType as keyof typeof names] || 'Unknown';
  }
};
