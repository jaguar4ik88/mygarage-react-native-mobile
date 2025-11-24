import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesError,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';
import { Platform } from 'react-native';
import ApiService from './api';

// Конфигурация RevenueCat из переменных окружения
const REVENUECAT_API_KEY = {
  ios: (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '').trim(),
  android: (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_GOOGLE || '').trim()
};

// ID продуктов в магазинах приложений
const PRODUCT_IDS = {
  pro_monthly: 'pro_garage_monthly_subscription',
  premium_monthly: 'premium_garage_monthly_subscription'
};

// Entitlements (права доступа)
const ENTITLEMENTS = {
  pro_access: 'pro_access',
  premium_access: 'premium_access'
};

export interface SubscriptionInfo {
  isPro: boolean;
  isPremium: boolean;
  expirationDate?: string;
  productId?: string;
  willRenew?: boolean;
}

class SubscriptionService {
  private isInitialized = false;

  /**
   * Инициализация RevenueCat
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return; // Уже инициализирован, не логируем
      }
      
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android;
      
      if (!apiKey || typeof apiKey !== 'string') {
        console.error('❌ RevenueCat API key is invalid!');
        this.isInitialized = true;
        return;
      }
      
      if (apiKey.includes('YOUR_') || apiKey.length < 10) {
        console.error('❌ RevenueCat API key not configured!');
        console.error('💡 Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS and EXPO_PUBLIC_REVENUECAT_API_KEY_GOOGLE in .env');
        this.isInitialized = true;
        return;
      }
      
      // Определяем тип ключа
      const keyType = apiKey.startsWith('test_') ? 'TEST STORE ⚠️' 
                   : apiKey.startsWith('appl_') ? 'iOS PRODUCTION ✅' 
                   : apiKey.startsWith('goog_') ? 'ANDROID PRODUCTION ✅' 
                   : 'UNKNOWN';
      
      // Один четкий лог с ключевой информацией
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 REVENUECAT CONFIGURATION:');
      console.log(`   Platform: ${Platform.OS.toUpperCase()}`);
      console.log(`   API Key: ${apiKey.substring(0, 20)}... (${keyType})`);
      if (Platform.OS === 'ios') {
        console.log(`   Sandbox Mode: Determined by iOS automatically`);
        console.log(`   • Products with status "WAITING_FOR_REVIEW" are available ONLY in Sandbox`);
        console.log(`   • Sandbox activates when: Device has Sandbox test account OR Apple is reviewing`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await Purchases.configure({ 
        apiKey,
        appUserID: null,
        observerMode: false,
        userDefaultsSuiteName: null,
        useAmazon: false,
        shouldShowInAppMessagesAutomatically: true
      });
      
      const userId = await this.getCurrentUserId();
      if (userId) {
        try {
          await Purchases.logIn(userId);
        } catch (loginError) {
          // Ignore login errors, continue initialization
          console.error('⚠️ Error logging in user to RevenueCat:', loginError);
        }
      }

      this.isInitialized = true;
      console.log('✅ RevenueCat initialized successfully');
      
      // Примечание: Sandbox режим определяется автоматически при попытке покупки
      // iOS покажет диалог входа в Sandbox test account если он еще не настроен
    } catch (error: any) {
      console.error('❌ Error initializing RevenueCat:', error);
      // Mark as initialized to prevent infinite retry loops
      this.isInitialized = true;
      // Don't throw - allow app to continue without RevenueCat
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const user = await ApiService.getProfile();
      return user?.id?.toString() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Принудительно обновить кэш offerings
   */
  async syncPurchases(): Promise<void> {
    try {
      await this.initialize();
      if (!this.isInitialized) {
        console.error('❌ RevenueCat not initialized');
        return;
      }
      
      console.log('🔄 Syncing purchases and refreshing offerings cache...');
      await Purchases.syncPurchases();
      console.log('✅ Purchases synced');
    } catch (error) {
      console.error('❌ Error syncing purchases:', error);
    }
  }

