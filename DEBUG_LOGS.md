# Просмотр логов приложения на устройстве

## iOS - Через Xcode (рекомендуется)

### Способ 1: Device Console в Xcode
1. **Подключите iPhone к Mac**
2. **Откройте Xcode**
3. **Перейдите в Window > Devices and Simulators**
4. **Выберите ваше устройство**
5. **Нажмите "Open Console"**
6. **Фильтруйте по имени приложения:** `myGarage` или `com.mygarage.app`

### Способ 2: Через Xcode Console
1. **Откройте Xcode**
2. **Window > Devices and Simulators**
3. **Выберите устройство > View Device Logs**
4. **Найдите логи вашего приложения**

## iOS - Через терминал

### Через ios-deploy (если установлен)
```bash
# Установите ios-deploy если нет
npm install -g ios-deploy

# Просмотр логов в реальном времени
ios-deploy --debug --bundle com.mygarage.app
```

### Через idevicesyslog (если установлен)
```bash
# Установите libimobiledevice
brew install libimobiledevice

# Просмотр системных логов
idevicesyslog | grep -i mygarage
```

## Android - Через ADB

### Способ 1: ADB Logcat
```bash
# Подключите Android устройство
adb devices

# Просмотр логов приложения
adb logcat | grep -i mygarage

# Или более детальные логи
adb logcat ReactNativeJS:V ReactNative:V *:S
```

### Способ 2: Через Android Studio
1. **Откройте Android Studio**
2. **View > Tool Windows > Logcat**
3. **Выберите ваше устройство и приложение**

## Expo - Через Expo CLI

### Для Expo приложения
```bash
# В папке mobile
npx expo start --dev-client

# Логи будут отображаться в терминале
```

## React Native - Через Metro

### Если используете React Native CLI
```bash
# В папке mobile
npx react-native start

# Логи будут в терминале Metro
```

## Полезные команды для фильтрации логов

### iOS - Поиск логов уведомлений
```bash
# В Xcode Console или idevicesyslog
grep -i "notification\|🔔\|📱\|📋\|✅\|❌"
```

### Android - Поиск логов уведомлений
```bash
adb logcat | grep -i "notification\|🔔\|📱\|📋\|✅\|❌"
```

## Отладка push-уведомлений

### Что искать в логах:
- `🔔 Initializing NotificationService...`
- `📱 Device info:`
- `📋 Existing notification status:`
- `✅ Notification permissions granted successfully`
- `🧪 Testing notification capability...`
- `🎉 NotificationService initialized successfully`

### Если логи не видны:
1. **Убедитесь, что приложение запущено на устройстве**
2. **Проверьте, что устройство подключено**
3. **Попробуйте перезапустить приложение**
4. **Убедитесь, что используется правильный bundle ID**

## Альтернативные способы

### 1. React Native Debugger
```bash
# Установите React Native Debugger
brew install --cask react-native-debugger

# Запустите приложение с отладкой
npx react-native start --reset-cache
```

### 2. Flipper (Meta)
```bash
# Установите Flipper
brew install --cask flipper

# Подключите устройство и приложение
```

### 3. Через код (временное решение)
Добавьте в код приложения:
```typescript
// В App.tsx или любом компоненте
console.log('🔍 Debug info:', {
  platform: Platform.OS,
  isDevice: Device.isDevice,
  timestamp: new Date().toISOString()
});
```

## Важные заметки

- **Логи видны только когда приложение запущено**
- **Некоторые логи могут быть скрыты в production сборке**
- **Убедитесь, что устройство доверяет компьютеру (iOS)**
- **Для Android включите USB Debugging**
