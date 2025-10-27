# План реализации системы подписок myGarage

## Обзор системы подписок

### Уровни подписок

1. **FREE** (текущий) - бесплатно
   - Управление автомобилями (1 авто)
   - Базовые напоминания о ТО (до 5 напоминаний)
   - Поиск ближайших СТО
   - Советы
   - Профиль и настройки
   - Рекомендации по модели
   - Статистика по тратам
   - История трат

2. **PRO** - 5$ в месяц (РЕАЛИЗОВАТЬ)
   - Все из FREE
   - Фото документов (страховка, доверенность, сертификаты) - локальное хранение
   - Фото чеков при добавлении трат
   - Экспорт данных отчетов о тратах в PDF
   - До 3 автомобилей
   - Неограниченные напоминания
   - Напоминания о добавлении трат (3 раза в неделю)

3. **PREMIUM** - в разработке (ТОЛЬКО ПОКАЗАТЬ)
   - До 3 автомобилей
   - AI помощник
   - Функционал поездки
   - Учет заправок - полный функционал
   - Учет пробега - ежедневный ввод
   - Умные напоминания - по пробегу + дате
   - Облачное хранилище

---

## Этап 1: Backend - База данных и модели

### 1.1 Создание миграций

⚠️ **ВАЖНО**: Все новые поля делаем `nullable()`, база рабочая!

- [ ] **Таблица `subscriptions`** - справочник типов подписок
  - `id` - primary key
  - `name` - название (free, pro, premium)
  - `display_name` - отображаемое название
  - `price` - цена в центах
  - `duration_days` - длительность в днях (30 для месячной)
  - `features` - JSON с доступными функциями
  - `max_vehicles` - макс. количество авто
  - `max_reminders` - макс. напоминаний (null = безлимит)
  - `is_active` - активна ли подписка
  - `created_at`, `updated_at`

- [ ] **Таблица `user_subscriptions`** - история подписок пользователей
  - `id` - primary key
  - `user_id` - foreign key to users
  - `subscription_id` - foreign key to subscriptions
  - `starts_at` - дата начала
  - `expires_at` - дата окончания
  - `is_active` - активна ли
  - `platform` - платформа покупки (ios/android) - nullable
  - `transaction_id` - ID транзакции из магазина - nullable
  - `original_transaction_id` - оригинальный ID - nullable
  - `receipt_data` - данные чека (зашифрованные) - nullable, text
  - `cancelled_at` - дата отмены - nullable
  - `created_at`, `updated_at`

- [ ] **Таблица `vehicle_documents`** - документы для автомобилей (PRO)
  - `id` - primary key
  - `vehicle_id` - foreign key to vehicles
  - `user_id` - foreign key to users
  - `type` - тип документа (insurance, power_of_attorney, certificate, other)
  - `name` - название документа
  - `file_path` - путь к файлу на сервере
  - `file_name` - оригинальное имя файла
  - `file_size` - размер файла в байтах - nullable
  - `mime_type` - MIME тип - nullable
  - `expiry_date` - дата истечения - nullable
  - `notes` - заметки - nullable, text
  - `created_at`, `updated_at`

- [ ] **Добавить поле в `expenses_history`** - чеки для трат (PRO)
  - `receipt_photo` - путь к фото чека - nullable

- [ ] **Обновить таблицу `users`** (уже есть plan_type и subscription_expires_at!)
  - ✅ `plan_type` - уже есть (free/pro/premium)
  - ✅ `subscription_expires_at` - уже есть
  - [ ] `platform` - платформа подписки (ios/android) - nullable
  - [ ] `transaction_id` - последний ID транзакции - nullable
  - [ ] `reminder_expenses_enabled` - напоминания о тратах - nullable, default false

### 1.2 Создание моделей

- [ ] **Model: Subscription**
  - Relationships: hasMany(UserSubscription)
  - Scopes: active()
  - Methods: getFeatures()

- [ ] **Model: UserSubscription**
  - Relationships: belongsTo(User), belongsTo(Subscription)
  - Scopes: active(), expired()
  - Methods: isActive(), canAccess($feature), renew(), cancel()

