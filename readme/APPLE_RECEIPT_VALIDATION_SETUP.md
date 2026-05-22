# Настройка валидации Apple Receipt для App Store Review

## Проблема

Apple App Store Review требует, чтобы сервер валидировал receipt'ы от production-подписанного приложения, даже если они из sandbox окружения.

## Решение

Реализована валидация receipt'ов согласно рекомендациям Apple:
1. Сначала валидируем против production App Store
2. Если получаем ошибку 21007 (Sandbox receipt used in production), валидируем против sandbox

## Настройка

### 1. Получите Apple App Store Shared Secret

1. Войдите в [App Store Connect](https://appstoreconnect.apple.com)
2. Перейдите в **My Apps** → Ваше приложение
3. Перейдите в **App Information** → **App Store Connect API**
4. Найдите раздел **In-App Purchase Shared Secret**
5. Скопируйте **Shared Secret** (или создайте новый, если его нет)

### 2. Добавьте Shared Secret в .env

Добавьте в файл `backend/.env`:

```env
APPLE_SHARED_SECRET=your_shared_secret_here
```

**Важно:** 
- Shared Secret используется для валидации auto-renewable subscriptions
- Если у вас нет Shared Secret, можно оставить пустым (валидация будет работать, но без дополнительной защиты)

### 3. Проверка работы

После настройки:
1. Сервер будет автоматически валидировать все iOS receipt'ы
2. Сначала попробует production, затем sandbox (если нужно)
3. Логи валидации будут в `backend/storage/logs/laravel.log`

## Как это работает

### Backend (`AppleReceiptValidator.php`)

```php
// Сначала валидируем против production
$productionResult = $this->validateAgainstProduction($receiptData, $sharedSecret);

// Если получили ошибку 21007 (Sandbox receipt in production), валидируем против sandbox
if ($productionResult['status'] === 21007) {
    return $this->validateAgainstSandbox($receiptData, $sharedSecret);
}
```

### Frontend (`SubscriptionService.ts`)

RevenueCat автоматически предоставляет `latestReceipt` для iOS, который отправляется на сервер для валидации.

## Коды ошибок Apple Receipt Validation

- `0` - Receipt валиден
- `21007` - Sandbox receipt используется в production (нормально для review)
- `21008` - Production receipt используется в sandbox
- Другие коды - ошибки валидации

## Тестирование

1. **Sandbox тестирование:**
   - Используйте sandbox Apple ID
   - Receipt будет автоматически валидирован против sandbox после попытки production

2. **Production тестирование:**
   - После одобрения подписки в App Store
   - Receipt будет валидирован против production

## Логирование

Все операции валидации логируются в:
- `backend/storage/logs/laravel.log`

Ищите записи:
- `Apple receipt validation request`
- `Apple receipt validation response`
- `Apple receipt validated successfully`
- `Apple receipt validation failed`

## Troubleshooting

### Ошибка: "Receipt validation failed"

1. Проверьте, что `APPLE_SHARED_SECRET` установлен в `.env`
2. Проверьте логи в `backend/storage/logs/laravel.log`
3. Убедитесь, что RevenueCat отправляет `latestReceipt` для iOS

### Ошибка: "Sandbox receipt used in production"

Это нормально! Сервер автоматически переключится на sandbox валидацию.

### Receipt data не отправляется

Проверьте, что RevenueCat правильно настроен и предоставляет `latestReceipt` в `CustomerInfo`.

## Дополнительная информация

- [Apple Receipt Validation Guide](https://developer.apple.com/documentation/appstorereceipts/validating_receipts_with_the_app_store)
- [RevenueCat CustomerInfo Documentation](https://docs.revenuecat.com/docs/customer-info)

