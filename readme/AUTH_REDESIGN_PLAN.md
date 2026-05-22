# План: Редизайн системы авторизации

## Цель
Реализовать новую систему входа с Welcome Screen, гостевым режимом, автоматической биометрией и входом через Google/Apple.

---

## 1. Создание AuthContext (Управление состоянием)

### Файл: `mobile/src/contexts/AuthContext.tsx`

**Создать новый контекст** для централизованного управления аутентификацией:

```typescript
interface AuthState {
  isGuest: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  promptToLogin: () => void; // Показать модалку с предложением войти
}
```

**Функционал:**
- Хранение состояния: `isGuest`, `isAuthenticated`, `user`
- Методы: `login`, `loginWithGoogle`, `loginWithApple`, `register`, `logout`, `continueAsGuest`
- При логине: очищать гостевые данные и загружать с сервера
- Проверка биометрии: если есть сохраненные данные - автоматически предлагать биометрию

**Зависимости от:**
- `AsyncStorage` для хранения токенов и флага `isGuest`
- `ApiService` для API вызовов
- `BiometricService` для автоматической биометрии

---

## 2. Welcome Screen

### Файл: `mobile/src/screens/WelcomeScreen.tsx`

**Создать новый экран** приветствия с тремя вариантами:

**UI компоненты:**
```
[Logo / Image]
Добро пожаловать в myGarage
Управляйте своим автомобилем легко

[Кнопка: Войти] - основная (primary)
[Кнопка: Регистрация] - вторичная (outline)
[Текст-ссылка: Продолжить как гость] - внизу
```

**Логика:**
- Проверка при загрузке:
  - Если есть `auth_token` → автоматическая биометрия (если включена) → Home
  - Если есть сохраненные учетные данные → автоматическая биометрия → Home
  - Иначе показать Welcome Screen
- Анимации: fade in, slide up для кнопок
- Аналитика: отслеживать выбор пользователя

**Навигация:**
- "Войти" → AuthScreen (режим логина)
- "Регистрация" → AuthScreen (режим регистрации)
- "Продолжить как гость" → `continueAsGuest()` → Home

---

## 3. Обновление AuthScreen

### Файл: `mobile/src/screens/AuthScreen.tsx`

**Изменения:**

1. **Добавить Social Auth кнопки:**
```typescript
// После формы Email/Password
<View style={styles.divider}>
  <Text>или войдите через</Text>
</View>

<TouchableOpacity onPress={handleGoogleSignIn}>
  <Icon name="google" />
  <Text>Продолжить с Google</Text>
</TouchableOpacity>

<TouchableOpacity onPress={handleAppleSignIn}>
  <Icon name="apple" />
  <Text>Продолжить с Apple</Text>
</TouchableOpacity>
```

2. **Убрать кнопку биометрии** - теперь автоматически в WelcomeScreen

3. **Методы Social Auth:**
```typescript
const handleGoogleSignIn = async () => {
  try {
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo;
    // Отправить idToken на backend
    const response = await ApiService.loginWithGoogle(idToken);
    // Сохранить токен и перейти на Home
    await authContext.loginWithGoogle();
  } catch (error) {
    // Обработка ошибок
  }
};

const handleAppleSignIn = async () => {
  try {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: AppleAuthRequestOperation.LOGIN,
      requestedScopes: [AppleAuthRequestScope.EMAIL, AppleAuthRequestScope.FULL_NAME],
    });
    const { identityToken } = appleAuthRequestResponse;
    // Отправить на backend
    const response = await ApiService.loginWithApple(identityToken);
    await authContext.loginWithApple();
  } catch (error) {
    // Обработка ошибок
  }
};
```

---

## 4. Модалка "Войдите для продолжения"

### Файл: `mobile/src/components/LoginPromptModal.tsx`

**Создать компонент модалки** для гостей:

```typescript
interface LoginPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
  title?: string;
  message?: string;
}
```

**UI:**
```
[X закрыть]

Войдите для добавления
[icon]

Создайте аккаунт чтобы добавлять автомобили 
и синхронизировать данные между устройствами

[Кнопка: Войти]
[Кнопка: Регистрация]
[Текст: Продолжить как гость]
```

**Использование:**
- В `AddVehicleScreen`, `AddExpenseScreen`, `AddReminderScreen`
- Перед добавлением данных проверять `isGuest`
- Если гость → показать модалку