- [ ] **Model: VehicleDocument**
  - Relationships: belongsTo(Vehicle), belongsTo(User)
  - Methods: getFileUrl()

- [ ] **Обновить Model: Expense (expenses_history)**
  - Добавить accessor для receipt_photo
  - Methods: getReceiptUrl(), hasReceipt()

### 1.3 Seeders

- [ ] **SubscriptionSeeder**
  - Создать FREE подписку
  - Создать PRO подписку ($5/месяц)
  - Создать PREMIUM подписку (неактивная)

- [ ] **Назначить всем существующим пользователям FREE подписку**

---

## Этап 2: Backend - API endpoints

### 2.1 Контроллер SubscriptionController

- [ ] `GET /api/subscriptions` - список всех доступных подписок
- [ ] `GET /api/user/subscription` - текущая подписка пользователя
- [ ] `POST /api/user/subscription/verify` - верификация покупки (iOS/Android receipt)
- [ ] `POST /api/user/subscription/cancel` - отмена подписки
- [ ] `GET /api/user/subscription/features` - доступные функции

### 2.2 Middleware для проверки подписки

- [ ] **Middleware: CheckSubscription**
  - Проверяет, имеет ли пользователь доступ к функции
  - Использование: `->middleware('subscription:pro')`

### 2.3 Обновить существующие контроллеры

- [ ] **VehicleController** - проверка лимита автомобилей
  - FREE: максимум 1 авто
  - PRO/PREMIUM: максимум 3 авто

- [ ] **ReminderController** - проверка лимита напоминаний
  - FREE: максимум 5 напоминаний
  - PRO/PREMIUM: неограниченно

### 2.4 Новые контроллеры для PRO функций

- [ ] **VehicleDocumentController**
  - `GET /api/vehicles/{id}/documents` - список документов авто
  - `POST /api/vehicles/{id}/documents` - добавить документ (multipart/form-data)
  - `PUT /api/vehicles/documents/{id}` - обновить документ
  - `DELETE /api/vehicles/documents/{id}` - удалить документ
  - `GET /api/vehicles/documents/{id}/download` - скачать файл документа

- [ ] **Обновить ExpenseController** - добавить работу с чеками
  - `POST /api/expenses` - добавить поддержку загрузки чека (multipart/form-data)
  - `PUT /api/expenses/{id}` - добавить поддержку обновления чека
  - `GET /api/expenses/{id}/receipt` - получить чек
  - `DELETE /api/expenses/{id}/receipt` - удалить чек

- [ ] **ReportController**
  - `POST /api/reports/expenses/pdf` - экспорт отчета в PDF

---

## Этап 3: Mobile - Интеграция платежей

### 3.1 Установка зависимостей

- [ ] Установить `react-native-purchases` (RevenueCat) для управления подписками
- [ ] Настроить RevenueCat аккаунт
- [ ] Создать продукты в App Store Connect и Google Play Console

### 3.2 Конфигурация

- [ ] Создать файл `src/config/subscriptions.ts`
  - Константы для subscription IDs
  - Mapping функций к подпискам

- [ ] Настроить entitlements в RevenueCat
  - `pro_access`
  - `premium_access`

### 3.3 Сервис для работы с подписками

- [ ] **src/services/SubscriptionService.ts**
  - `initialize()` - инициализация RevenueCat
  - `getOfferings()` - получить доступные подписки
  - `purchasePackage()` - купить подписку
  - `restorePurchases()` - восстановить покупки
  - `getCurrentSubscription()` - текущая подписка
  - `checkAccess(feature)` - проверка доступа к функции
  - `syncWithBackend()` - синхронизация с бэкендом

---

## Этап 4: Mobile - UI/UX

### 4.1 Экран выбора подписки

- [ ] **src/screens/SubscriptionScreen.tsx**
  - Отображение всех трех уровней
  - Список функций каждого уровня
  - Кнопки "Выбрать" / "Текущий план"
  - PREMIUM - кнопка "Скоро" (недоступна)
  - Кнопка "Восстановить покупки"
  - Ссылки на Terms of Service и Privacy Policy

### 4.2 Компонент карточки подписки

