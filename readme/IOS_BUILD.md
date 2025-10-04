# iOS Build Commands

## Автоматические команды для iOS

### Основные команды

```bash
# Обычный запуск iOS
npm run ios

# Запуск iOS с автоматическим исправлением Podfile
npm run ios:fix

# Полная пересборка iOS проекта
npm run ios:rebuild
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
