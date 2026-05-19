import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  PurchasesEntitlementInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import ApiService from './api';

/** Подробные логи RevenueCat и синка. Вкл.: EXPO_PUBLIC_DEBUG_SUBSCRIPTIONS=1 при __DEV__. */
const RC_VERBOSE_LOGS =
  __DEV__ && String(process.env.EXPO_PUBLIC_DEBUG_SUBSCRIPTIONS || '').trim() === '1';

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
  /** Сериализация параллельных initialize() → меньше двойного configure и предупреждений SDK */
  private initInFlight: Promise<void> | null = null;

  /**
   * Инициализация RevenueCat
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initInFlight) {
      this.initInFlight = this.runInitializeOnce().finally(() => {
        this.initInFlight = null;
      });
    }
    await this.initInFlight;
  }

  private async runInitializeOnce(): Promise<void> {
    try {
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

      if (RC_VERBOSE_LOGS) {
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
      }
      
      await Purchases.configure({ 
        apiKey,
        appUserID: null,
        userDefaultsSuiteName: undefined,
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

      if (RC_VERBOSE_LOGS) {
        console.log('✅ RevenueCat initialized');
      }
      
      // Примечание: Sandbox режим определяется автоматически при попытке покупки
      // iOS покажет диалог входа в Sandbox test account если он еще не настроен
    } catch (error: any) {
      console.error('❌ Error initializing RevenueCat:', error);
      // Mark as initialized to prevent infinite retry loops
      this.isInitialized = true;
      // Don't throw - allow app to continue without RevenueCat
    }
  }

  /** После покупки entitlements.active иногда пустой до обновления кэша или если продукт не привязан к entitlement в RC. */
  private async refreshCustomerInfoIfStale(customerInfo: CustomerInfo): Promise<CustomerInfo> {
    const hasActiveEntitlements =
      Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
    if (hasActiveEntitlements) return customerInfo;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await Purchases.invalidateCustomerInfoCache();
        const delayMs = attempt === 0 ? 120 : 380 * attempt;
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
        const next = await Purchases.getCustomerInfo();
        customerInfo = next;
        if (Object.keys(next.entitlements?.active ?? {}).length > 0) break;
        if ((next.activeSubscriptions?.length ?? 0) > 0) break;
      } catch {
        break;
      }
    }
    return customerInfo;
  }

  /** Активное право: из entitlements.active или из all с isActive (на случай расхождений карты в SDK). */
  private pickPrimaryActiveEntitlement(ci: CustomerInfo): PurchasesEntitlementInfo | null {
    const prefer = (list: PurchasesEntitlementInfo[]): PurchasesEntitlementInfo | null => {
      const prem = list.find((e) => e.identifier === ENTITLEMENTS.premium_access);
      if (prem) return prem;
      const pro = list.find((e) => e.identifier === ENTITLEMENTS.pro_access);
      if (pro) return pro;
      return list[0] ?? null;
    };

    const fromActive = prefer(Object.values(ci.entitlements.active ?? {}));
    if (fromActive) return fromActive;

    const fromAllActive = Object.values(ci.entitlements.all ?? {}).filter((e) => e.isActive);
    return prefer(fromAllActive);
  }

  private skuIsPremium(productId: string): boolean {
    const l = productId.toLowerCase();
    return l.includes('premium') || productId === PRODUCT_IDS.premium_monthly;
  }

  private skuIsPro(productId: string): boolean {
    if (this.skuIsPremium(productId)) return false;
    const l = productId.toLowerCase();
    return (
      l.includes('pro') ||
      productId === PRODUCT_IDS.pro_monthly ||
      l.includes('pro_garage') ||
      l === 'pro_monthly'
    );
  }

  /** Fallback, если продукт куплен и виден в Store, но entitlement в RevenueCat не настроен. */
  private pickPlanFromActiveSubscriptions(
    ci: CustomerInfo
  ): { plan: 'pro' | 'premium'; productId: string } | null {
    const skus = ci.activeSubscriptions ?? [];
    for (const id of skus) {
      if (this.skuIsPremium(id)) return { plan: 'premium', productId: id };
    }
    for (const id of skus) {
      if (this.skuIsPro(id)) return { plan: 'pro', productId: id };
    }
    return null;
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
      
      if (RC_VERBOSE_LOGS) {
        console.log('[RC] Syncing purchases…');
      }
      await Purchases.syncPurchases();
      if (RC_VERBOSE_LOGS) {
        console.log('[RC] Purchases synced');
      }
    } catch (error) {
      console.error('❌ Error syncing purchases:', error);
    }
  }

  async getOfferings(forceRefresh: boolean = false): Promise<PurchasesOffering[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (!this.isInitialized) {
        console.error('[RC] RevenueCat not initialized');
        return [];
      }

      if (forceRefresh) {
        if (RC_VERBOSE_LOGS) {
          console.log('[RC] Force refreshing offerings…');
        }
        await this.syncPurchases();
      }

      const offerings = await Purchases.getOfferings();

      if (!offerings) {
        return [];
      }

      if (!offerings.all || Object.keys(offerings.all).length === 0) {
        return offerings.current ? [offerings.current] : [];
      }

      const offeringsArray = Object.values(offerings.all);
      const seenIdentifiers = new Set<string>();
      const uniqueOfferings: PurchasesOffering[] = [];

      if (offerings.current?.identifier) {
        uniqueOfferings.push(offerings.current);
        seenIdentifiers.add(offerings.current.identifier);
      }

      offeringsArray.forEach((offering) => {
        if (offering?.identifier && !seenIdentifiers.has(offering.identifier)) {
          uniqueOfferings.push(offering);
          seenIdentifiers.add(offering.identifier);
        }
      });

      if (RC_VERBOSE_LOGS) {
        const summary = uniqueOfferings
          .map((o) => `${o.identifier} (${o.availablePackages?.length ?? 0} pkgs)`)
          .join('; ');
        console.log(`[RC] Offerings: ${summary}`);
      }

      return uniqueOfferings;
    } catch (error: any) {
      console.error('[RC] getOfferings failed:', error?.message ?? error);
      if (RC_VERBOSE_LOGS) {
        console.error('[RC] code:', error?.code, error?.userInfo);
      }

      try {
        const fallback = await Purchases.getOfferings();
        if (fallback?.all && Object.keys(fallback.all).length > 0) {
          if (RC_VERBOSE_LOGS) {
            console.warn('[RC] Fallback after error:', Object.keys(fallback.all).join(', '));
          }
          return Object.values(fallback.all);
        }
      } catch {
        // ignore
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
          if (RC_VERBOSE_LOGS) {
            console.log('[RC] purchaseProduct', directProduct.identifier);
          }
          
          const { customerInfo } = await Purchases.purchaseProduct(directProduct.identifier);
          await this.syncWithBackend(customerInfo);
          return customerInfo;
        }
      }

      if (RC_VERBOSE_LOGS) {
        console.log('[RC] purchasePackage', packageToPurchase.identifier);
      }
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      await this.syncWithBackend(customerInfo);
      
      return customerInfo;
    } catch (error: any) {
      console.error('[RC] purchase failed:', error?.code ?? '?', error?.message ?? error);
      if (RC_VERBOSE_LOGS) {
        console.error('[RC] purchase detail:', typeof error, error?.constructor?.name, error?.userInfo);
      }
      
      // Безопасная проверка ошибки RevenueCat без использования instanceof
      // Проверяем наличие кода ошибки
      if (error && typeof error === 'object') {
        const errorCode = error.code;
        const readableErrorCode = error.readable_error_code;
        
        // Проверяем коды ошибок RevenueCat
        if (errorCode !== undefined || readableErrorCode) {
          // Проверяем STORE_PROBLEM ошибку (код 2 или readable_error_code)
          if (errorCode === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR || 
              errorCode === 2 || 
              readableErrorCode === 'STORE_PROBLEM') {
            // Для iOS сандбокс это может означать проблемы с настройкой
            if (Platform.OS === 'ios') {
              throw new Error('Проблема с App Store. Убедитесь, что:\n1. Вы используете Sandbox тестовый аккаунт\n2. Продукты настроены в App Store Connect\n3. Приложение правильно подписано');
            } else {
              throw new Error('Проблема с магазином приложений. Убедитесь, что используется release сборка.');
            }
          }
          
          // Другие типы ошибок RevenueCat
          if (errorCode === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
            throw new Error('Покупка отменена пользователем');
          }
          
          if (errorCode === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
            throw new Error('Платеж обрабатывается');
          }
          
          if (errorCode === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR) {
            throw new Error('Продукт недоступен для покупки');
          }
          
          if (errorCode === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
            throw new Error('Ошибка сети. Проверьте подключение к интернету.');
          }
          
          if (errorCode === PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR) {
            throw new Error('Покупка недействительна');
          }
          
          if (errorCode === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
            throw new Error('Покупки не разрешены на этом устройстве');
          }
        }
      }
      
      // Обработка ошибки Google Play Billing
      if (error?.message?.includes('Google Play') || error?.message?.includes('платежной службой')) {
        throw new Error('Эта версия приложения не поддерживает покупки. Используйте release сборку, подписанную релизным ключом.');
      }
      
      // Если ошибка связана с App Store
      if (error?.message?.includes('App Store') || error?.readable_error_code === 'STORE_PROBLEM') {
        throw new Error('Проблема с App Store. Убедитесь, что:\n1. Вы используете Sandbox тестовый аккаунт\n2. Продукты настроены в App Store Connect\n3. Приложение правильно подписано');
      }
      
      // Пробрасываем оригинальную ошибку с улучшенным сообщением
      const finalMessage = error?.message || error?.userInfo?.NSLocalizedDescription || 'Ошибка при покупке подписки';
      throw new Error(finalMessage);
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
        expirationDate: customerInfo.entitlements.active[ENTITLEMENTS.pro_access]?.expirationDate || undefined,
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

  private iosReceiptPayload(customerInfo: CustomerInfo): string | undefined {
    const anyInfo = customerInfo as any;
    let receipt = anyInfo.latestReceipt || anyInfo.latest_receipt;
    if (!receipt && anyInfo.latestReceiptInfo?.latest_receipt) {
      receipt = anyInfo.latestReceiptInfo.latest_receipt;
    }
    return receipt;
  }

  private async syncEntitlementWithBackend(
    ci: CustomerInfo,
    entitlement: PurchasesEntitlementInfo
  ): Promise<void> {
    let subscriptionType: 'pro' | 'premium';
    if (entitlement.identifier === ENTITLEMENTS.pro_access) {
      subscriptionType = 'pro';
    } else if (entitlement.identifier === ENTITLEMENTS.premium_access) {
      subscriptionType = 'premium';
    } else {
      console.warn(`[RC] Unknown entitlement "${entitlement.identifier}", treating as pro`);
      subscriptionType = 'pro';
    }

    if (RC_VERBOSE_LOGS) {
      console.log(
        '[RC] entitlement sync:',
        Object.keys(ci.entitlements.active || {}),
        `→ ${subscriptionType}`
      );
    }

    let receiptData: string | undefined;
    if (Platform.OS === 'ios') {
      receiptData = this.iosReceiptPayload(ci);
      if (receiptData) {
        if (RC_VERBOSE_LOGS) {
          console.log('[RC] receipt ok, len:', receiptData.length, entitlement.productIdentifier ?? '');
          const entitlementAny = entitlement as any;
          if (entitlementAny.isSandbox !== undefined) {
            console.log('[RC] sandbox:', entitlementAny.isSandbox);
          }
        }
      } else {
        console.warn('[RC] iOS receipt missing — серверная проверка может не пройти');
        if (RC_VERBOSE_LOGS) {
          console.warn('[RC] CustomerInfo keys:', Object.keys(ci as any));
        }
      }
    }

    const entitlementAny = entitlement as any;
    const transactionId =
      entitlementAny.latestTransactionIdentifier ||
      entitlementAny.latestTransactionId ||
      entitlementAny.transactionIdentifier ||
      entitlementAny.transactionId ||
      entitlement.productIdentifier ||
      'unknown';

    const originalTransactionId =
      entitlementAny.originalTransactionIdentifier ||
      entitlementAny.originalTransactionId ||
      transactionId;

    if (RC_VERBOSE_LOGS) {
      console.log('[RC] verify tx:', transactionId, originalTransactionId);
    }

    await ApiService.verifySubscription({
      platform: Platform.OS,
      transaction_id: transactionId,
      original_transaction_id: originalTransactionId,
      subscription_type: subscriptionType,
      receipt_data: receiptData,
    });

    if (RC_VERBOSE_LOGS) {
      console.log('[RC] backend verify OK');
    }
  }

  /**
   * Store уже показывает активную подписку, но entitlements в RC пусты
   * (продукт не добавлен к entitlement в Dashboard).
   */
  private async syncActiveSkuWithBackend(
    ci: CustomerInfo,
    pick: { plan: 'pro' | 'premium'; productId: string }
  ): Promise<void> {
    const meta = ci.subscriptionsByProductIdentifier?.[pick.productId];
    const transactionId = meta?.storeTransactionId || pick.productId;
    const originalTransactionId = transactionId;

    let receiptData: string | undefined;
    if (Platform.OS === 'ios') {
      receiptData = this.iosReceiptPayload(ci);
      if (!receiptData) {
        console.warn('[RC] iOS receipt отсутствует — включите связку Product → Entitlement в RevenueCat');
      }
    }

    console.warn(
      `[RC] Обход по SKU: ${pick.plan} («${pick.productId}»). В RevenueCat привяжите этот Store product к entitlement (pro_access / premium_access).`
    );

    await ApiService.verifySubscription({
      platform: Platform.OS,
      transaction_id: transactionId,
      original_transaction_id: originalTransactionId,
      subscription_type: pick.plan,
      receipt_data: receiptData,
    });
  }

  private async syncWithBackend(customerInfo: CustomerInfo): Promise<void> {
    try {
      if (RC_VERBOSE_LOGS) {
        console.log('[RC] sync subscription → backend');
      }

      const ci = await this.refreshCustomerInfoIfStale(customerInfo);

      const entitlement = this.pickPrimaryActiveEntitlement(ci);
      if (entitlement) {
        await this.syncEntitlementWithBackend(ci, entitlement);
        return;
      }

      const fromSkus = this.pickPlanFromActiveSubscriptions(ci);
      if (fromSkus) {
        await this.syncActiveSkuWithBackend(ci, fromSkus);
        return;
      }

      console.warn(
        '[RC] Нет активных entitlements и нет распознанного activeSubscriptions:',
        JSON.stringify(ci.activeSubscriptions ?? [])
      );
    } catch (error) {
      console.error('[RC] syncWithBackend:', error);
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