---

## 5. Обновление AppNavigator

### Файл: `mobile/src/navigation/AppNavigator.tsx`

**Изменения:**

1. **Обернуть в AuthProvider:**
```typescript
<AuthProvider>
  <NavigationContainer>
    {/* навигация */}
  </NavigationContainer>
</AuthProvider>
```

2. **Новая логика навигации:**
```typescript
const { isAuthenticated, isGuest, isLoading } = useAuth();

if (isLoading) {
  return <LoadingSpinner />;
}

return (
  <Stack.Navigator>
    {/* Welcome всегда первый экран */}
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    
    {/* Auth экраны доступны всегда */}
    <Stack.Screen name="Auth" component={AuthScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    
    {/* Основные экраны доступны и гостям, и залогиненным */}
    <Stack.Screen name="Home" component={BottomTabNavigator} />
    <Stack.Screen name="AddCar" component={AddVehicleScreen} />
    {/* ... остальные экраны */}
  </Stack.Navigator>
);
```

3. **Убрать условный рендеринг** `{!isAuthenticated ? ... : ...}`

---

## 6. Защита действий для гостей

### Файлы для изменения:

#### `mobile/src/screens/AddVehicleScreen.tsx`
```typescript
const { isGuest, promptToLogin } = useAuth();

const handleSave = async () => {
  if (isGuest) {
    promptToLogin(); // Показать модалку
    return;
  }
  // Обычное сохранение
};
```

#### `mobile/src/screens/AddExpenseScreen.tsx`
```typescript
const { isGuest, promptToLogin } = useAuth();

const handleSave = async () => {
  if (isGuest) {
    promptToLogin();
    return;
  }
  // Сохранение
};
```

#### `mobile/src/screens/AddReminderScreen.tsx`
```typescript
const { isGuest, promptToLogin } = useAuth();

const handleSave = async () => {
  if (isGuest) {
    promptToLogin();
    return;
  }
  // Сохранение
};
```

---

## 7. Автоматическая биометрия

### Файл: `mobile/src/services/BiometricService.ts`

**Добавить метод:**
```typescript
async checkAndAutoAuthenticate(): Promise<boolean> {
  try {
    // Проверить доступность биометрии
    const isAvailable = await this.isAvailable();
    if (!isAvailable) return false;
    
    // Проверить настройку пользователя
    const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
    if (biometricEnabled !== 'true') return false;
    
    // Проверить наличие сохраненных данных
    const savedEmail = await AsyncStorage.getItem('last_login_email');
    const savedPassword = await AsyncStorage.getItem('last_login_password');
    if (!savedEmail || !savedPassword) return false;
    
    // Автоматически запросить биометрию
    const result = await this.authenticate('Войдите в myGarage');
    return result.success;
  } catch (error) {
    return false;
  }
}
```

**Использование в WelcomeScreen:**
```typescript
useEffect(() => {
  checkAutoLogin();
}, []);

const checkAutoLogin = async () => {
  const biometricSuccess = await BiometricService.checkAndAutoAuthenticate();
  
  if (biometricSuccess) {
    // Получить сохраненные данные
    const savedEmail = await AsyncStorage.getItem('last_login_email');
    const savedPassword = await AsyncStorage.getItem('last_login_password');
    
    // Войти
    await authContext.login(savedEmail, savedPassword);
    // Навигация на Home произойдет автоматически
  } else {
    // Показать Welcome Screen
    setShowWelcome(true);
  }
};
```

---

## 8. Backend: Social Auth

### Новые API endpoints:

#### `backend/routes/api.php`
```php
Route::post('/auth/google', [AuthController::class, 'loginWithGoogle']);
Route::post('/auth/apple', [AuthController::class, 'loginWithApple']);
```

#### `backend/app/Http/Controllers/Api/AuthController.php`

