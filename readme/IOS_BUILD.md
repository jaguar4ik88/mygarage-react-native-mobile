# iOS Build Guide

## Важно: Открытие проекта в Xcode

⚠️ **ВСЕГДА открывайте `.xcworkspace`, а не `.xcodeproj`!**

```bash
# Правильно - открыть workspace
open ios/myGarage.xcworkspace

# НЕПРАВИЛЬНО - не открывайте .xcodeproj напрямую
# open ios/myGarage.xcodeproj  # ❌ НЕ ДЕЛАЙТЕ ТАК
```

Если вы открыли `.xcodeproj` вместо `.xcworkspace`, Xcode не сможет найти модули из CocoaPods и возникнут ошибки компиляции.

## Автоматические команды для iOS

### Основные команды

```bash
# Обычный запуск iOS
npm run ios

# Запуск iOS с автоматическим исправлением Podfile
npm run ios:fix

# Полная пересборка iOS проекта
npm run ios:rebuild

# Глубокая очистка (очищает DerivedData, Pods и переустанавливает всё)
npm run ios:deep-clean
```

### Что делают команды

#### `npm run ios`
- Стандартный запуск iOS приложения
- Использует существующую конфигурацию

#### `npm run ios:fix`
- Автоматически добавляет `use_modular_headers!` в Podfile
- Запускает iOS приложение
- Рекомендуется использовать при ошибках с Firebase

#### `npm run ios:rebuild`
- Полная пересборка iOS проекта:
  1. Исправляет Podfile
  2. Очищает build папку
  3. Пересоздает iOS проект
  4. Снова исправляет Podfile
  5. Устанавливает CocoaPods
- Используйте при серьезных проблемах с iOS сборкой

### Автоматические исправления

Скрипт `scripts/fix-podfile.js` автоматически:
- Проверяет наличие `use_modular_headers!` в Podfile
- Добавляет его после `use_expo_modules!` если отсутствует
- Запускается при `npm install` (postinstall)

### Решение проблем

#### Ошибка: "The Swift pod FirebaseCoreInternal depends upon GoogleUtilities"
```bash
npm run ios:fix
```

#### Ошибка: "Unable to find a specification for ExpoModulesCore"
```bash
npm run ios:rebuild
```

#### Ошибка: "No script URL provided"
```bash
npm start
# В другом терминале:
npm run ios
```

#### Ошибка: "EXApplication.modulemap not found" или "SwiftGeneratePch emitted errors"
Эти ошибки обычно связаны с кэшем Xcode. Решение:

**Если запускаете через Xcode:**
1. Закройте Xcode полностью
2. Выполните в терминале:
```bash
# Очистка DerivedData и кэшей
rm -rf ~/Library/Developer/Xcode/DerivedData/myGarage-*
cd ios
rm -rf build Pods Podfile.lock
pod install
cd ..
```
3. Откройте проект заново через workspace:
```bash
open ios/myGarage.xcworkspace
```
4. В Xcode: `Product` → `Clean Build Folder` (⇧⌘K)
5. В Xcode: `Product` → `Build` (⌘B)

**Если запускаете через npm:**
```bash
# Вариант 1: Глубокая очистка (рекомендуется)
npm run ios:deep-clean

# Вариант 2: Полная пересборка iOS проекта
npm run ios:rebuild

# Вариант 3: Очистка вручную
rm -rf ~/Library/Developer/Xcode/DerivedData/myGarage-*
cd ios
rm -rf build Pods Podfile.lock
pod install
cd ..
npm run ios
```

#### Ошибка: "module map file not found"
```bash
# Очистите DerivedData и переустановите Pods
rm -rf ~/Library/Developer/Xcode/DerivedData/*
cd ios
rm -rf build Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Сборка через Xcode

**Правильная последовательность:**

1. **Откройте workspace** (не project!):
   ```bash
   open ios/myGarage.xcworkspace
   ```

2. **Выберите схему и симулятор/устройство:**
   - Вверху Xcode выберите схему: `myGarage`
   - Выберите симулятор или подключенное устройство

3. **Очистите предыдущую сборку:**
   - `Product` → `Clean Build Folder` (или ⇧⌘K)

4. **Соберите проект:**
   - `Product` → `Build` (или ⌘B)

5. **Запустите:**
   - `Product` → `Run` (или ⌘R)

**При ошибках сборки:**
1. Закройте Xcode
2. Выполните `npm run ios:deep-clean`
3. Откройте workspace заново: `open ios/myGarage.xcworkspace`
4. В Xcode: `Product` → `Clean Build Folder` (⇧⌘K)
5. В Xcode: `Product` → `Build` (⌘B)

### Ручное исправление Podfile

Если автоматические команды не работают:

```bash
# Откройте Podfile
open ios/Podfile

# Добавьте use_modular_headers! после use_expo_modules!
target 'myGarage' do
  use_expo_modules!
  use_modular_headers!
  # ... остальной код
end
```
