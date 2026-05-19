# READY_TO_SUBMIT статус продукта

## Проблема:

Продукт имеет статус `READY_TO_SUBMIT` - он готов, но не подтвержден Apple.

## На симуляторе:

RevenueCat **все равно обращается к App Store Connect**, даже если используется StoreKit Configuration. StoreKit Configuration работает только для локального тестирования покупок, но RevenueCat SDK проверяет конфигурацию в App Store Connect.

## Решения:

### Вариант 1: Подтвердить продукт в App Store Connect

1. **App Store Connect** → **Subscriptions** → **pro_monthly_subscription**
2. Нажми **"Submit for Review"** или **"Save"**
3. После одобрения Apple статус станет **"Approved"**
4. Подождите 5-10 минут после сохранения
5. RevenueCat сможет получить продукты

### Вариант 2: Использовать реальное устройство

На реальном устройстве с Sandbox подписки работают даже со статусом `READY_TO_SUBMIT`:

1. Собери для устройства: `npm run ios:device`
2. Создай Sandbox аккаунт в App Store Connect
3. Выйди из App Store на устройстве
4. При покупке введи Sandbox email

## Важно:

**StoreKit Configuration** на симуляторе работает только для локального тестирования покупок (без RevenueCat), но **RevenueCat SDK все равно проверяет App Store Connect** для получения продуктов и конфигурации.

**Для полного тестирования RevenueCat на симуляторе** - продукт должен быть подтвержден в App Store Connect (статус "Approved").

