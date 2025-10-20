# Android Build Commands

## Сборка APK без запуска эмулятора

### Способ 1: Через Gradle напрямую (рекомендуется)
```bash
cd mobile/android
./gradlew assembleRelease
```

### Способ 2: Через Expo CLI без эмулятора
```bash
cd mobile
npx expo run:android --variant release --no-install --no-bundler
```

### Способ 3: Через EAS Build (требует авторизации)
```bash
cd mobile
npx eas build --platform android
```

## Расположение собранного APK

После успешной сборки APK файл будет находиться в:
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

**Текущий APK файл:** 74MB, создан 27 сентября 2024 (20:08)
**Скопирован в:** `mobile/apk/app-release.apk`
**Изменения:** Убраны тестовые уведомления и логи, добавлена навигация к экрану напоминаний при клике на push-уведомление

## Проверка наличия APK файлов

```bash
# Поиск всех APK файлов в проекте
find mobile -name "*.apk" -type f

# Поиск в папке android
find mobile/android -name "*.apk" -type f
```

## Полезные команды

### Очистка предыдущих сборок
```bash
cd mobile/android
./gradlew clean
```

### Сборка debug версии
```bash
cd mobile/android
./gradlew assembleDebug
```

### Просмотр всех доступных задач Gradle
```bash
cd mobile/android
./gradlew tasks
```

## Решение проблем

### Проблема с Google Services
Если возникает ошибка "Missing project_info object":
```bash
# Проверьте наличие файла google-services.json
ls mobile/android/app/google-services.json

# Если файл отсутствует, скопируйте его из корня проекта
cp mobile/google-services.json mobile/android/app/google-services.json

# ВАЖНО: В проекте уже есть файл google-services.json в корне mobile/
# Он находится в .gitignore, поэтому не перезаписывайте его!
```

### Проблемы с файловой системой
Если возникают ошибки с удалением файлов:
```bash
# Остановите все процессы Gradle
./gradlew --stop

# Очистите кэш
rm -rf ~/.gradle/caches/
rm -rf mobile/android/.gradle/
rm -rf mobile/android/build/
rm -rf mobile/android/app/build/

# Пересоберите
./gradlew clean assembleRelease
```

### Проблемы с Metro Bundler
Если Metro Bundler не запускается:
```bash
# Очистите кэш Metro
npx react-native start --reset-cache

# Или очистите кэш npm
npm start -- --reset-cache
```

### Проблемы с архитектурой x86_64
Если возникают ошибки CMake с архитектурой x86_64:
```bash
# Соберите только для arm64-v8a (основная архитектура)
./gradlew assembleRelease -PtargetArchitectures=arm64-v8a
```

## Важные заметки

- **НЕ используйте** `expo run:android` без флагов `--no-install --no-bundler` - он попытается запустить эмулятор
- Для production сборки всегда используйте `assembleRelease`
- APK файлы обычно не добавляются в git репозиторий
- Размер APK может быть большим из-за включенных нативных библиотек
- Убедитесь, что у вас есть файл `google-services.json` в папке `android/app/`
