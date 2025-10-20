# 📝 Настройка переменных окружения

## ✅ Что настроено:

### Backend (.env)
```bash
GOOGLE_CLIENT_ID="874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com"
```

### Mobile (.env)
```bash
GOOGLE_WEB_CLIENT_ID=874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com
```

**Примечание:** URL бэкенда настраивается через `EXPO_PUBLIC_API_BASE_URL` в другом месте (по умолчанию: `https://mygarage.uno/api`)

## 🔑 Важно понять:

### Один и тот же ключ для backend и mobile!

**GOOGLE_CLIENT_ID** - это **Web Client ID** из Google Cloud Console.

- **Backend** (`backend/.env`): используется для **верификации** токена от клиента
- **Mobile** (`mobile/.env`): используется для **получения** ID токена от Google

**Это должен быть один и тот же ключ!** Иначе Google откажет в авторизации.

## 🛠 Как это работает:

1. **Пользователь нажимает "Войти через Google"** на мобильном устройстве
2. **Mobile app** использует `GOOGLE_WEB_CLIENT_ID` для запроса к Google OAuth
3. **Google** возвращает `idToken` (зашифрованный токен)
4. **Mobile app** отправляет этот `idToken` на backend (`/auth/google`)
5. **Backend** использует `GOOGLE_CLIENT_ID` для верификации токена
6. **Backend** создает пользователя/сессию и возвращает auth token

## 📋 Структура файлов:

```
myGarage/
├── backend/
│   └── .env
│       └── GOOGLE_CLIENT_ID="874405..."  ← Web Client ID
│
└── mobile/
    ├── .env
    │   └── GOOGLE_WEB_CLIENT_ID=874405...  ← Тот же Web Client ID
    ├── .env.example  (шаблон)
    ├── babel.config.js  ← настроен для react-native-dotenv
    └── src/
        ├── types/env.d.ts  ← TypeScript типы для @env
        └── config/auth.ts  ← использует GOOGLE_WEB_CLIENT_ID
```

## 🔧 Технические детали:

### Backend (Laravel)
```php
// backend/config/services.php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
],

// backend/app/Http/Controllers/Api/AuthController.php
$client = new \Google_Client(['client_id' => config('services.google.client_id')]);
$payload = $client->verifyIdToken($request->id_token);
```

### Mobile (React Native)
```typescript
// mobile/src/config/auth.ts
import { GOOGLE_WEB_CLIENT_ID } from '@env';

export const AUTH_CONFIG = {
  google: {
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  },
};

// mobile/src/screens/AuthScreen.tsx
GoogleSignin.configure(AUTH_CONFIG.google);
const userInfo = await GoogleSignin.signIn();
const idToken = userInfo.data?.idToken;
await loginWithGoogle(idToken); // отправка на backend
```

## 🚀 После изменения .env:

### Backend:
```bash
# Перезапустить сервер (если запущен)
cd backend
php artisan config:clear
php artisan serve
```

### Mobile:
```bash
cd mobile

# Очистить кэш Metro bundler
npm run cache:clear

# Перезапустить приложение
npm run ios:fresh   # или android:fresh
```

**Важно:** После изменения `.env` в mobile нужно полностью перезапустить Metro bundler!

## 🧪 Проверка:

### 1. Проверьте backend:
```bash
cd backend
php artisan tinker

>>> config('services.google.client_id')
=> "874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po.apps.googleusercontent.com"
```

### 2. Проверьте mobile:
В мобильном приложении добавьте лог:
```typescript
// В AuthScreen.tsx в configureGoogleSignIn
console.log('Google Client ID:', AUTH_CONFIG.google.webClientId);
```

Должен вывести тот же ID.

## ⚠️ Безопасность:

### ❌ НЕ коммитьте в Git:
- `backend/.env` - в `.gitignore`
- `mobile/.env` - в `.gitignore`

### ✅ Коммитьте:
- `backend/.env.example`
- `mobile/.env.example`

### 🔐 Для production:

1. Используйте разные Client ID для dev и production
2. Настройте переменные окружения на сервере/CI/CD
3. Включите полную верификацию токенов на backend

## 📚 Дополнительные переменные:

### Backend (.env):
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_web_client_id
GOOGLE_CLIENT_SECRET=your_client_secret  # опционально

# Apple OAuth (для production)
APPLE_CLIENT_ID=uno.mygarage.app
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
```

### Mobile (.env):
```bash
# Google OAuth
GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

**Примечание:** Для настройки URL бэкенда используйте переменную `EXPO_PUBLIC_API_BASE_URL` (настраивается отдельно, по умолчанию используется продакшн: `https://mygarage.uno/api`)

## 🎯 Итог:

**Да, используйте `.env` файлы!** Это правильный подход:

✅ Один источник правды для конфигурации  
✅ Легко менять для разных окружений (dev/staging/prod)  
✅ Безопасность - секреты не в коде  
✅ Удобство для команды через `.env.example`

**И да, один и тот же Web Client ID для backend и mobile!**

