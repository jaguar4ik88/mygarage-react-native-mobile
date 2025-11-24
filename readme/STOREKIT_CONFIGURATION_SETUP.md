# Настройка StoreKit Configuration для тестирования подписок

## ⚠️ Важно: Понимание проблемы

RevenueCat **все равно обращается к App Store Connect**, даже если используется StoreKit Configuration. StoreKit Configuration работает только для локального тестирования покупок, но RevenueCat SDK проверяет конфигурацию в App Store Connect.

**Основная проблема**: RevenueCat не может получить продукты из App Store Connect, потому что:
1. Продукты не созданы в App Store Connect
2. App Store Connect не подключен к RevenueCat
3. Product IDs не совпадают между RevenueCat Dashboard, App Store Connect и кодом

## ✅ Решение: Пошаговая настройка

### Шаг 1: Проверьте Product IDs

Убедитесь, что Product IDs совпадают во всех местах:

**В коде** (`mobile/src/services/SubscriptionService.ts`):
```typescript
const PRODUCT_IDS = {
  pro_monthly: 'pro_garage_monthly_subscription',
  premium_monthly: 'premium_garage_monthly_subscription'
};
```

**В RevenueCat Dashboard**:
- Products → Product ID должен быть: `pro_garage_monthly_subscription`
- Products → Product ID должен быть: `premium_garage_monthly_subscription`

**В App Store Connect**:
- Subscriptions → Product ID должен быть: `pro_garage_monthly_subscription`
- Subscriptions → Product ID должен быть: `premium_garage_monthly_subscription`

### Шаг 2: Создайте продукты в App Store Connect

