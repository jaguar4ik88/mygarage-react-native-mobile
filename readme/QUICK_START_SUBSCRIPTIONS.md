# 🚀 Быстрый старт - Система подписок

## ✅ Всё готово к использованию!

### Backend полностью работает
### Mobile UI готов (тестовый режим покупок)

---

## 📱 Что доступно в приложении

### 1. Экран подписок
- **Путь:** Профиль → Подписка
- **Показывает:** FREE, PRO ($4.99/мес), PREMIUM (скоро)
- **Функции:** Покупка (тестовая), восстановление покупок

### 2. Ограничения FREE плана
- **При добавлении 2-го авто** → Появится Paywall с предложением PRO
- **При добавлении 6-го напоминания** → Появится Paywall

### 3. PRO функции

#### 📄 Документы автомобиля
- **Путь:** Главная → Выбрать авто → Документы
- **Можно добавить:**
  - Страховка
  - Доверенность  
  - Сертификаты
  - Другие документы
- **Формат:** jpg, jpeg, png, pdf (до 10MB)
- **Где хранится:** На сервере в `storage/app/documents/`

#### 🧾 Фото чеков для трат
- **Путь:** История → Добавить трату
- **В форме:**
  - Кнопка "Камера" - сделать фото чека
  - Кнопка "Галерея" - выбрать из галереи
  - Превью фото перед сохранением
- **Формат:** jpg, jpeg, png (до 10MB)
- **Где хранится:** На сервере в `storage/app/receipts/`

---

## 🧪 Как протестировать

### Тестовая покупка PRO

1. Откройте приложение
2. Перейдите в Профиль → Подписка
3. Нажмите "Выбрать" на карточке PRO
4. Подтвердите покупку
5. ✅ Подписка активируется (тестовый режим)

**После активации PRO:**
- Можно добавить до 3 автомобилей
- Безлимит напоминаний
- Доступна кнопка "Документы" в деталях авто
- При добавлении траты видна секция "Фото чека"

### Проверка лимитов FREE

1. Создайте новый аккаунт или отмените PRO
2. Попробуйте добавить 2-й автомобиль → Paywall
3. Создайте 5 напоминаний, попробуйте 6-е → Paywall
4. Откройте детали авто, нажмите "Документы" → Предложение PRO

---

## 🔧 Админ-панель

### Управление подписками
**URL:** https://mygarage.uno/admin/subscriptions

**Возможности:**
- ✅ Просмотр всех подписок
- ✅ Создание новой подписки
- ✅ Редактирование (цена, лимиты, функции)
- ✅ Деактивация подписки
- ✅ Статистика активных подписок

---

## 🛠️ Техническая информация

### API методы (Mobile)

```typescript
// Получить список подписок
const subscriptions = await ApiService.getSubscriptions();

// Текущая подписка пользователя
const current = await ApiService.getCurrentSubscription();
// Вернет: { plan_type, is_pro, max_vehicles, max_reminders, ... }

// Проверка доступа к функциям
const features = await ApiService.getSubscriptionFeatures();

// Тестовая покупка
await ApiService.verifySubscription({
  platform: 'ios',
  transaction_id: 'test_123',
  subscription_type: 'pro'
});

// Документы
const docs = await ApiService.getVehicleDocuments(vehicleId);
await ApiService.uploadVehicleDocument(vehicleId, formData);
await ApiService.deleteVehicleDocument(docId);

// Траты с чеками
await ApiService.addServiceRecord(recordData, receiptPhoto);
```

### Backend методы (User model)

```php
// Проверка PRO статуса
$user->isPro(); // true/false

// Проверка лимитов
$user->canAddVehicle(); // true/false
$user->canAddReminder(); // true/false

// Получить лимиты
$user->getMaxVehicles(); // 1 для FREE, 3 для PRO
$user->getMaxReminders(); // 5 для FREE, null для PRO
```

---

## ⚠️ Важные замечания

### Текущий режим - ТЕСТОВЫЙ
- Покупки НЕ проходят через App Store / Google Play
- Используется тестовая верификация на сервере
- Для production нужна интеграция с RevenueCat

### Что нужно для production

1. **Настроить RevenueCat:**
   ```bash
   npm install react-native-purchases
   ```

2. **Создать in-app products:**
   - App Store Connect: `mygarage_pro_monthly` ($4.99)
   - Google Play Console: `mygarage_pro_monthly` ($4.99)

3. **Заменить тестовую покупку:**
   - В `SubscriptionScreen.tsx` заменить `processPurchase` на RevenueCat
   - Добавить верификацию receipt на сервере

4. **Добавить Terms of Service и Privacy Policy**

---

## 📚 Дополнительно

### Как добавить новую функцию в PRO

1. **Backend:** Добавить в seeder features массив
2. **Backend:** Использовать `$user->isPro()` для проверки
3. **Mobile:** Добавить в `getFeatureText()` в SubscriptionScreen
4. **Mobile:** Показать Paywall при попытке использования

### Как изменить цену

1. **Backend:** Обновить в админке или через seeder
2. **App Store/Google Play:** Изменить цену продукта
3. **Mobile:** SubscriptionScreen автоматически подтянет новую цену

---

## 🎉 Готово!

Система подписок полностью функциональна и готова к использованию!

**Следующий шаг:** Интеграция RevenueCat для реальных платежей 💰

Или можно продолжать использовать в тестовом режиме для разработки других функций.

