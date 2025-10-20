# ✅ Google Sign-In настроен!

## Что уже сделано:

1. ✅ Backend: `GOOGLE_CLIENT_ID` добавлен в `.env`
2. ✅ Mobile: `webClientId` настроен в `src/config/auth.ts`
3. ✅ Конфигурация Google Sign-In активирована

## 📋 Что проверить перед запуском:

### 1. Google Cloud Console

Убедитесь, что в [Google Cloud Console](https://console.cloud.google.com/) настроены OAuth 2.0 Client IDs:

#### Для Android:
- **Client ID type:** Android
- **Package name:** `uno.mygarage.app`
- **SHA-1:** Получите командой ниже и добавьте в Console

```bash
# Получить SHA-1 для debug keystore:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

#### Для iOS:
- **Client ID type:** iOS  
- **Bundle ID:** `uno.mygarage.app`

#### Web Client (используется в mobile):
- ✅ Уже настроен: `874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com`

### 2. Файлы конфигурации

Проверьте наличие файлов:
- ✅ `/mobile/google-services.json` (для Android)
- ✅ `/mobile/GoogleService-Info.plist` (для iOS)

### 3. Пересборка проекта

После добавления нативных модулей нужно пересобрать:

```bash
cd mobile

# Очистить кэш
npm run cache:clear

# Пересоздать нативный код
npx expo prebuild --clean

# Для iOS - установить pods
cd ios && pod install && cd ..
```

### 4. Запуск

```bash
# iOS
npm run ios:fresh

# Android
npm run android:fresh
```

## 🧪 Как протестировать:

1. Запустите приложение
2. Перейдите на экран авторизации (Welcome Screen → Login)
3. Нажмите кнопку **"Продолжить через Google"**
4. Выберите Google аккаунт
5. Подтвердите доступ
6. ✅ Должна произойти авторизация и переход на главный экран

## 🔍 Логи для отладки:

В консоли вы увидите:
```
✅ Google Sign-In успешно, отправляем на сервер...
✅ google_signin_success
```

Или в случае ошибки:
```
❌ Google Sign-In error: [описание ошибки]
```

## ⚠️ Типичные ошибки:

### "DEVELOPER_ERROR"
**Причина:** SHA-1 не добавлен в Google Console

**Решение:** 
1. Получите SHA-1 командой выше
2. Добавьте его в Google Cloud Console для Android OAuth Client

### "SIGN_IN_REQUIRED" или "No ID token received"
**Причина:** Неправильный webClientId

**Решение:** Проверьте что в `mobile/src/config/auth.ts` указан правильный Web Client ID

### "PLAY_SERVICES_NOT_AVAILABLE"
**Причина:** Эмулятор/устройство без Google Play Services

**Решение:** Используйте эмулятор с Google APIs или реальное устройство

## 📝 Настройки в коде:

### Backend (.env):
```bash
GOOGLE_CLIENT_ID="874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com"
```

### Mobile (src/config/auth.ts):
```typescript
export const AUTH_CONFIG = {
  google: {
    webClientId: '874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com',
    offlineAccess: true,
  },
};
```

## ✨ Готово!

Теперь Google Sign-In полностью настроен и готов к использованию!

Если возникнут проблемы, смотрите подробную документацию в `GOOGLE_APPLE_AUTH_SETUP.md`

