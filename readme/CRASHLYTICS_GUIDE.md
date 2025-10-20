# Firebase Crashlytics Integration Guide

## 🎯 Что это?

Firebase Crashlytics - это мощный инструмент для отслеживания ошибок и крашей в реальном времени. Все ошибки автоматически логируются в Firebase Console.

## 📦 Установка

Пакет уже установлен:
```json
"@react-native-firebase/crashlytics": "23.3.1"
```

## 🚀 Использование

### Автоматическое логирование

Система уже настроена для автоматического логирования:

1. **Все неперехваченные ошибки** автоматически отправляются в Firebase
2. **ErrorBoundary** ловит ошибки React компонентов
3. **API ошибки** автоматически логируются при сбое запросов
4. **Promise rejection** автоматически отлавливаются

### Ручное логирование ошибок

#### 1. Простое логирование ошибки

```typescript
import CrashlyticsService from './services/crashlyticsService';

try {
  // ваш код
  throw new Error('Что-то пошло не так');
} catch (error) {
  CrashlyticsService.recordError(error, 'Контекст ошибки');
}
```

#### 2. Логирование с дополнительным контекстом

```typescript
// Установить атрибуты для контекста
await CrashlyticsService.setAttribute('screen_name', 'HomeScreen');
await CrashlyticsService.setAttribute('action', 'add_vehicle');

// Логировать ошибку с контекстом
CrashlyticsService.recordError(error, 'Ошибка добавления авто');
```

#### 3. Специализированные методы логирования

```typescript
// API ошибки
CrashlyticsService.logApiError('/api/vehicles', 500, error);

// Ошибки экранов
CrashlyticsService.logScreenError('HomeScreen', error);

// Ошибки аутентификации
CrashlyticsService.logAuthError('login_failed', error);
```

#### 4. Логирование сообщений (breadcrumbs)

```typescript
// Добавить breadcrumb для отслеживания пути пользователя
CrashlyticsService.log('User opened vehicle details');
CrashlyticsService.log('User clicked add reminder button');
```

#### 5. Установка User ID

```typescript
// Устанавливается автоматически при логине
// Но можно установить вручную:
await CrashlyticsService.setUserId(user.id);
```

#### 6. Установка множественных атрибутов

```typescript
await CrashlyticsService.setAttributes({
  'user_plan': 'premium',
  'app_version': '1.5.0',
  'platform': Platform.OS,
});
```

## 📱 Примеры использования в коде

### В компонентах

```typescript
// HomeScreen.tsx
import CrashlyticsService from '../services/crashlyticsService';

const HomeScreen = () => {
  const loadVehicles = async () => {
    try {
      CrashlyticsService.log('Loading vehicles started');
      const vehicles = await ApiService.getVehicles();
      CrashlyticsService.log('Vehicles loaded successfully');
    } catch (error) {
      CrashlyticsService.logScreenError('HomeScreen', error);
      Alert.alert('Ошибка', 'Не удалось загрузить автомобили');
    }
  };
};
```

### В сервисах

```typescript
// api.ts (уже интегрировано)
try {
  const response = await fetch(url);
} catch (error) {
  CrashlyticsService.logApiError(endpoint, 0, error);
  throw error;
}
```

### В обработчиках событий

```typescript
const handleDeleteVehicle = async (vehicleId: number) => {
  try {
    await ApiService.deleteVehicle(vehicleId);
  } catch (error) {
    CrashlyticsService.setAttribute('vehicle_id', String(vehicleId));
    CrashlyticsService.recordError(error, 'Delete vehicle failed');
  }
};
```

## 🔍 Просмотр ошибок в Firebase Console

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект **MyGarage**
3. Перейдите в **Crashlytics** в левом меню
4. Вы увидите:
   - **Dashboard** - обзор всех ошибок
   - **Errors** - список всех ошибок
   - **Users** - затронутые пользователи
   - **Velocity Alerts** - уведомления о резких скачках ошибок

## 🧪 Тестирование

### Тест краша (только в DEV режиме)

```typescript
// НЕ ИСПОЛЬЗУЙТЕ В PRODUCTION!
if (__DEV__) {
  CrashlyticsService.crash(); // Принудительный краш для теста
}
```