**Добавить методы:**
```php
public function loginWithGoogle(Request $request)
{
    $request->validate([
        'id_token' => 'required|string',
    ]);
    
    // Верифицировать Google ID token
    $client = new \Google_Client(['client_id' => config('services.google.client_id')]);
    $payload = $client->verifyIdToken($request->id_token);
    
    if (!$payload) {
        return response()->json(['error' => 'Invalid token'], 401);
    }
    
    // Найти или создать пользователя
    $user = User::firstOrCreate(
        ['email' => $payload['email']],
        [
            'name' => $payload['name'],
            'google_id' => $payload['sub'],
            'email_verified_at' => now(),
        ]
    );
    
    // Создать токен
    $token = $user->createToken('auth-token')->plainTextToken;
    
    return response()->json([
        'token' => $token,
        'user' => $user,
    ]);
}

public function loginWithApple(Request $request)
{
    $request->validate([
        'identity_token' => 'required|string',
        'user' => 'nullable|string', // Apple user ID
    ]);
    
    // Верифицировать Apple Identity Token
    // Использовать JWT библиотеку для декодирования
    $decoded = \Firebase\JWT\JWT::decode(
        $request->identity_token,
        // Apple public keys
    );
    
    // Найти или создать пользователя
    $user = User::firstOrCreate(
        ['email' => $decoded->email ?? 'apple_' . $request->user . '@privaterelay.appleid.com'],
        [
            'name' => $decoded->name ?? 'Apple User',
            'apple_id' => $request->user,
            'email_verified_at' => now(),
        ]
    );
    
    $token = $user->createToken('auth-token')->plainTextToken;
    
    return response()->json([
        'token' => $token,
        'user' => $user,
    ]);
}
```

#### `backend/database/migrations/xxxx_add_social_auth_to_users.php`
```php
public function up()
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('google_id')->nullable()->unique();
        $table->string('apple_id')->nullable()->unique();
    });
}
```

---

## 9. Mobile: API Service

### Файл: `mobile/src/services/api.ts`

**Добавить методы:**
```typescript
async loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const response = await this.request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
  
  if (response.data.token) {
    await AsyncStorage.setItem('auth_token', response.data.token);
    await this.updateToken();
  }
  
  return response.data;
}

async loginWithApple(identityToken: string, user?: string): Promise<AuthResponse> {
  const response = await this.request<AuthResponse>('/auth/apple', {
    method: 'POST',
    body: JSON.stringify({ 
      identity_token: identityToken,
      user: user 
    }),
  });
  
  if (response.data.token) {
    await AsyncStorage.setItem('auth_token', response.data.token);
    await this.updateToken();
  }
  
  return response.data;
}
```

---

## 10. Установка зависимостей

### Mobile:
```bash
cd mobile

# Apple Sign-In
npm install @invertase/react-native-apple-authentication

# Проверить что Google Sign-In уже установлен
# @react-native-google-signin/google-signin - уже есть
```

### Backend:
```bash
cd backend

# Google API Client
composer require google/apiclient

# JWT для Apple
composer require firebase/php-jwt
```

---

## 11. Конфигурация

### Google OAuth:

#### `mobile/app.json`
```json
{
  "ios": {
    "googleServicesFile": "./GoogleService-Info.plist",
    "config": {
      "googleSignIn": {
        "reservedClientId": "YOUR_IOS_CLIENT_ID"
      }
    }
  },
  "android": {
    "googleServicesFile": "./android/app/google-services.json"
  }
}
```

