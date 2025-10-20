# 🚀 Команды для разработки myGarage Mobile

## 📱 Основные команды для iOS

### Обычный запуск (без очистки)
```bash
npm run ios
# или
npx expo run:ios
```
**Когда использовать:** Обычная разработка, когда не меняли native код или зависимости.

---

### ✨ Свежий запуск (с очисткой кэша Metro)
```bash
npm run ios:fresh
```
**Что делает:**
- Очищает `node_modules/.cache`
- Запускает `expo run:ios`

**Когда использовать:** 
- После изменений в коде
- Если видите старые данные/компоненты
- После git pull
- **⭐ РЕКОМЕНДУЕТСЯ для тестирования новых фич**

---

### 🔥 Полная очистка + rebuild
```bash
npm run ios:clean
```
**Что делает:**
- Удаляет iOS build
- Переустанавливает CocoaPods
- Очищает кэш Metro
- Собирает заново

**Когда использовать:**
- После обновления Firebase/native пакетов
- После изменений в `app.json`
- Если `ios:fresh` не помогло
- После добавления/удаления Expo Config Plugins

---

## 🎯 Metro Bundler отдельно

### Запуск Metro с очисткой кэша
```bash
npm run start:clear
```
**Когда использовать:** Если у вас уже собрано приложение в симуляторе, но нужно обновить JavaScript код.

### Обычный Metro
```bash
npm start
```

---

## 🧹 Очистка кэша

### Очистить только кэш (без запуска)
```bash
npm run cache:clear
```
**Что делает:**
- Удаляет `node_modules/.cache`
- Очищает watchman (если установлен)

---

## 🤖 Android команды

### Обычный запуск
```bash
npm run android
```

### Свежий запуск
```bash
npm run android:fresh
```

---

## 📝 Типичные сценарии

### Сценарий 1: Изменили код, нужно протестировать
```bash
# Если Metro уже запущен - просто перезагрузите приложение в симуляторе (Cmd+R)
# Если нет:
npm run ios:fresh
```

### Сценарий 2: Добавили новую npm зависимость
```bash
npm install
npm run ios:fresh
```

### Сценарий 3: Изменили Firebase config или app.json
```bash
npm run ios:clean
```

### Сценарий 4: Приложение ведет себя странно / старый код
```bash
# Попробуйте по порядку:
npm run cache:clear
npm run start:clear

# Если не помогло:
npm run ios:fresh

# Если всё равно проблема:
npm run ios:clean
```

### Сценарий 5: После git pull с изменениями в зависимостях
```bash
npm install
npm run ios:fresh
```

---

## ⚡ Быстрая справка

| Команда | Когда | Время |
|---------|-------|-------|
| `npm run ios` | Обычная разработка | ~30 сек |
| `npm run ios:fresh` | После изменений кода | ~40 сек |
| `npm run ios:clean` | После native изменений | ~3-5 мин |
| `npm run start:clear` | Обновить JS без rebuild | ~10 сек |

---

## 🔧 Дополнительные команды

### Перезапуск приложения в симуляторе
- **Reload JS**: `Cmd + R`
- **Debug Menu**: `Cmd + D`
- **Закрыть приложение**: `Cmd + Shift + H` затем смахнуть вверх

### Полная перезагрузка симулятора
```bash
# Закрыть симулятор
# Device -> Erase All Content and Settings...
# Или:
xcrun simctl erase all
```

---

## 💡 Рекомендации

**Для ежедневной разработки:**
```bash
npm run ios:fresh
```

**После pull request / изменений в зависимостях:**
```bash
npm install && npm run ios:fresh
```

**Если ничего не работает:**
```bash
# Ядерный вариант
rm -rf node_modules
npm install
npm run ios:clean
```

---

**Создано:** 2025-10-12  
**Последнее обновление:** 2025-10-12

