# Настройка Push-уведомлений для iOS

## Проблема
После установки IPA файла на iPhone не работают push-уведомления.

## Решение

### 1. Настройки в Apple Developer Console

1. **Войдите в [Apple Developer Console](https://developer.apple.com/account/)**
2. **Перейдите в Certificates, Identifiers & Profiles**
3. **Выберите ваш App ID** (`com.mygarage.app`)
4. **Включите Push Notifications capability:**
   - Нажмите "Edit"
   - Включите "Push Notifications"
   - Создайте Certificate для Push Notifications (если еще не создан)
   - Создайте Provisioning Profile с включенными Push Notifications

### 2. Настройки в Firebase Console

1. **Войдите в [Firebase Console](https://console.firebase.google.com/)**
2. **Выберите ваш проект myGarage**
3. **Перейдите в Project Settings > Cloud Messaging**
4. **Добавьте iOS приложение** (если еще не добавлено):
   - Bundle ID: `com.mygarage.app`
   - Team ID: (ваш Apple Developer Team ID)
   - Upload APNs certificate или ключ

### 3. Проверка файлов проекта

Убедитесь, что у вас есть:
- ✅ `GoogleService-Info.plist` в корне проекта
- ✅ Правильный Bundle ID в app.json
- ✅ Плагин expo-notifications в app.json
- ✅ UIBackgroundModes в infoPlist

### 4. Пересборка приложения

После внесения изменений в app.json:

```bash
# Очистите кэш
npx expo install --fix

# Пересоберите iOS приложение
npx expo run:ios --device
# или
eas build --platform ios
```

### 5. Проверка на устройстве

1. **Установите приложение на iPhone**
2. **Откройте приложение** и дайте разрешения на уведомления
3. **Проверьте настройки iPhone:**
   - Settings > Notifications > myGarage
   - Убедитесь, что Allow Notifications включено
   - Проверьте, что Sounds и Badges включены

### 6. Тестирование

В приложении есть функция тестового уведомления. Проверьте, работает ли она.

## Важные моменты

- **Push-уведомления работают только на физических устройствах**, не в симуляторе
- **Для development сборки** нужен Development Certificate
- **Для production сборки** нужен Production Certificate
- **Проверьте, что приложение зарегистрировано в APNs** при запуске

## Отладка

Если уведомления все еще не работают:

1. **Проверьте логи в Xcode Console** - должны быть видны эмодзи логи 🔔📱📋✅
2. **Убедитесь, что Firebase проект настроен правильно**
3. **Проверьте, что Certificate действителен**
4. **Убедитесь, что Bundle ID совпадает во всех местах**
5. **ВАЖНО:** Приложение автоматически отправляет тестовое уведомление при инициализации
6. **Проверьте настройки iOS:** Settings > Notifications > myGarage

### Возможные проблемы
- **Файлы уведомлений отсутствуют** - исправлено в app.json
- **Неправильные разрешения** - проверьте настройки iOS
- **Проблемы с Firebase** - убедитесь, что APNs сертификат настроен
- **Эмулятор вместо устройства** - push-уведомления работают только на реальных устройствах
- **Циклический вызов в NotificationService** - исправлено в notificationService.ts
- **Страница не грузится** - исправлено в RemindersScreen.tsx (добавлен try-catch для уведомлений)

## Ссылки

- [Apple Push Notifications Documentation](https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging for iOS](https://firebase.google.com/docs/cloud-messaging/ios/client)