1. Войдите в [App Store Connect](https://appstoreconnect.apple.com/)
2. Выберите ваше приложение `myGarage` (Bundle ID: `uno.mygarage.com` - проверьте в App Store Connect!)
3. Перейдите в **Subscriptions**
4. Если группы подписок нет, создайте **Subscription Group**:
   - Название: `myGarage Subscriptions`
5. Создайте подписку:
   - **Product ID**: `pro_garage_monthly_subscription`
   - **Reference Name**: `Pro Monthly Subscription`
   - **Duration**: 1 month
   - **Price**: $4.99
   - **Status**: Ready to Submit (или Active)
6. Повторите для Premium:
   - **Product ID**: `premium_garage_monthly_subscription`
   - **Reference Name**: `Premium Monthly Subscription`
   - **Duration**: 1 month
   - **Price**: $9.99
   - **Status**: Ready to Submit (или Active)

### Шаг 3: Подключите App Store Connect к RevenueCat

1. Войдите в [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Выберите проект и iOS приложение
3. Перейдите в **Apps** → **iOS App** → **App Store Connect**
4. Выберите способ подключения:

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

5. Проверьте подключение: статус должен быть "Connected"

### Шаг 4: Настройте продукты в RevenueCat Dashboard

1. В RevenueCat Dashboard перейдите в **Products**
2. Убедитесь, что продукты существуют:
   - `pro_garage_monthly_subscription`
   - `premium_garage_monthly_subscription`
3. Если продуктов нет, добавьте их вручную:
   - Product ID: `pro_garage_monthly_subscription`
   - Type: Subscription
   - App Store Product ID: `pro_garage_monthly_subscription`

### Шаг 5: Настройте Offerings в RevenueCat Dashboard

1. В RevenueCat Dashboard перейдите в **Offerings**
2. Создайте или обновите Offering (например, `default`):
   - Identifier: `default`
   - Display Name: `Default Offering`
3. Добавьте Package:
   - Identifier: `pro_monthly` (или `$rc_monthly`)
   - Product: `pro_garage_monthly_subscription`
   - Type: Monthly

### Шаг 6: Настройте Entitlements в RevenueCat Dashboard

1. В RevenueCat Dashboard перейдите в **Entitlements**
2. Убедитесь, что существуют:
   - `pro_access` → привязан к `pro_garage_monthly_subscription`
   - `premium_access` → привязан к `premium_garage_monthly_subscription`

### Шаг 7: Подключите StoreKit Configuration файл (для тестирования на симуляторе)

1. Откройте проект в Xcode:
   ```bash
   cd mobile/ios
   open myGarage.xcworkspace
   ```

2. Добавьте StoreKit Configuration файл в проект:
   - В Xcode: File → Add Files to "myGarage"...
   - Выберите файл `mobile/ios/Products.storekit`
   - Убедитесь, что "Copy items if needed" НЕ отмечено (файл уже в проекте)
   - Нажмите "Add"

3. Настройте Scheme для использования StoreKit Configuration:
   - Product → Scheme → Edit Scheme (⌘<)
   - Run → Options
   - StoreKit Configuration → выберите `Products.storekit`
   - Нажмите "Close"

4. Перезапустите приложение в симуляторе

### Шаг 8: Проверьте API ключи в .env

Убедитесь, что в `mobile/.env` указаны правильные ключи:

```env
# Для тестирования (если используете тестовый проект RevenueCat)
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=test_iwkVPgAlPCmUSlEOMjaRjtUPuLa
EXPO_PUBLIC_REVENUECAT_API_KEY_GOOGLE=test_iwkVPgAlPCmUSlEOMjaRjtUPuLa

# Для продакшена (замените на реальные ключи)
# EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_YOUR_REAL_IOS_API_KEY_HERE
# EXPO_PUBLIC_REVENUECAT_API_KEY_GOOGLE=goog_YOUR_REAL_ANDROID_API_KEY_HERE
```

**Важно**: После изменения `.env` перезапустите Metro bundler с очисткой кэша:
```bash
cd mobile
npm start -- --reset-cache
```

## 🔍 Проверка работы

После настройки проверьте логи в консоли:

1. **Инициализация RevenueCat**:
   ```
   ✅ RevenueCat initialized successfully
   ```

2. **Загрузка Offerings**:
   ```
   ✅ Offerings loaded successfully
   📦 RevenueCat Offerings Response:
      Current offering: default
      All offerings count: 1
      Package 1: pro_monthly (Product: pro_garage_monthly_subscription)
   ```

3. **Если видите ошибки**:
   - Проверьте, что продукты созданы в App Store Connect
   - Проверьте, что App Store Connect подключен к RevenueCat
   - Проверьте, что Product IDs совпадают везде
   - Подождите 5-10 минут после создания продуктов (синхронизация не мгновенная)

## 🚨 Частые проблемы

### Ошибка: "None of the products could be fetched"

**Причины**:
1. Продукты не созданы в App Store Connect
2. App Store Connect не подключен к RevenueCat
3. Product IDs не совпадают

**Решение**:
1. Создайте продукты в App Store Connect (см. Шаг 2)
2. Подключите App Store Connect к RevenueCat (см. Шаг 3)
3. Проверьте Product IDs (см. Шаг 1)

### Ошибка: "Configuration error"

**Причины**:
1. RevenueCat не может найти приложение в App Store Connect
2. Bundle ID не совпадает

**Решение**:
1. Убедитесь, что Bundle ID в RevenueCat Dashboard: `uno.mygarage.com`
2. Убедитесь, что Bundle ID в App Store Connect: `uno.mygarage.com`
3. Убедитесь, что Bundle ID в `app.json`: `uno.mygarage.com`

### StoreKit Configuration не работает

**Причины**:
1. Файл не добавлен в Xcode проект
2. Scheme не настроен для использования StoreKit Configuration

**Решение**:
1. Добавьте файл в Xcode проект (см. Шаг 7)
2. Настройте Scheme (см. Шаг 7)

## 📚 Дополнительные ресурсы

- [RevenueCat: Why are offerings empty?](https://rev.cat/why-are-offerings-empty)
- [App Store Connect: Create Subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions)
- [StoreKit Configuration File Format](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)

---

**Статус**: ✅ StoreKit Configuration файл создан  
**Следующий шаг**: Подключите файл в Xcode и проверьте конфигурацию RevenueCat

