# Настройка системы оплаты RevenueCat

## Обзор

Система оплаты интегрирована с RevenueCat для управления подписками в iOS и Android приложениях. RevenueCat предоставляет единый API для работы с App Store и Google Play Store.

## Что уже реализовано

✅ **SubscriptionService** - сервис для работы с RevenueCat API  
✅ **SubscriptionScreen** - обновлен для использования реальных покупок  
✅ **FeatureGate** - компонент для проверки доступа к функциям  
✅ **Конфигурация** - настройки продуктов и entitlements  
✅ **Fallback режим** - работает без RevenueCat в dev режиме  

## Настройка RevenueCat Dashboard

### 1. Создание аккаунта

1. Перейдите на [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Создайте новый проект "myGarage"
3. Добавьте приложения:
   - iOS: Bundle ID `uno.mygarage.app`
   - Android: Package name `uno.mygarage.app`

### 2. Подключение App Store Connect к RevenueCat

**⚠️ ВАЖНО**: Перед настройкой продуктов нужно подключить App Store Connect к RevenueCat!

1. **В RevenueCat Dashboard** → **Apps** → **iOS App** → **App Store Connect**
2. **Выберите способ подключения**:
   
   **Способ A: API Key (рекомендуется)**:
   - Создайте API Key в App Store Connect (Users and Access → Keys)
   - Скачайте .p8 файл (только один раз!)
   - В RevenueCat укажите:
     - Issuer ID (из App Store Connect)
     - Key ID (из App Store Connect)
     - Private Key (содержимое .p8 файла)
   
   **Способ B: OAuth**:
   - Нажмите "Connect with App Store Connect"
   - Войдите с вашим Apple ID
   - Разрешите доступ

3. **Проверьте подключение**: статус должен быть "Connected"

**Подробная инструкция**: см. `REVENUECAT_APPSTORE_CONNECT_SETUP.md`

### 3. Настройка продуктов

#### iOS (App Store Connect)
1. **Убедитесь, что приложение создано в App Store Connect**:
   - Bundle ID: `uno.mygarage.app`
   - Если приложения нет, создайте его в App Store Connect

2. **В App Store Connect создайте in-app purchases**:
   - Перейдите в ваше приложение → **Subscriptions**
   - Создайте Subscription Group (если еще нет)
   - Создайте подписку:
     - **Product ID**: `pro_monthly_subscription`
     - **Type**: Auto-Renewable Subscription
     - **Price**: $4.99/month
     - **Duration**: 1 month
     - **Status**: Ready to Submit (или Active)

#### Android (Google Play Console)
1. В Google Play Console создайте подписки:
   - **Product ID**: `pro_monthly_subscription`
   - **Type**: Subscription
   - **Price**: $4.99/month
   - **Duration**: 1 month

### 4. Настройка Entitlements

В RevenueCat Dashboard создайте entitlements:

1. **pro_access**
   - Attach products: `pro_monthly_subscription`
   - Features: `photo_documents`, `receipt_photos`, `pdf_export`, `unlimited_vehicles`, `unlimited_reminders`

2. **premium_access** (для будущего)
   - Attach products: `premium_monthly_subscription`
   - Features: `ai_assistant`, `trips`, `fuel_tracking`, etc.

### 5. Получение API ключей

1. В RevenueCat Dashboard перейдите в Project Settings
2. Скопируйте API ключи:
   - iOS: `appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Android: `goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## ⚠️ Устранение ошибок

### Ошибка: "Could not find app with bundle id uno.mygarage.app"

Эта ошибка означает, что RevenueCat не может найти приложение в App Store Connect.

**Решение**:
1. Убедитесь, что приложение создано в App Store Connect
2. Подключите App Store Connect к RevenueCat (см. раздел 2 выше)
3. Проверьте, что Bundle ID совпадает: `uno.mygarage.app`

**Подробная инструкция**: `REVENUECAT_APPSTORE_CONNECT_SETUP.md`

### Ошибка: "None of the products could be fetched"

**Решение**:
1. Убедитесь, что продукты созданы в App Store Connect
2. Проверьте, что продукты привязаны к приложению
3. Для тестирования на симуляторе используйте StoreKit Configuration

**Подробная инструкция**: `REVENUECAT_PRODUCTS_SETUP.md`

## Обновление конфигурации

### 1. Обновите API ключи в `.env` файле

Добавьте ключи RevenueCat в файл `mobile/.env`:

```bash
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_YOUR_REAL_IOS_API_KEY_HERE
EXPO_PUBLIC_REVENUECAT_API_KEY_GOOGLE=goog_YOUR_REAL_ANDROID_API_KEY_HERE
```

**Важно:**
- Используйте префикс `EXPO_PUBLIC_` для переменных окружения в Expo
- После изменения `.env` перезапустите Metro bundler с очисткой кэша: `npm run cache:clear && npm start`
- Никогда не коммитьте `.env` файл в Git (должен быть в `.gitignore`)

Ключи автоматически загружаются в `SubscriptionService` и `subscriptions.ts`.

### 2. Проверьте Product IDs

Убедитесь, что Product IDs совпадают с теми, что созданы в магазинах:

```typescript
PRODUCT_IDS: {
  pro_monthly: 'pro_monthly_subscription', // Должен совпадать с App Store/Google Play
  premium_monthly: 'premium_monthly_subscription'
}
```

## Тестирование

### 1. Sandbox тестирование (iOS)

1. Создайте тестовый аккаунт в App Store Connect
2. В настройках устройства добавьте тестовый аккаунт
3. Используйте тестовые карты для покупок

### 2. Test тестирование (Android)

1. Добавьте тестовые аккаунты в Google Play Console
2. Используйте тестовые карты для покупок

### 3. Проверка интеграции

```typescript
// Проверка инициализации
const isReady = SubscriptionService.isReady();

// Проверка доступных продуктов
const offerings = await SubscriptionService.getOfferings();

// Проверка текущей подписки
const subscription = await SubscriptionService.getCurrentSubscription();
```

## Производственное развертывание

### 1. Обновление API ключей

Замените тестовые ключи на продакшн ключи в конфигурации.

### 2. Проверка продуктов

Убедитесь, что все продукты активны в App Store Connect и Google Play Console.

### 3. Мониторинг

Настройте мониторинг в RevenueCat Dashboard:
- Отслеживание покупок
- Аналитика доходов
- Уведомления об ошибках

## Troubleshooting

### Частые проблемы

1. **"Product not available"**
   - Проверьте, что продукт активен в магазине
   - Убедитесь, что Product ID совпадает

2. **"API key invalid"**
   - Проверьте правильность API ключа
   - Убедитесь, что ключ соответствует платформе

3. **"Purchase failed"**
   - Проверьте настройки тестового аккаунта
   - Убедитесь, что приложение подписано

### Логирование

Включите детальное логирование для отладки:

```typescript
// В SubscriptionService.ts
console.log('RevenueCat initialized:', this.isInitialized);
console.log('Available offerings:', offerings);
console.log('Customer info:', customerInfo);
```

## Безопасность

### 1. Валидация на сервере

Всегда проверяйте покупки на сервере:

```php
// В Laravel контроллере
public function verifySubscription(Request $request) {
    $receiptData = $request->receipt_data;
    $transactionId = $request->transaction_id;
    
    // Валидация через RevenueCat webhook или Apple/Google API
    // ...
}
```

### 2. Защита API ключей

- Никогда не коммитьте API ключи в репозиторий
- Используйте переменные окружения
- Ротируйте ключи регулярно

## Дополнительные возможности

### 1. Webhooks

Настройте webhooks в RevenueCat для автоматической синхронизации:
- `INITIAL_PURCHASE`
- `RENEWAL`
- `CANCELLATION`

### 2. Аналитика

Интегрируйте с аналитикой:
- Firebase Analytics
- RevenueCat Analytics
- Custom events

### 3. A/B тестирование

Используйте RevenueCat для A/B тестирования цен и предложений.

## Поддержка

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [iOS In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [Android Billing Guide](https://developer.android.com/google/play/billing)

---

**Статус**: ✅ Готово к настройке  
**Следующий шаг**: Получить API ключи и обновить конфигурацию
