# Настройка Google и Apple авторизации

## ✅ Выполнено

### Backend
- ✅ Создана миграция для добавления `apple_id` в таблицу users
- ✅ Обновлена модель User для поддержки `google_id` и `apple_id`
- ✅ Создан метод `googleAuth` в AuthController (принимает `id_token`)
- ✅ Создан метод `appleAuth` в AuthController (принимает `identity_token`)
- ✅ Добавлены маршруты `/auth/google` и `/auth/apple`

### Mobile
- ✅ Установлен пакет `@invertase/react-native-apple-authentication`
- ✅ Обновлен AuthScreen с кнопками Google и Apple Sign-In
- ✅ Реализована функциональность Google Sign-In
- ✅ Реализована функциональность Apple Sign-In
- ✅ Обновлен app.json с поддержкой Apple Sign-In
- ✅ Добавлены события аналитики

## 📋 Что нужно настроить

### 1. Google Sign-In

#### Для Android:

1. **Google Cloud Console:**
   - Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
   - Выберите ваш проект (или создайте новый)
   - Перейдите в **APIs & Services** → **Credentials**
   - Создайте **OAuth 2.0 Client ID** для Android:
     - Application type: Android
     - Package name: `uno.mygarage.app`
     - SHA-1: Получите командой `cd mobile/android && ./gradlew signingReport`
   - Скопируйте созданный **Client ID**

2. **google-services.json:**
   - Файл уже есть в `/mobile/google-services.json`
   - Убедитесь, что он актуален

#### Для iOS:

1. **Google Cloud Console:**
   - В том же проекте создайте **OAuth 2.0 Client ID** для iOS:
     - Application type: iOS
     - Bundle ID: `uno.mygarage.app`
   - Скопируйте **iOS Client ID**

2. **GoogleService-Info.plist:**
   - Файл уже есть в `/mobile/GoogleService-Info.plist`
   - Убедитесь, что он актуален

3. **Обновите AuthScreen.tsx:**
   ```typescript
   // В файле mobile/src/screens/AuthScreen.tsx
   // Найдите функцию configureGoogleSignIn и добавьте ваш webClientId:
   
   const configureGoogleSignIn = () => {
     try {
       GoogleSignin.configure({
         webClientId: 'ВАШ_WEB_CLIENT_ID.apps.googleusercontent.com', // ← Добавьте сюда
         offlineAccess: true,
       });
     } catch (error) {
       console.error('Failed to configure Google Sign-In:', error);
     }
   };
   ```

#### Backend .env:

```bash
# В файле backend/.env добавьте:
GOOGLE_CLIENT_ID=ваш_google_client_id
GOOGLE_CLIENT_SECRET=ваш_google_client_secret
```

### 2. Apple Sign-In

#### Для iOS:

1. **Apple Developer Account:**
   - Перейдите в [Apple Developer Console](https://developer.apple.com/account/)
   - Выберите ваш App ID: `uno.mygarage.app`
   - В разделе **Capabilities** включите **Sign in with Apple**
   - Сохраните изменения

2. **Xcode (если используете):**
   - Откройте проект в Xcode
   - Перейдите в **Target** → **Signing & Capabilities**
   - Нажмите **+ Capability** и добавьте **Sign in with Apple**

3. **Expo:**
   - Уже настроено в `app.json` (`"usesAppleSignIn": true`)
   - При следующей сборке через EAS Build capability будет добавлена автоматически

#### Backend .env (опционально, для production):

```bash
# Для полной верификации Apple токенов в production:
APPLE_CLIENT_ID=uno.mygarage.app
APPLE_TEAM_ID=ваш_team_id
APPLE_KEY_ID=ваш_key_id
```

**Примечание:** В текущей реализации backend работает в режиме разработки и не требует полной верификации Apple токенов. Для production рекомендуется добавить верификацию с использованием Apple public keys.

### 3. Установка зависимостей

```bash
cd mobile

# Установить зависимости (уже установлены)
npm install

# Для iOS - установить pods
cd ios
pod install
cd ..
```

### 4. Prebuild (для native модулей)

Так как мы добавили новые нативные модули (Apple Authentication), необходимо пересобрать проект:

```bash
cd mobile

# Очистить кэш
npm run cache:clear

# Для iOS
npx expo prebuild --platform ios --clean

# Для Android
npx expo prebuild --platform android --clean

# Или оба сразу
npx expo prebuild --clean
```

### 5. Сборка и запуск

```bash
# iOS
npm run ios:fresh

# Android
npm run android:fresh
```

## 🧪 Тестирование

### Тестовые сценарии:

1. **Google Sign-In:**
   - Нажмите кнопку "Продолжить через Google"
   - Выберите Google аккаунт
   - Подтвердите доступ
   - Должна произойти авторизация и переход на главный экран

2. **Apple Sign-In (только iOS):**
   - Нажмите кнопку "Продолжить через Apple"
   - Подтвердите с помощью Face ID / Touch ID
   - Должна произойти авторизация и переход на главный экран

3. **Проверка backend:**
   - После успешной авторизации проверьте в базе данных:
     ```sql
     SELECT id, name, email, google_id, apple_id FROM users;
     ```
   - Должны быть заполнены соответствующие поля `google_id` или `apple_id`

## 🔧 Troubleshooting

### Google Sign-In ошибки:

**"DEVELOPER_ERROR":**
- Проверьте, что SHA-1 в Google Console совпадает с SHA-1 вашего debug keystore
- Для debug: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`

**"SIGN_IN_REQUIRED":**
- Убедитесь, что webClientId указан правильно
- Это должен быть Web client ID, а не Android client ID

**"PLAY_SERVICES_NOT_AVAILABLE":**
- Проверьте, что Google Play Services установлены на устройстве/эмуляторе

### Apple Sign-In ошибки:

**"NOT_AVAILABLE":**
- Apple Sign-In работает только на iOS 13+
- Проверьте, что capability добавлена в Xcode

**"INVALID_RESPONSE":**
- Проверьте Bundle ID в Apple Developer Console
- Убедитесь, что Sign in with Apple включен для вашего App ID

### Backend ошибки:

**"Invalid token":**
- Проверьте, что токен передается правильно
- В режиме разработки backend логирует предупреждения, но продолжает работу

## 📚 Документация

- [Google Sign-In для React Native](https://github.com/react-native-google-signin/google-signin)
- [Apple Authentication для React Native](https://github.com/invertase/react-native-apple-authentication)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Apple Developer Console](https://developer.apple.com/account/)

## 🚀 Production checklist

Перед релизом в production:

- [ ] Добавить production Google Client ID в `.env`
- [ ] Настроить полную верификацию Apple токенов в backend
- [ ] Проверить все SHA-1 fingerprints для production keystore
- [ ] Обновить OAuth redirect URIs в Google Console
- [ ] Протестировать на реальных устройствах
- [ ] Добавить обработку edge cases (отсутствие email от Apple и т.д.)
- [ ] Настроить аналитику для отслеживания конверсии через social auth

## 📝 Примечания

1. **Режим разработки:** Backend работает в режиме разработки и пропускает некоторые проверки, если не настроены credentials в `.env`. Это удобно для локальной разработки.

2. **Apple Private Email:** Apple может предоставить анонимный email вида `xyz@privaterelay.appleid.com`. Это нормально и обрабатывается в backend.

3. **Первый вход vs повторный:** 
   - При первом входе создается новый пользователь
   - При повторном входе используется существующий пользователь по `google_id` или `apple_id`
   - Если пользователь с таким email уже существует, аккаунты связываются

4. **Безопасность:** В production обязательно включите полную верификацию токенов с Google и Apple серверами.