- [ ] **src/components/SubscriptionCard.tsx**
  - Название подписки
  - Цена
  - Список функций
  - Кнопка действия
  - Индикатор текущего плана

### 4.3 Paywall компонент

- [ ] **src/components/Paywall.tsx**
  - Модальное окно для функций PRO
  - Объяснение, почему нужна подписка
  - Кнопка "Upgrade to PRO"

### 4.4 Обновление навигации

- [ ] Добавить кнопку "Подписка" в настройки
- [ ] Добавить badge "PRO" на главном экране для PRO пользователей

---

## Этап 5: Mobile - Реализация PRO функций

### 5.1 Фото документов для автомобилей

- [ ] **src/screens/VehicleDocumentsScreen.tsx**
  - Список документов автомобиля
  - Кнопка добавить документ
  - Просмотр документа
  - Удаление документа
  - Проверка подписки (PRO required)

- [ ] **src/components/DocumentCard.tsx**
  - Миниатюра фото
  - Название документа
  - Тип документа
  - Дата истечения (если есть)

- [ ] Интеграция с камерой / галереей
  - Использовать `expo-image-picker`
  - Сохранение в локальное хранилище
  - Сжатие изображений

### 5.2 Фото чеков для трат

- [ ] **Обновить AddExpenseScreen / EditExpenseScreen**
  - Добавить возможность прикрепить фото чека
  - Показать прикрепленные чеки
  - Удалить чек
  - Проверка подписки (PRO required)

- [ ] **src/components/ReceiptImage.tsx**
  - Отображение чека
  - Полноэкранный просмотр

### 5.3 Экспорт в PDF

- [ ] **src/services/PDFService.ts**
  - Генерация PDF отчета о тратах
  - Использовать `react-native-html-to-pdf` или `react-native-pdf`
  - Форматирование данных
  - Сохранение / шаринг PDF

- [ ] **Добавить кнопку экспорта на экран статистики**
  - Проверка подписки (PRO required)
  - Выбор периода для экспорта
  - Прогресс-индикатор

### 5.4 Увеличение лимитов

- [ ] **Обновить логику добавления автомобилей**
  - FREE: показать Paywall при попытке добавить 2-й автомобиль
  - PRO: разрешить до 3 автомобилей

- [ ] **Обновить логику добавления напоминаний**
  - FREE: показать Paywall при попытке добавить 6-е напоминание
  - PRO: без ограничений

### 5.5 Напоминания о добавлении трат

- [ ] **src/services/ExpenseReminderService.ts**
  - Настройка локальных уведомлений
  - 3 раза в неделю (например, вт, чт, сб в 18:00)
  - Проверка подписки (PRO required)
  - Включение/выключение в настройках

---

## Этап 6: Логика ограничений и проверок

### 6.1 Создать утилиту для проверки функций

- [ ] **src/utils/subscriptionUtils.ts**
  - `canAddVehicle(currentCount, subscription)` - можно ли добавить авто
  - `canAddReminder(currentCount, subscription)` - можно ли добавить напоминание
  - `canAccessDocuments(subscription)` - доступ к документам
  - `canAccessReceipts(subscription)` - доступ к чекам
  - `canExportPDF(subscription)` - доступ к экспорту
  - `getMaxVehicles(subscription)` - макс. количество авто
  - `getMaxReminders(subscription)` - макс. количество напоминаний

### 6.2 Обновить экраны с проверками

- [ ] VehiclesScreen - проверка лимита при добавлении
- [ ] RemindersScreen - проверка лимита при добавлении
- [ ] AddExpenseScreen - проверка доступа к чекам
- [ ] StatisticsScreen - проверка доступа к экспорту

---

## Этап 7: Настройки и управление подпиской

### 7.1 Экран управления подпиской

- [ ] **src/screens/ManageSubscriptionScreen.tsx**
  - Текущий план
  - Дата окончания (если PRO)
  - Кнопка "Upgrade" (если FREE)
  - Кнопка "Отменить подписку" (если PRO)
  - Кнопка "Восстановить покупки"
  - История покупок

### 7.2 Добавить в настройки

- [ ] Секция "Подписка"
  - Текущий план
  - Управление подпиской
  - Восстановить покупки

---

