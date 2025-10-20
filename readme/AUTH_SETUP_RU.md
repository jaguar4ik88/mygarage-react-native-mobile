# Инструкция по настройке Google и Apple авторизации

## ✅ Что уже сделано

### Backend
- ✅ База данных: добавлены поля `google_id` и `apple_id` в таблицу users (миграция выполнена)
- ✅ API endpoints: `/auth/google` и `/auth/apple` готовы к работе
- ✅ Логика авторизации реализована в `AuthController`

### Mobile
- ✅ Установлены необходимые пакеты
- ✅ Кнопки Google и Apple Sign-In добавлены на экран авторизации
- ✅ Реализована полная интеграция с AuthContext
- ✅ Настроена аналитика

## 🔧 Что нужно сделать

### 1. Получить Google Client ID

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте или выберите проект
3. Перейдите в **APIs & Services** → **Credentials**
4. Создайте **OAuth 2.0 Client ID**:
   - Для Android: Package name = `uno.mygarage.app`
   - Для iOS: Bundle ID = `uno.mygarage.app`
   - Для Web: будет использоваться в мобильном приложении

5. **Важно:** Для мобильного приложения нужен именно **Web Client ID**

### 2. Настроить Google Sign-In в приложении

Откройте файл `/mobile/src/screens/AuthScreen.tsx` и найдите функцию `configureGoogleSignIn` (строка ~55):

```typescript
const configureGoogleSignIn = () => {
  try {
    GoogleSignin.configure({
      webClientId: 'ВАШ_WEB_CLIENT_ID.apps.googleusercontent.com', // ← ДОБАВЬТЕ СЮДА
      offlineAccess: true,
    });
  } catch (error) {
    console.error('Failed to configure Google Sign-In:', error);
  }
};
```

Замените `'ВАШ_WEB_CLIENT_ID.apps.googleusercontent.com'` на ваш реальный Web Client ID из Google Console.

### 3. Настроить Apple Sign-In (для iOS)

1. Откройте [Apple Developer Console](https://developer.apple.com/account/)
2. Найдите ваш App ID: `uno.mygarage.app`
3. В разделе **Capabilities** включите **Sign in with Apple**
4. Сохраните изменения

**Примечание:** Конфигурация в `app.json` уже готова (`"usesAppleSignIn": true`)

### 4. Пересобрать нативный код

Так как мы добавили нативные модули, нужно пересобрать проект:

```bash
cd mobile

# Очистить кэш
npm run cache:clear

# Пересоздать нативный код
npx expo prebuild --clean

# Для iOS установить pods
cd ios && pod install && cd ..
```

### 5. Запустить приложение

```bash
# iOS
npm run ios:fresh

# Android  
npm run android:fresh
```

## 🧪 Как проверить

1. Запустите приложение
2. Перейдите на экран авторизации
3. Нажмите "Продолжить через Google" или "Продолжить через Apple"
4. Пройдите процесс авторизации
5. Должен произойти автоматический вход в приложение

## ⚠️ Частые проблемы

### Google Sign-In не работает:

**Причина:** Не указан `webClientId` или указан неправильно

**Решение:** Проверьте что в `configureGoogleSignIn` указан именно Web Client ID из Google Console

---

**Причина:** SHA-1 не совпадает (для Android)

**Решение:** 
```bash
# Получите SHA-1 вашего debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Добавьте этот SHA-1 в Google Console для вашего Android OAuth client
```

### Apple Sign-In не работает:

**Причина:** Capability не добавлена

**Решение:** Убедитесь что "Sign in with Apple" включена в Apple Developer Console для вашего App ID

---

**Причина:** iOS версия < 13

**Решение:** Apple Sign-In работает только на iOS 13+

## 📝 Backend настройка (опционально)

Для production добавьте в `backend/.env`:

```bash
GOOGLE_CLIENT_ID=ваш_google_client_id
GOOGLE_CLIENT_SECRET=ваш_google_client_secret

# Для Apple (опционально, для полной верификации)
APPLE_CLIENT_ID=uno.mygarage.app
APPLE_TEAM_ID=ваш_team_id
APPLE_KEY_ID=ваш_key_id
```

**Примечание:** В режиме разработки backend работает без этих настроек и пропускает верификацию токенов. Для production рекомендуется настроить полную верификацию.

## 📞 Нужна помощь?

Все детали настройки и troubleshooting смотрите в файле `GOOGLE_APPLE_AUTH_SETUP.md`