  async getOfferings(forceRefresh: boolean = false): Promise<PurchasesOffering[]> {

    console.log('📦 RevenueCat Offerings start');
    const offerings1 = await Purchases.getOfferings()
    console.log('📦 RevenueCat Offerings (raw):', offerings1);

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (!this.isInitialized) {
        console.error('❌ RevenueCat not initialized');
        return [];
      }

      // Принудительно обновляем, если нужно
      if (forceRefresh) {
        console.log('🔄 Force refreshing offerings...');
        await this.syncPurchases();
      }

      const offerings = await Purchases.getOfferings();
      console.log('📦 RevenueCat Offerings (raw):', offerings);
      
      // Проверяем структуру данных
      console.log('📦 Offerings structure check:');
      console.log('   offerings exists:', !!offerings);
      console.log('   offerings.current:', offerings?.current);
      console.log('   offerings.all exists:', !!offerings?.all);
      console.log('   offerings.all keys:', offerings?.all ? Object.keys(offerings.all) : 'N/A');
      console.log('   offerings.all length:', offerings?.all ? Object.keys(offerings.all).length : 0);
      
      if (!offerings) {
        console.log('⚠️ Offerings is null/undefined');
        return [];
      }
      
      // Проверяем, есть ли данные в current или all
      if (!offerings.all || Object.keys(offerings.all).length === 0) {
        console.log('⚠️ offerings.all is empty');
        // Но может быть current offering
        if (offerings.current) {
          console.log('✅ Found current offering:', offerings.current.identifier);
          return [offerings.current];
        }
        console.log('⚠️ No offerings available');
        return [];
      }
      
      const offeringsArray = Object.values(offerings.all);
      console.log('📦 Offerings array length:', offeringsArray.length);
      
      // Проверяем каждый offering и его packages
      offeringsArray.forEach((offering, idx) => {
        console.log(`📦 Offering ${idx + 1}: ${offering?.identifier || 'N/A'}`);
        console.log(`   Packages count: ${offering?.availablePackages?.length || 0}`);
        if (offering?.availablePackages) {
          offering.availablePackages.forEach((pkg, pkgIdx) => {
            const product = (pkg as any)?.product || (pkg as any)?.storeProduct;
            console.log(`   Package ${pkgIdx + 1}: ${pkg?.identifier || 'N/A'}`);
            console.log(`      Has product: ${!!product}`);
            console.log(`      Product ID: ${product?.identifier || 'N/A'}`);
          });
        }
      });
      
      // Убираем дубликаты по identifier
      const seenIdentifiers = new Set<string>();
      const uniqueOfferings: PurchasesOffering[] = [];
      
      // Если есть current offering, добавляем его первым
      if (offerings.current && offerings.current.identifier) {
        console.log('✅ Adding current offering:', offerings.current.identifier);
        uniqueOfferings.push(offerings.current);
        seenIdentifiers.add(offerings.current.identifier);
      }
      
      // Добавляем остальные уникальные offerings
      offeringsArray.forEach(offering => {
        if (offering && offering.identifier && !seenIdentifiers.has(offering.identifier)) {
          console.log('✅ Adding offering:', offering.identifier);
          uniqueOfferings.push(offering);
          seenIdentifiers.add(offering.identifier);
        }
      });
      
      console.log('📦 Total unique offerings returned:', uniqueOfferings.length);
      return uniqueOfferings;
    } catch (error: any) {
      // НЕ возвращаем пустой массив - выводим ошибку, но SDK может все равно вернуть данные
      console.error('❌ Error getting offerings:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error userInfo:', error?.userInfo);
      console.error('❌ Full error object:', error);
      
      // Попробуем все равно получить данные, даже если была ошибка
      try {
        const offerings = await Purchases.getOfferings();
        console.log('⚠️ Got offerings despite error:', offerings);
        if (offerings && offerings.all) {
          return Object.values(offerings.all);
        }
      } catch (e) {
        // Ignore
      }
      
      return [];
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<CustomerInfo> {
    try {
      await this.initialize();
      
      if (!this.isInitialized) {
        throw new Error('RevenueCat не инициализирован');
      }

      // Если это прямой продукт (не из offering), пробуем purchaseProduct
      if (packageToPurchase.offeringIdentifier === 'direct') {
        const directProduct = (packageToPurchase as any).product || (packageToPurchase as any).storeProduct;
        if (directProduct && directProduct.identifier) {
          console.log('🛒 Purchasing direct product (bypassing offerings):', directProduct.identifier);
          console.log('   Product title:', directProduct.title);
          console.log('   Product price:', directProduct.priceString || directProduct.pricePerMonthString);
          
          const { customerInfo } = await Purchases.purchaseProduct(directProduct.identifier);
          await this.syncWithBackend(customerInfo);
          return customerInfo;
        }
      }

      // Обычная покупка через package из offerings
      console.log('🛒 Purchasing package:', packageToPurchase.identifier);
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      await this.syncWithBackend(customerInfo);
      
      return customerInfo;
    } catch (error: any) {
      console.error('❌ Error purchasing package:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error constructor:', error?.constructor?.name);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error message:', error?.message);
      
      // Безопасная проверка ошибки RevenueCat
      const isPurchasesError = error && (
        error instanceof PurchasesError ||
        (typeof PurchasesError !== 'undefined' && error instanceof PurchasesError) ||
        (error.code !== undefined && error.message !== undefined)
      );
      
      if (isPurchasesError && error.code) {
        const errorCode = error.code;
        
        switch (errorCode) {
          case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
            throw new Error('Покупка отменена пользователем');
          case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
            throw new Error('Платеж обрабатывается');
          case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
            throw new Error('Продукт недоступен для покупки');
          case PURCHASES_ERROR_CODE.NETWORK_ERROR:
            throw new Error('Ошибка сети');
          case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
            throw new Error('Проблема с магазином приложений. Убедитесь, что используется release сборка.');
          default:
            throw new Error(error.message || 'Ошибка при покупке подписки');
        }
      }
      
      // Обработка ошибки Google Play Billing
      if (error?.message?.includes('Google Play') || error?.message?.includes('платежной службой')) {
        throw new Error('Эта версия приложения не поддерживает покупки. Используйте release сборку, подписанную релизным ключом.');
      }
      
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      await this.initialize();
      const customerInfo = await Purchases.restorePurchases();
      await this.syncWithBackend(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  async getCurrentSubscription(): Promise<SubscriptionInfo> {
    try {
      await this.initialize();
      const customerInfo = await Purchases.getCustomerInfo();
      
      return {
        isPro: customerInfo.entitlements.active[ENTITLEMENTS.pro_access] !== undefined,
        isPremium: customerInfo.entitlements.active[ENTITLEMENTS.premium_access] !== undefined,
        expirationDate: customerInfo.entitlements.active[ENTITLEMENTS.pro_access]?.expirationDate,
        productId: customerInfo.entitlements.active[ENTITLEMENTS.pro_access]?.productIdentifier,
        willRenew: customerInfo.entitlements.active[ENTITLEMENTS.pro_access]?.willRenew
      };
    } catch (error) {
      try {
        const subscription = await ApiService.getCurrentSubscription();
        return {
          isPro: subscription.is_pro,
          isPremium: subscription.plan_type === 'premium',
          expirationDate: subscription.expires_at
        };
      } catch (apiError) {
        return { isPro: false, isPremium: false };
      }
    }
  }

  async checkAccess(feature: string): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      
      switch (feature) {
        case 'photo_documents':
        case 'receipt_photos':
        case 'pdf_export':
        case 'unlimited_vehicles':
        case 'unlimited_reminders':
        case 'expense_reminders':
          return subscription.isPro || subscription.isPremium;
          
        case 'ai_assistant':
        case 'trips':
        case 'fuel_tracking':
        case 'mileage_tracking':
        case 'smart_reminders':
        case 'cloud_storage':
          return subscription.isPremium;
          
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  private async syncWithBackend(customerInfo: CustomerInfo): Promise<void> {
    try {
      console.log('🔄 Syncing subscription with backend...');
      const activeEntitlements = Object.values(customerInfo.entitlements.active);
      
      console.log(`📦 Active entitlements count: ${activeEntitlements.length}`);
      
      if (activeEntitlements.length > 0) {
        const activeEntitlement = activeEntitlements[0];
        console.log(`📦 Active entitlement: ${activeEntitlement.identifier}`);
        console.log(`📦 Expected pro_access: ${ENTITLEMENTS.pro_access}`);
        console.log(`📦 Expected premium_access: ${ENTITLEMENTS.premium_access}`);
        console.log(`📦 All entitlements:`, Object.keys(customerInfo.entitlements.active || {}));
        
        let subscriptionType = 'free';
        if (activeEntitlement.identifier === ENTITLEMENTS.pro_access) {
          subscriptionType = 'pro';
        } else if (activeEntitlement.identifier === ENTITLEMENTS.premium_access) {
          subscriptionType = 'premium';
        } else {
          // Fallback: если entitlement не совпадает, но есть активная подписка, используем pro
          console.warn(`⚠️ Unknown entitlement identifier: ${activeEntitlement.identifier}, defaulting to pro`);
          subscriptionType = 'pro';
        }

        console.log(`📦 Subscription type: ${subscriptionType}`);

        // For iOS: use latest_receipt from RevenueCat (base64-encoded receipt)
        // For Android: receipt data is handled differently
        let receiptData: string | undefined;
        if (Platform.OS === 'ios') {
          // RevenueCat provides latestReceipt for iOS (base64-encoded App Store receipt)
          // This is required for server-side receipt validation (Apple App Store Review requirement)
          const customerInfoAny = customerInfo as any;
          
          // Try to get latestReceipt from CustomerInfo
          receiptData = customerInfoAny.latestReceipt || customerInfoAny.latest_receipt;
          
          if (receiptData) {
            console.log('✅ Found receipt data from RevenueCat (length:', receiptData.length, ')');
          } else {
            console.warn('⚠️ Receipt data not found in CustomerInfo. Server validation may fail.');
            console.warn('⚠️ Available CustomerInfo keys:', Object.keys(customerInfoAny));
          }
        }

        const transactionId = activeEntitlement.originalPurchaseDate || activeEntitlement.latestPurchaseDate || '';
        console.log(`📦 Transaction ID: ${transactionId}`);
        console.log(`📦 Sending verification to backend...`);

        await ApiService.verifySubscription({
          platform: Platform.OS,
          transaction_id: transactionId,
          original_transaction_id: activeEntitlement.originalPurchaseDate || undefined,
          subscription_type: subscriptionType,
          receipt_data: receiptData
        });
        
        console.log('✅ Subscription synced with backend successfully');
      } else {
        console.warn('⚠️ No active entitlements found in CustomerInfo');
      }
    } catch (error) {
      console.error('❌ Error syncing with backend:', error);
      console.error('❌ Error details:', error);
    }
  }

  /**
   * Вывести все данные от RevenueCat (offerings, customerInfo, etc.)
   */
  async dumpAllRevenueCatData(): Promise<void> {
    try {
      await this.initialize();
      if (!this.isInitialized) {
        console.error('❌ RevenueCat not initialized');
        return;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      console.log(customerInfo);
      
      await this.getOfferings(false);
    } catch (error: any) {
      console.error('❌ Error dumping RevenueCat data:', error);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
    }
  }

  async getProductForSubscription(subscriptionType: string): Promise<PurchasesPackage | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (!this.isInitialized) {
        console.error('❌ RevenueCat not initialized');
        return null;
      }

      const offerings = await this.getOfferings();

      // Пытаемся найти подходящий пакет простым поиском
      // Ищем по названию типа подписки в identifier или package identifier
      const searchTerms = [subscriptionType, `${subscriptionType}_monthly`, `pro_monthly`, `premium_monthly`];
      
      for (const offering of offerings) {
        for (const packageItem of offering.availablePackages) {
          const packageIdentifier = packageItem.identifier.toLowerCase();
          const offeringIdentifier = offering.identifier.toLowerCase();
          const product = (packageItem as any).product || (packageItem as any).storeProduct;
          const productId = product?.identifier?.toLowerCase() || '';
          
          // Проверяем совпадение по любым терминам
          const matches = searchTerms.some(term => 
            packageIdentifier.includes(term.toLowerCase()) ||
            offeringIdentifier.includes(term.toLowerCase()) ||
            productId.includes(term.toLowerCase())
          );
          
          if (matches && product) {
            return packageItem;
          }
        }
      }

      // Если ничего не найдено, возвращаем первый доступный пакет (если есть)
      for (const offering of offerings) {
        if (offering.availablePackages && offering.availablePackages.length > 0) {
          for (const packageItem of offering.availablePackages) {
            const product = (packageItem as any).product || (packageItem as any).storeProduct;
            if (product) {
              return packageItem;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting product for subscription:', error);
      return null;
    }
  }

  async cancelSubscription(): Promise<void> {
    try {
      await Purchases.showManageSubscriptions();
    } catch (error) {
      console.error('Error showing manage subscriptions:', error);
      throw new Error('Не удалось открыть управление подписками');
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export default new SubscriptionService();
