# Google Sign-In Setup Guide

## 🔧 Настройка Google Cloud Console

### 1. Создание проекта в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API (если еще не включен)

### 2. Настройка OAuth 2.0

1. Перейдите в **APIs & Services** > **Credentials**
2. Нажмите **Create Credentials** > **OAuth 2.0 Client IDs**
3. Выберите **Application type**: **iOS** или **Android**

#### Для iOS:
- **Bundle ID**: `uno.mygarage.app`
- **App Store ID**: (оставьте пустым для тестирования)

#### Для Android:
- **Package name**: `uno.mygarage.app`
- **SHA-1 certificate fingerprint**: Получите командой:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```

### 3. Получение Client IDs

После создания OAuth 2.0 клиентов, вы получите:
- **iOS Client ID** (например: `123456789-abcdefg.apps.googleusercontent.com`)
- **Web Client ID** (например: `123456789-abcdefg.apps.googleusercontent.com`)

### 4. Обновление конфигурации

#### В `mobile/src/services/googleSignInService.ts`:
```typescript
await GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // Замените на реальный Web Client ID
  iosClientId: 'YOUR_IOS_CLIENT_ID', // Замените на реальный iOS Client ID
  // ... остальные настройки
});
```

#### В `mobile/app.json`:
```json
{
  "plugins": [
    [
      "@react-native-google-signin/google-signin",
      {
        "iosUrlScheme": "com.googleusercontent.apps.YOUR_CLIENT_ID"
      }
    ]
  ]
}
```

### 5. Обновление Firebase конфигурации

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в **Authentication** > **Sign-in method**
4. Включите **Google** провайдер
5. Добавьте **Web SDK configuration**:
   - **Web client ID**: Используйте тот же Web Client ID
   - **Web client secret**: (необязательно для мобильных приложений)

### 6. Backend API (Laravel)

Добавьте новый endpoint в `routes/api.php`:
```php
Route::post('/auth/google', [AuthController::class, 'googleAuth']);
```

Пример реализации в `AuthController`:
```php
public function googleAuth(Request $request)
{
    $request->validate([
        'idToken' => 'required|string',
        'userInfo' => 'required|array',
        'userInfo.email' => 'required|email',
        'userInfo.name' => 'required|string',
    ]);

    // Верификация Google ID Token
    $client = new \Google_Client(['client_id' => config('services.google.client_id')]);
    $payload = $client->verifyIdToken($request->idToken);
    
    if (!$payload) {
        return response()->json(['message' => 'Invalid Google token'], 401);
    }

    // Поиск или создание пользователя
    $user = User::firstOrCreate(
        ['email' => $request->userInfo['email']],
        [
            'name' => $request->userInfo['name'],
            'google_id' => $payload['sub'],
            'email_verified_at' => now(),
        ]
    );

    // Создание JWT токена
    $token = $user->createToken('auth-token')->plainTextToken;

    return response()->json([
        'token' => $token,
        'user' => $user,
    ]);
}
```

### 7. Тестирование

1. Пересоберите приложение:
   ```bash
   npx expo run:ios
   # или
   npx expo run:android
   ```

2. Нажмите кнопку "Sign in with Google"
3. Выберите Google аккаунт
4. Проверьте, что пользователь успешно авторизован

## 🚨 Важные замечания

- **Client IDs должны совпадать** в Firebase и Google Cloud Console
- **Bundle ID/Package name** должны точно совпадать с настройками приложения
- **SHA-1 fingerprint** для Android должен быть правильным
- **URL Scheme** для iOS должен быть в формате `com.googleusercontent.apps.CLIENT_ID`

## 🔍 Troubleshooting

### Ошибка "Sign in failed"
- Проверьте правильность Client IDs
- Убедитесь, что Bundle ID/Package name совпадают
- Проверьте SHA-1 fingerprint для Android

### Ошибка "Invalid client"
- Убедитесь, что OAuth 2.0 клиент создан правильно
- Проверьте, что API включен в Google Cloud Console

### Ошибка "Network error"
- Проверьте интернет соединение
- Убедитесь, что Google Services доступны
