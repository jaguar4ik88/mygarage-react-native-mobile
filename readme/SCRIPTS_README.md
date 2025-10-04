# iOS Build Fix Scripts

## Проблема
При каждом `expo prebuild --platform ios` возникает ошибка с `use_modular_headers!` в Podfile.

## Решение
Создан автоматический скрипт `fix-podfile.js`, который:
1. Проверяет наличие `use_modular_headers!` в Podfile
2. Автоматически добавляет его после `use_expo_modules!` если отсутствует
3. Запускается автоматически после `npm install` через postinstall hook

## Файлы
- `scripts/fix-podfile.js` - основной скрипт
- `package.json` - добавлен postinstall hook
- `expo-module.config.json` - дополнительная конфигурация (не сработала)

## Использование
Скрипт запускается автоматически при:
- `npm install`
- `expo prebuild --platform ios`
- Любом изменении зависимостей

## Ручной запуск
```bash
node scripts/fix-podfile.js
```

## Проверка
После запуска в Podfile должно быть:
```ruby
target 'myGarage' do
  use_expo_modules!
  use_modular_headers!
  # ... остальной код
end
```
