# 🚀 Быстрый старт: Google и Apple авторизация

## ✅ Что уже настроено:

### Backend:
- ✅ Миграция БД выполнена (`google_id`, `apple_id`)
- ✅ Endpoints: `/auth/google` и `/auth/apple`
- ✅ `.env` настроен с `GOOGLE_CLIENT_ID`

### Mobile:
- ✅ Установлены пакеты: `expo-apple-authentication`, `@react-native-google-signin/google-signin`, `react-native-dotenv`
- ✅ `babel.config.js` настроен для чтения `.env`
- ✅ `.env` создан с `GOOGLE_WEB_CLIENT_ID`
- ✅ `AuthScreen.tsx` обновлен с кнопками Google и Apple
- ✅ Интеграция с `AuthContext`

## 📋 Запуск приложения:

### ВАЖНО: Все команды выполняются из папки `mobile`!

```bash
# 1. Перейдите в папку mobile
cd mobile

# 2. Очистите кэш
npm run cache:clear

# 3. Пересоздайте нативный код (ОБЯЗАТЕЛЬНО после изменений в app.json и установки новых пакетов!)
npx expo prebuild --clean

# 4. Для iOS установите pods
cd ios && pod install && cd ..

# 5. Запустите приложение
npm run ios:fresh      # для iOS
# или
npm run android:fresh  # для Android
```

## ⚠️ Если команда не работает:

### Ошибка: "Missing script: ios:fresh"
**Причина:** Вы не в папке `mobile`

**Решение:**
```bash
cd /Users/alexg/alexg-service/myGarage/mobile
npm run ios:fresh
```

### Ошибка при prebuild
**Причина:** Старый кэш

**Решение:**
```bash
cd mobile
npm run cache:clear
rm -rf node_modules/.cache
npx expo prebuild --clean
```

## 🔑 Google Sign-In требования:

### 1. Google Cloud Console:
- Создан Web Client ID: `874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com`
- ✅ Уже добавлен в `backend/.env` как `GOOGLE_CLIENT_ID`
- ✅ Уже добавлен в `mobile/.env` как `GOOGLE_WEB_CLIENT_ID`

### 2. Для Android нужен SHA-1:
```bash
cd mobile/android
./gradlew signingReport

# Или альтернативно:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Добавьте SHA-1 в Google Cloud Console для Android OAuth Client.

### 3. Для iOS:
В Google Cloud Console создайте iOS OAuth Client с Bundle ID: `uno.mygarage.app`

## 🍎 Apple Sign-In требования:

### 1. Apple Developer Console:
- App ID: `uno.mygarage.app`
- Включите capability: "Sign in with Apple"

### 2. В Xcode (если используете):
- Target → Signing & Capabilities
- Добавьте "+ Capability" → "Sign in with Apple"

**Примечание:** При использовании `expo prebuild`, capability добавится автоматически благодаря `expo-apple-authentication` plugin.

## 🧪 Тестирование:

1. Запустите приложение
2. На Welcome Screen нажмите "Войти"
3. На экране авторизации увидите кнопки:
   - **"Продолжить через Google"** - для Google Sign-In
   - **"Продолжить через Apple"** - для Apple Sign-In (только iOS 13+)

4. Нажмите на одну из кнопок
5. Пройдите авторизацию
6. ✅ Должен произойти автоматический вход в приложение

## 📁 Структура проекта:

```
mobile/
├── .env                              # ← GOOGLE_WEB_CLIENT_ID
├── babel.config.js                   # ← настроен для react-native-dotenv
├── app.json                          # ← плагины включены
│
├── src/
│   ├── config/
│   │   └── auth.ts                   # ← конфигурация Google/Apple
│   ├── types/
│   │   └── env.d.ts                  # ← TypeScript типы для @env
│   ├── contexts/
│   │   └── AuthContext.tsx           # ← loginWithGoogle, loginWithApple
│   └── screens/
│       └── AuthScreen.tsx            # ← UI с кнопками социальных сетей
│
└── readme/
    └── QUICK_START_AUTH.md           # ← этот файл
```

## 🔍 Отладка:

### Проверьте что .env загружается:
```typescript
// Временно добавьте в AuthScreen.tsx, функцию configureGoogleSignIn:
console.log('🔑 Google Client ID:', AUTH_CONFIG.google.webClientId);
```

Должно вывести: `874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com`

### Проверьте логи:
```typescript
// При нажатии на кнопку Google Sign-In увидите:
✅ Google Sign-In успешно, отправляем на сервер...
✅ google_signin_success

// Или при ошибке:
❌ Google Sign-In error: [описание]
```

## 📚 Дополнительная документация:

- [GOOGLE_APPLE_AUTH_SETUP.md](./GOOGLE_APPLE_AUTH_SETUP.md) - Полная документация
- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - Про переменные окружения
- [FIXED_APPLE_AUTH.md](./FIXED_APPLE_AUTH.md) - Про замену на expo-apple-authentication

## ✨ Готово!

После выполнения всех шагов Google и Apple авторизация должна работать!

Если возникли проблемы - смотрите детальную документацию в других README файлах.

