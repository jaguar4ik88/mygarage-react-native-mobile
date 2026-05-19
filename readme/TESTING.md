1. Ручное тестирование
Потоки входа и роли

 Welcome → регистрация / вход.

 Welcome → «Продолжить как гость».

 Гость: действия, требующие аккаунта, ведут к Login Prompt (глобальный модал из AppNavigator).
Экраны (навигация)
Экран	Как попасть
Welcome
Старт без сессии
Auth
Вход / регистрация
ForgotPassword
С экрана авторизации
Home (вкладка)
После входа / гостя
Advice (вкладка)
Советы
History (вкладка)
Журнал трат
Actions (вкладка)
Сетка действий
Profile
Иконка пользователя на Home
AddCar
Добавить авто
VehicleDetail
Карточка авто с Home
Reminders
Из Actions / уведомлений / VehicleDetail
STO
Из Actions
Reports
Статистика из Actions
DocumentsHub
Документы из Actions
VehicleDocuments
Документы конкретного авто (с VehicleDetail, PRO)
Recommendations
Из Actions / VehicleDetail
Export
PDF из Actions / Reports (см. ограничения ниже)
Subscription
Профиль, paywall, кнопки апгрейда
Файлы AddReminderScreen.tsx и ManualScreen.tsx в проекте есть, но в RootStackParamList не зарегистрированы — в текущей навигации их нет.

Модалки и оверлеи (что открывается и где)
Модалка / компонент	Где вызывается
LoginPromptModal
Глобально: гость + «добавить авто» из AppNavigator; через promptToLogin() (история, напоминания и т.д.).
Paywall
Глобально: лимит авто при добавлении; AddCarScreen (ошибка API лимита); VehicleDetailScreen (документы без PRO); ProfileScreen (кнопки подписки → subscriptionOpen). Внутри — react-native-modal + вложенные Modal с Privacy/Terms.
ExpenseModal (+ второй Modal превью фото)
HistoryScreen — добавление/редактирование траты.
Modal просмотра записи
HistoryScreen — деталь записи.
ReminderModal
RemindersScreen.
STOModal
STOScreen.
DocumentModal
DocumentsHubScreen, VehicleDocumentsScreen.
Modal просмотра документа (WebView / превью)
DocumentsHubScreen, VehicleDocumentsScreen.
ProfileEditModal (+ ModalPicker валюты)
ProfileScreen.
Modal About / FAQ / Privacy / Terms (pageSheet)
ProfileScreen.
Modal Privacy / Terms
SubscriptionScreen.
Modal (iOS дата)
DateInput; AddReminderScreen (если экран когда-то подключат).
react-native-modal
AddCarScreen (уточняющий сценарий в коде).
Компонент FeatureGate сейчас нигде не импортируется — через него тестировать нечего.

Подписки и лимиты (фактическое поведение в коде)
Пробелов в UX (важно для теста): экран Export генерирует PDF без проверки plan_type, тогда как вход с Actions и Reports для PRO-фич отфильтрован. Проверьте оба пути: с карточки «Экспорт PDF» и при прямом открытии Export (если есть диплинк/тест-хак).

FREE (plan_type === 'free' или не задан):

До 1 автомобиля (клиент + при добавлении второго — Paywall pro; ответ API upgrade_required / limit_reached на AddCar тоже открывает paywall).
По конфигу до 5 напоминаний (subscriptions.ts); в RemindersScreen отдельной клиентской проверки лимита нет — упор на API/403.
Фото чека в трате: в ExpenseModal блок для не-PRO (isPro = pro или premium).
PDF из журнала (HistoryScreen): проверка PRO перед экспортом.
Документы авто / хаб документов: VehicleDetail → без PRO показывается Paywall; Actions → документы — алерт PRO; загрузка списка может вернуть subscription-ошибку.
Reports: кнопка/переход к экспорту PDF завязаны на PRO (canExportPdf).
PRO (pro):

До 3 автомобилей; 4-й — в коде предлагается premium paywall (AppNavigator).
PRO-фичи из SubscriptionService.checkAccess: фото документов/чеков, PDF (логика сервиса), расширенные напоминания и т.д. — в UI часть проверок просто «pro ИЛИ premium».
PREMIUM (premium):

В SubscriptionService.checkAccess отдельно помечены только premium: ai_assistant, trips, fuel_tracking, mileage_tracking, smart_reminders, cloud_storage — в интерфейсе многие из них помечены «Скоро» (Actions), не как рабочие экраны.
При ≥3 машинах на premium в handleAddCar показывается Alert о лимите (не paywall) — имеет смысл явно прогнать.
RevenueCat / бэкенд: синхронизация плана с user.plan_type; после покупки/restore — обновление профиля и повтор сценариев.

**Если Sandbox-покупка прошла, а `customerInfo.entitlements.active` пустой:** в RevenueCat каждый **App Store / Play продукт** должен быть привязан к **Entitlement** с идентификатором **`pro_access`** или **`premium_access`** (как в коде `SubscriptionService`). Иначе SDK не отдаёт права клиенту, хотя транзакция в Store уже есть — приложение может синхронизировать план с бэкендом по fallback `activeSubscriptions`, но в Dashboard связку всё равно нужно настроить.

### Диагностические логи (dev)

Подробный вывод **по умолчанию выключен**. В `.env` при отладке:

- `EXPO_PUBLIC_DEBUG_API=1` — сетевые проверки, URL, заголовки (`services/api.ts`).
- `EXPO_PUBLIC_DEBUG_SUBSCRIPTIONS=1` — RevenueCat: офферы, покупка, синк с бэкендом (`services/SubscriptionService.ts`).

В production `__DEV__` = false, флаги не действуют.

**Про дубликаты в консоли (RevenueCat):** раньше в `getOfferings` ошибочно вызывался `Purchases.getOfferings()` в начале метода только ради логов — второй такой же дамп после основного блока. Это исправлено: один запрос SDK на один вызов `getOfferings`. Две параллельные дорожки загрузки цен для **pro** и **premium** в `SubscriptionScreen` вызывают `getProductForSubscription` дважды и тем самым дважды могут попасть в `getOfferings` — это ожидаемо для двух продуктов; при нужде позже можно ввести кэш офферов на короткий TTL.