### Тест логирования ошибки

```typescript
// Создайте тестовую ошибку
const testError = new Error('Test error for Crashlytics');
CrashlyticsService.recordError(testError, 'Testing');
```

### Проверка статуса

```typescript
const isEnabled = await CrashlyticsService.isCrashlyticsCollectionEnabled();
console.log('Crashlytics enabled:', isEnabled);
```

## 📊 Что логируется автоматически?

### ✅ Автоматически логируется:

1. **Все краши приложения**
2. **Неперехваченные JavaScript ошибки**
3. **React компонент ошибки** (через ErrorBoundary)
4. **Unhandled Promise Rejections**
5. **API ошибки** (через ApiService)
6. **User ID** при логине/регистрации
7. **Email пользователя** (как атрибут)

### ❌ НЕ логируется автоматически (нужно вручную):

1. Бизнес-логика ошибки
2. Валидация форм
3. Expected errors (ожидаемые ошибки)
4. User actions (действия пользователей)

## 🎯 Best Practices

### DO ✅

1. **Логируйте context перед ошибкой:**
   ```typescript
   CrashlyticsService.log('User attempting to add vehicle');
   CrashlyticsService.setAttribute('vehicle_make', 'Toyota');
   // ... код который может упасть
   ```

2. **Используйте специализированные методы:**
   ```typescript
   // Хорошо
   CrashlyticsService.logApiError('/api/vehicles', 500, error);
   
   // Плохо
   CrashlyticsService.recordError(error);
   ```

3. **Добавляйте user-friendly context:**
   ```typescript
   CrashlyticsService.setAttribute('action', 'add_reminder');
   CrashlyticsService.setAttribute('reminder_type', 'oil_change');
   ```

### DON'T ❌

1. **Не логируйте чувствительные данные:**
   ```typescript
   // ПЛОХО! Не делайте так:
   CrashlyticsService.setAttribute('password', user.password);
   CrashlyticsService.setAttribute('credit_card', card.number);
   ```

2. **Не логируйте слишком много:**
   ```typescript
   // ПЛОХО! Не спамьте:
   for (let i = 0; i < 1000; i++) {
     CrashlyticsService.log(`Iteration ${i}`);
   }
   ```

3. **Не используйте для аналитики:**
   ```typescript
   // ПЛОХО! Для этого есть Analytics:
   CrashlyticsService.log('User clicked button');
   
   // ХОРОШО! Используйте Analytics:
   Analytics.track('button_clicked');
   ```

## 🔔 Настройка уведомлений

В Firebase Console можно настроить email уведомления о новых крашах:

1. Перейдите в **Crashlytics → Settings**
2. Настройте **Email notifications**
3. Добавьте команду разработчиков

## 🔧 Troubleshooting

### Ошибки не появляются в консоли?

1. Подождите 5-10 минут (задержка обработки)
2. Проверьте что Firebase инициализирован
3. Проверьте интернет подключение
4. Убедитесь что Crashlytics включен в google-services.json

### Как отключить Crashlytics?

```typescript
await crashlytics().setCrashlyticsCollectionEnabled(false);
```

## 📖 Дополнительные ресурсы

- [Firebase Crashlytics Docs](https://firebase.google.com/docs/crashlytics)
- [React Native Firebase Crashlytics](https://rnfirebase.io/crashlytics/usage)

## ⚡ Quick Reference

```typescript
// Импорт
import CrashlyticsService from './services/crashlyticsService';

// Логирование ошибки
CrashlyticsService.recordError(error, 'context');

// Логирование сообщения
CrashlyticsService.log('User action');

// Установка атрибутов
await CrashlyticsService.setAttribute('key', 'value');

// API ошибка
CrashlyticsService.logApiError('/api/path', 500, error);

// Screen ошибка
CrashlyticsService.logScreenError('ScreenName', error);

// Auth ошибка
CrashlyticsService.logAuthError('login_failed', error);

// User ID
await CrashlyticsService.setUserId(userId);
```

---

**Готово! Теперь все ошибки автоматически логируются в Firebase Crashlytics! 🎉**

