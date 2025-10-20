# 🧪 Тестирование Guest Mode - Login Prompt

## ✅ Что исправлено:

### 1. **History Screen - Добавление записи**
- Проверка isGuest **перед** открытием формы (в `handleAddRecord`)
- При клике на кнопку "Добавить запись" → показывается Login Prompt

### 2. **Reminders Screen - Добавление напоминания**
- Проверка isGuest **перед** открытием модалки (в `handleAddReminder`)
- При клике на кнопку "Добавить напоминание" → показывается Login Prompt

### 3. **Home Screen - Добавление авто**
- Проверка isGuest **перед** навигацией (в `AppNavigator.handleAddCar`)
- При клике на кнопку "Добавить автомобиль" → показывается Login Prompt

### 4. **Логирование**
- Добавлены логи для отладки:
  - `🔔 promptToLogin called` - когда вызывается promptToLogin
  - `🔔 handleLoginPrompt called` - когда обрабатывается callback
  - `👤 Guest trying to add...` - когда гость пытается что-то добавить

---

## 🧪 Сценарий тестирования:

### Перезапуск с очисткой кэша:
```bash
cd /Users/alexg/alexg-service/myGarage/mobile
npm run ios:fresh
```

### Тест 1: История (History)
1. **Войдите как Гость** (Continue as Guest)
2. Откройте экран **History** (История)
3. Нажмите кнопку **"Добавить запись"**
4. **Ожидается:** Появляется модалка Login Prompt
5. **В консоли:** 
   ```
   👤 Guest trying to add record, showing login prompt
   🔔 promptToLogin called, onLoginPrompt exists: true
   🔔 Calling onLoginPrompt callback
   🔔 handleLoginPrompt called, setting showLoginPrompt to true
   ```

### Тест 2: Напоминания (Reminders)
1. Будучи гостем, откройте экран **Reminders** (Напоминания)
2. Нажмите кнопку **"Добавить напоминание"**
3. **Ожидается:** Появляется модалка Login Prompt
4. **В консоли:**
   ```
   👤 Guest trying to add reminder, showing login prompt
   🔔 promptToLogin called, onLoginPrompt exists: true
   🔔 Calling onLoginPrompt callback
   🔔 handleLoginPrompt called, setting showLoginPrompt to true
   ```

### Тест 3: Добавление авто (Home)
1. Будучи гостем, на **Home** экране нажмите **"Добавить автомобиль"**
2. **Ожидается:** Появляется модалка Login Prompt
3. **В консоли:**
   ```
   👤 Guest trying to add car, showing login prompt
   🔔 handleLoginPrompt called, setting showLoginPrompt to true
   ```

---

## 🎯 Модалка Login Prompt должна показывать:

- **Заголовок**: "Login to Continue" (или перевод)
- **Сообщение**: "Create an account to add vehicles and sync your data across devices"
- **Кнопки**:
  - "Login" → переход на Auth screen (mode: login)
  - "Register" → переход на Auth screen (mode: register)
  - "×" (закрыть) → закрывает модалку

---

## 🐛 Если модалка НЕ появляется:

Проверьте консоль:

### Если видите ТОЛЬКО `🔔 promptToLogin called` БЕЗ последующих логов:
- Проблема: callback `onLoginPrompt` не передан
- Проверьте: `AuthProvider onLoginPrompt={handleLoginPrompt}` в AppNavigator

### Если НЕ видите логов вообще:
- Проблема: проверка isGuest не срабатывает
- Проверьте: `guest_mode` в AsyncStorage (`🔐 Auth check` лог)

### Если видите ВСЕ логи, но модалки нет:
- Проблема: state `showLoginPrompt` не связан с модалкой
- Проверьте: передача props в `AppNavigatorContent`

---

## 📋 Структура связей:

```
Screen (HistoryScreen/RemindersScreen/HomeScreen)
  ↓
  isGuest check → promptToLogin()
  ↓
AuthContext.promptToLogin()
  ↓
  onLoginPrompt() callback
  ↓
AppNavigator.handleLoginPrompt()
  ↓
  setShowLoginPrompt(true)
  ↓
AppNavigatorContent (showLoginPrompt prop)
  ↓
<LoginPromptModal visible={showLoginPrompt} />
```

---

## 🔧 Быстрые команды:

```bash
# Полная перезагрузка
cd /Users/alexg/alexg-service/myGarage/mobile && npm run ios:fresh

# Очистка кэша
cd /Users/alexg/alexg-service/myGarage/mobile && npm run cache:clear

# Обычный запуск
cd /Users/alexg/alexg-service/myGarage/mobile && npm run ios
```

