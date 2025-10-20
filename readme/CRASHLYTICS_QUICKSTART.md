# 🔥 Firebase Crashlytics - Быстрый старт

## ✅ Что сделано?

### 1. Установлен пакет
```json
"@react-native-firebase/crashlytics": "23.3.1"
```

### 2. Создан сервис `crashlyticsService.ts`
Единая точка для работы с Crashlytics

### 3. Автоматическое логирование настроено:
- ✅ Все краши приложения
- ✅ Неперехваченные JavaScript ошибки  
- ✅ React компонент ошибки (ErrorBoundary)
- ✅ API ошибки (ApiService)
- ✅ User ID при логине
- ✅ Глобальные обработчики ошибок

## 🚀 Как использовать?

### Импортируйте сервис:
```typescript
import CrashlyticsService from '../services/crashlyticsService';
```

### Логируйте ошибки:
```typescript
try {
  // ваш код
} catch (error) {
  CrashlyticsService.recordError(error, 'Что делал пользователь');
}
```

### Добавляйте контекст:
```typescript
CrashlyticsService.log('Пользователь открыл экран добавления авто');
CrashlyticsService.setAttribute('screen', 'AddCarScreen');
```

### Специализированные методы:
```typescript
// API ошибки
CrashlyticsService.logApiError('/api/vehicles', 500, error);

// Ошибки экранов  
CrashlyticsService.logScreenError('HomeScreen', error);

// Ошибки аутентификации
CrashlyticsService.logAuthError('login_failed', error);
```

## 📊 Где смотреть ошибки?

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект **MyGarage**
3. Перейдите в **Crashlytics** (левое меню)
4. Все ошибки будут здесь! 📈

## 🧪 Тестирование

### Создайте тестовую ошибку:
```typescript
const testError = new Error('Test Crashlytics');
CrashlyticsService.recordError(testError, 'Testing');
```

### Проверьте через 5-10 минут в Firebase Console

## ⚡ Примеры из вашего кода

### В HomeScreen:
```typescript
const loadVehicles = async () => {
  try {
    const vehicles = await ApiService.getVehicles();
  } catch (error) {
    CrashlyticsService.logScreenError('HomeScreen', error);
    Alert.alert('Ошибка загрузки автомобилей');
  }
};
```

### В AddCarScreen:
```typescript
const handleAddCar = async () => {
  try {
    CrashlyticsService.log('User adding vehicle');
    const vehicle = await ApiService.addVehicle(data);
  } catch (error) {
    CrashlyticsService.setAttribute('vehicle_make', data.make);
    CrashlyticsService.logScreenError('AddCarScreen', error);
  }
};
```

### В RemindersScreen:
```typescript
const createReminder = async () => {
  try {
    await ApiService.createReminder(userId, reminder);
  } catch (error) {
    CrashlyticsService.setAttribute('reminder_type', reminder.type);
    CrashlyticsService.recordError(error, 'Failed to create reminder');
  }
};
```

## 🎯 Best Practices

### ✅ DO:
- Логируйте контекст перед ошибкой
- Используйте специализированные методы
- Добавляйте атрибуты для context

### ❌ DON'T:
- НЕ логируйте пароли, токены, личные данные
- НЕ спамьте логами в циклах
- НЕ используйте для аналитики (есть Analytics)

## 📖 Полная документация

Смотрите `CRASHLYTICS_GUIDE.md` для детальной информации

---

**Готово! Все ошибки теперь автоматически отслеживаются! 🎉**