## Этап 8: Тестирование

### 8.1 Backend тесты

- [ ] Тесты для SubscriptionController
- [ ] Тесты для Middleware проверки подписки
- [ ] Тесты для VehicleDocumentController
- [ ] Тесты для ExpenseReceiptController
- [ ] Тесты для PDF генерации

### 8.2 Mobile тесты

- [ ] Тест покупки подписки (sandbox)
- [ ] Тест восстановления покупок
- [ ] Тест проверки ограничений
- [ ] Тест Paywall модалок
- [ ] Тест работы с документами
- [ ] Тест работы с чеками
- [ ] Тест экспорта в PDF

### 8.3 E2E сценарии

- [ ] Free user пытается добавить 2-й автомобиль
- [ ] Free user пытается добавить 6-е напоминание
- [ ] Free user покупает PRO
- [ ] PRO user добавляет документы
- [ ] PRO user экспортирует отчет
- [ ] PRO user отменяет подписку

---

## Этап 9: Подготовка к релизу

### 9.1 App Store & Google Play

- [ ] Создать in-app products
  - iOS: в App Store Connect
  - Android: в Google Play Console
- [ ] Настроить цены ($4.99)
- [ ] Добавить screenshots с PRO функциями
- [ ] Обновить описание приложения

### 9.2 Документация

- [ ] Создать USER_SUBSCRIPTION_GUIDE.md
- [ ] Добавить FAQ по подпискам
- [ ] Terms of Service для подписок
- [ ] Privacy Policy обновление

### 9.3 Мониторинг

- [ ] Настроить аналитику для отслеживания
  - Просмотры экрана подписок
  - Попытки покупки
  - Успешные покупки
  - Отмены подписок
  - Использование PRO функций

---

## Технический стек

### Backend
- Laravel 12
- SQLite база данных
- Sanctum для аутентификации
- DomPDF / Snappy для генерации PDF

### Mobile
- React Native
- RevenueCat для управления подписками
- expo-image-picker для фото
- react-native-html-to-pdf для PDF
- AsyncStorage для локального хранения

---

## Приоритеты реализации

### Фаза 1 (MVP подписок)
1. Backend: миграции и модели
2. Backend: API для подписок
3. Mobile: интеграция RevenueCat
4. Mobile: экран выбора подписки
5. Mobile: проверки ограничений для авто и напоминаний

### Фаза 2 (PRO функции - документы)
1. Backend: API для документов и чеков
2. Mobile: экран документов автомобиля
3. Mobile: добавление чеков к тратам

### Фаза 3 (PRO функции - экспорт и напоминания)
1. Backend: генерация PDF
2. Mobile: экспорт отчетов
3. Mobile: напоминания о добавлении трат

### Фаза 4 (Полировка)
1. Тестирование всех сценариев
2. Улучшение UI/UX
3. Подготовка к релизу

---

## Важные уточнения и примечания

### Хранение файлов (УТОЧНИТЬ С ПОЛЬЗОВАТЕЛЕМ!)

**Рекомендуемый подход (Гибрид):**
- 📤 Файлы загружаются на сервер в `storage/app/documents` и `storage/app/receipts`
- 💾 Мобилка кеширует загруженные фото локально для офлайн-доступа
- ✅ Плюсы: не теряются при переустановке, доступны с разных устройств
- ✅ Безопасность: файлы привязаны к user_id, доступ только через API с токеном

**Альтернатива (Полностью локально):**
- 📱 Использовать `expo-file-system` - сохранять в документах приложения
- ❌ Минус: потеряются при удалении приложения
- ❌ Минус: нет синхронизации между устройствами

### Другие примечания

- PREMIUM функции пока только показываем в UI, но делаем неактивными
- Цена PRO подписки: $4.99/месяц (RevenueCat может округлить)
- Нужно обработать случаи восстановления покупок после переустановки
- Синхронизация состояния подписки между устройством и сервером
- В таблице `users` уже есть `plan_type` и `subscription_expires_at` - используем их!
- ⚠️ Все миграции делать с `nullable()` - база рабочая!
- Чеки хранятся прямо в таблице `expenses_history` (поле `receipt_photo`)

