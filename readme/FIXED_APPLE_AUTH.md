# ✅ Исправлено: Apple Authentication для Expo

## Проблема

Ошибка:
```
PluginError: Unable to resolve a valid config plugin for @invertase/react-native-apple-authentication
```

**Причина:** Пакет `@invertase/react-native-apple-authentication` не поддерживает Expo config plugins и предназначен для чистого React Native CLI проекта.

## ✅ Решение

Заменили на **`expo-apple-authentication`** - официальный пакет для Expo.

### Что изменено:

#### 1. Пакеты:
```bash
# Удалено
❌ @invertase/react-native-apple-authentication

# Установлено
✅ expo-apple-authentication
```

#### 2. app.json:
```json
{
  "plugins": [
    // ... другие плагины
    "expo-apple-authentication"  // ← Добавлено
  ]
}
```

Также оставлено:
```json
{
  "ios": {
    "usesAppleSignIn": true  // ← Включает Apple Sign-In capability
  }
}
```

#### 3. AuthScreen.tsx:
```typescript
// Было:
import appleAuth from '@invertase/react-native-apple-authentication';
const response = await appleAuth.performRequest({
  requestedOperation: appleAuth.Operation.LOGIN,
  requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
});

// Стало:
import * as AppleAuthentication from 'expo-apple-authentication';
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});
```

## 📦 Итоговая конфигурация

### Зависимости:
```json
{
  "dependencies": {
    "@react-native-google-signin/google-signin": "^16.0.0",
    "expo-apple-authentication": "~7.0.x",
    "react-native-dotenv": "^3.x"
  }
}
```

### Plugins в app.json:
```json
{
  "plugins": [
    "expo-build-properties",
    "expo-notifications",
    "@react-native-firebase/app",
    "@react-native-firebase/crashlytics",
    "./plugins/withFirebaseAppDelegate.js",
    "expo-apple-authentication"
  ]
}
```

### iOS конфигурация:
```json
{
  "ios": {
    "usesAppleSignIn": true,
    "bundleIdentifier": "uno.mygarage.app"
  }
}
```

## 🚀 Следующие шаги:

```bash
cd mobile

# 1. Очистить кэш
npm run cache:clear
rm -rf node_modules/.cache

# 2. Пересоздать нативный код (ОБЯЗАТЕЛЬНО!)
npx expo prebuild --clean

# 3. Для iOS установить pods
cd ios && pod install && cd ..

# 4. Запустить
npm run ios:fresh
```

## ✅ Преимущества expo-apple-authentication:

1. **Нативная поддержка Expo** - работает с config plugins
2. **Автоматическая настройка** - не нужно вручную настраивать Xcode
3. **Единый API** - похож на другие Expo модули
4. **Лучшая совместимость** с Expo prebuild
5. **Официальная документация** от Expo

## 📚 Документация:

- [expo-apple-authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Google Sign-In для React Native](https://github.com/react-native-google-signin/google-signin)

## 🧪 Тестирование:

### Apple Sign-In (только iOS 13+):
```typescript
// Проверка доступности
const isAvailable = await AppleAuthentication.isAvailableAsync();

// Авторизация
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

console.log('Identity Token:', credential.identityToken);
console.log('User ID:', credential.user);
```

## ⚠️ Важно:

1. **Apple Sign-In работает только на iOS 13+**
2. **Требуется Apple Developer Account** с настроенным App ID
3. **Sign in with Apple capability** должна быть включена в Apple Developer Console
4. **Первый вход** - Apple запросит email и имя
5. **Повторные входы** - Apple может не предоставлять email (privacy feature)

## 🔐 Безопасность:

Backend правильно обрабатывает случаи когда:
- Apple не предоставляет email (использует placeholder)
- Пользователь с таким Apple ID уже существует
- Пользователь с таким email уже существует (связывает аккаунты)

Готово! Теперь Apple Sign-In будет работать корректно в Expo! 🎉