#### `backend/.env`
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
```

### Apple Sign-In:

#### iOS Capabilities (Xcode):
1. Открыть проект в Xcode
2. Target → Signing & Capabilities
3. Добавить "Sign in with Apple"

---

## 12. Локализация

### Файлы: `mobile/src/localization/*.json`

**Добавить ключи:**
```json
{
  "welcome": {
    "title": "Welcome to myGarage",
    "subtitle": "Manage your vehicle easily",
    "login": "Login",
    "register": "Register",
    "continueAsGuest": "Continue as Guest"
  },
  "loginPrompt": {
    "title": "Login to continue",
    "message": "Create an account to add vehicles and sync your data",
    "addVehicle": "Login to add vehicle",
    "addExpense": "Login to add expense",
    "addReminder": "Login to add reminder"
  },
  "socialAuth": {
    "continueWithGoogle": "Continue with Google",
    "continueWithApple": "Continue with Apple",
    "orDivider": "or"
  }
}
```

---

## 13. Тестирование

### Сценарии:

1. **Первый запуск:**
   - ✓ Показывается Welcome Screen
   - ✓ "Продолжить как гость" работает
   - ✓ "Войти" открывает AuthScreen
   - ✓ "Регистрация" открывает AuthScreen в режиме регистрации

2. **Гостевой режим:**
   - ✓ Все экраны доступны для просмотра
   - ✓ При попытке добавить авто → модалка
   - ✓ При попытке добавить трату → модалка
   - ✓ При попытке добавить напоминание → модалка
   - ✓ Профиль доступен
   - ✓ Советы доступны

3. **Автоматическая биометрия:**
   - ✓ При запуске с сохраненными данными → автоматически Face ID
   - ✓ После успеха → сразу на Home
   - ✓ После отказа → Welcome Screen

4. **Social Auth:**
   - ✓ Google Sign-In работает
   - ✓ Apple Sign-In работает
   - ✓ Данные синхронизируются с сервером
   - ✓ Профиль заполняется корректно

5. **Логин после гостя:**
   - ✓ Гостевые данные очищаются
   - ✓ Загружаются данные с сервера
   - ✓ Переход на Home

---

## Порядок реализации

### Этап 1: Инфраструктура (1-2 дня)
1. Создать AuthContext
2. Создать WelcomeScreen
3. Обновить AppNavigator
4. Создать LoginPromptModal

### Этап 2: Гостевой режим (1 день)
1. Реализовать `continueAsGuest()` в AuthContext
2. Добавить проверки `isGuest` в экраны добавления
3. Интегрировать LoginPromptModal

### Этап 3: Автоматическая биометрия (1 день)
1. Обновить BiometricService
2. Интегрировать в WelcomeScreen
3. Тестирование

### Этап 4: Backend Social Auth (2 дня)
1. Создать миграцию для social IDs
2. Реализовать Google auth endpoint
3. Реализовать Apple auth endpoint
4. Тестирование с Postman

### Этап 5: Mobile Social Auth (2-3 дня)
1. Настроить Google Sign-In
2. Настроить Apple Sign-In
3. Обновить AuthScreen
4. Интегрировать с AuthContext
5. Тестирование на устройствах

### Этап 6: Полировка и тестирование (1 день)
1. Добавить локализацию
2. Добавить аналитику
3. Полное тестирование всех сценариев
4. Исправление багов

**Итого: 8-10 дней**

---

## Checklist

### Mobile:
- [ ] Создать AuthContext
- [ ] Создать WelcomeScreen
- [ ] Создать LoginPromptModal
- [ ] Обновить AppNavigator
- [ ] Добавить проверки isGuest в AddVehicleScreen
- [ ] Добавить проверки isGuest в AddExpenseScreen
- [ ] Добавить проверки isGuest в AddReminderScreen
- [ ] Обновить BiometricService
- [ ] Обновить AuthScreen (Social Auth UI)
- [ ] Добавить методы в ApiService
- [ ] Установить @invertase/react-native-apple-authentication
- [ ] Настроить Google Sign-In
- [ ] Настроить Apple Sign-In
- [ ] Добавить локализацию
- [ ] Добавить аналитику

### Backend:
- [ ] Создать миграцию для social auth полей
- [ ] Добавить методы loginWithGoogle/Apple в AuthController
- [ ] Установить google/apiclient
- [ ] Установить firebase/php-jwt
- [ ] Настроить .env с credentials
- [ ] Протестировать endpoints

### Testing:
- [ ] Тест: первый запуск
- [ ] Тест: гостевой режим
- [ ] Тест: автоматическая биометрия
- [ ] Тест: Google Sign-In
- [ ] Тест: Apple Sign-In
- [ ] Тест: переход гость → логин
- [ ] Тест: выход и повторный вход

---

## Риски и замечания

1. **Apple Sign-In обязателен** если есть Google Sign-In (App Store Review Guidelines)
2. **Apple может давать анонимный email** - учесть это в UI
3. **Биометрия может быть недоступна** - fallback на обычный логин
4. **Гостевые данные в AsyncStorage ограничены** - не хранить большие объемы
5. **Backend JWT верификация для Apple требует публичные ключи** - сложнее чем Google

---

## Аналитика

Добавить события:
- `welcome_screen_viewed`
- `continue_as_guest`
- `login_prompt_shown`
- `login_prompt_accepted`
- `login_prompt_dismissed`
- `google_signin_started`
- `google_signin_success`
- `apple_signin_started`
- `apple_signin_success`
- `biometric_auto_login_success`
- `guest_to_registered_conversion`

---

**Автор плана:** AI Assistant  
**Дата:** 12 октября 2025  
**Версия:** 1.0

