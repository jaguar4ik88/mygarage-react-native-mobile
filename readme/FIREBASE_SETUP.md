# 🔥 Firebase Setup для myGarage

## ✅ Текущий статус

Firebase настроен и работает! Включает:
- **Analytics** - отслеживание поведения пользователей
- **Crashlytics** - логирование ошибок и крашей

---

## 📝 Важно знать

### Когда изменения в AppDelegate сохраняются:
- ✅ Обычная сборка: `npx expo run:ios`
- ✅ Переустановка pods: `cd ios && pod install`
- ✅ Обновление npm пакетов: `npm update`

### Когда нужна пересборка:
Только при **полном удалении `ios/` папки**:
```bash
rm -rf ios/
npx expo prebuild --platform ios
```

**В этом случае** наш Config Plugin автоматически восстановит инициализацию Firebase!

---

## 🔧 Файлы конфигурации

### 1. `firebase.json`
Настройки Crashlytics для React Native:
```json
{
  "react-native": {
    "crashlytics_debug_enabled": true,           // ✅ Включен в debug режиме
    "crashlytics_auto_collection_enabled": true, // ✅ Автосбор крашей
    "crashlytics_ndk_enabled": true,             // ✅ NDK для нативных крашей
    "crashlytics_javascript_exception_handler_chaining_enabled": false, // ⛔️ Отключены дубликаты
    "crashlytics_is_error_generation_on_js_crash_enabled": true        // ✅ JS stack traces
  }
}
```

### 2. `app.json` - Expo Config Plugins
```json
"plugins": [
  "@react-native-firebase/app",
  "@react-native-firebase/crashlytics",
  "./plugins/withFirebaseAppDelegate.js"  // 🔧 Наш кастомный плагин
]
```

### 3. `ios/myGarage/AppDelegate.swift`
Нативная инициализация:
```swift
import Firebase

public override func application(...) -> Bool {
  FirebaseApp.configure() // ✅ Инициализация Firebase
  // ... остальной код
}
```

---

## 🧪 Как протестировать

### 1. Откройте приложение
```bash
npx expo run:ios
```

### 2. Проверьте логи Metro
Должны увидеть:
```
🔥 Firebase will auto-initialize from GoogleService-Info.plist
✅ Firebase App ready: [DEFAULT]
✅ Firebase Analytics initialized
✅ Firebase Crashlytics initialized
```

### 3. Протестируйте Crashlytics

1. Откройте **Профиль** в приложении
2. Прокрутите вниз до **🧪 Test Crashlytics**
3. Нажмите и выберите тип теста:
   - **Тестовая ошибка** - записывает ошибку без краша
   - **API ошибка** - тестирует логирование API ошибок
   - **Screen ошибка** - тестирует логирование UI ошибок
   - **Краш приложения** - принудительный краш (⚠️ закроет приложение)

4. Проверьте [Firebase Console](https://console.firebase.google.com/) → **Crashlytics** через 5-10 минут

---

## 📊 Что логируется автоматически

### В Crashlytics:
- ✅ Все необработанные JavaScript исключения
- ✅ Нативные краши (iOS/Android)
- ✅ API ошибки (через `api.ts`)
- ✅ UI ошибки (через `ErrorBoundary`)
- ✅ Пользовательские атрибуты (user ID, email)

### В Analytics:
- ✅ События входа/регистрации
- ✅ Навигация между экранами
- ✅ Действия пользователя

---

## 🔍 Где находится код Firebase

### Основные файлы:
- `/src/services/crashlyticsService.ts` - сервис для Crashlytics
- `/src/components/ErrorBoundary.tsx` - отлов UI ошибок
- `/src/services/api.ts` - логирование API ошибок
- `/src/screens/AuthScreen.tsx` - установка user ID
- `/src/screens/ProfileScreen.tsx` - тестирование (в `__DEV__` режиме)

### Нативные файлы:
- `/ios/myGarage/GoogleService-Info.plist` - конфиг Firebase для iOS
- `/ios/myGarage/AppDelegate.swift` - инициализация Firebase
- `/android/app/google-services.json` - конфиг Firebase для Android

---

## 🛠 Troubleshooting

### Ошибка: "No Firebase App '[DEFAULT]' has been created"

**Причина:** Firebase не инициализирован в нативном коде

**Решение:**
1. Проверьте `ios/myGarage/AppDelegate.swift`:
   ```swift
   import Firebase
   FirebaseApp.configure()
   ```

2. Пересоберите:
   ```bash
   npx expo run:ios
   ```

### Crashlytics не работает в debug режиме

**Причина:** По умолчанию отключен

**Решение:** Уже включен в `firebase.json`:
```json
"crashlytics_debug_enabled": true
```

### Firebase Console показывает "No data"

**Причины:**
- Данные приходят с задержкой 5-10 минут
- Не выполнили тестовый краш
- Не пересобрали после изменений

**Решение:** Подождите или запустите тест из Профиля

---

## 📚 Полезные ссылки

- [React Native Firebase Docs](https://rnfirebase.io/)
- [Crashlytics Usage](https://rnfirebase.io/crashlytics/usage)
- [Firebase Console](https://console.firebase.google.com/)
- [Stack Overflow: Firebase initialization](https://stackoverflow.com/questions/40563140/error-no-firebase-app-default-has-been-created-call-firebase-app-initiali)

---

## ✨ Итог

Firebase полностью настроен и будет работать автоматически! Даже если удалите папку `ios/`, наш Config Plugin восстановит всё при следующем `expo prebuild`. 🎉
