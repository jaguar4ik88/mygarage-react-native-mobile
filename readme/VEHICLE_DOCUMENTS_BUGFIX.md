# Исправление проблем в VehicleDocumentsScreen

## Дата: 2025-10-21

## Проблемы и решения

### 🐛 Проблема #1: Экран бесконечно грузится

**Симптом:**
Экран документов показывает индикатор загрузки и не переходит к контенту, даже если данные успешно загружены.

**Причина:**
В функции `loadDocuments` отсутствовал `setLoading(false)` после успешной загрузки данных:

```typescript
// ❌ БЫЛО
const loadDocuments = async () => {
  try {
    setLoading(true);
    const docs = await ApiService.getVehicleDocuments(vehicle.id);
    setDocuments(docs);
    // ОТСУТСТВУЕТ setLoading(false) !!!
  } catch (error: any) {
    console.error('Error loading documents:', error);
    if (error.upgrade_required) {
      setLoading(false);
      setShowPaywall(true);
    } else {
      Alert.alert('Ошибка', 'Не удалось загрузить документы');
      setLoading(false);
    }
  }
};
```

**Решение:**
Добавлен блок `finally` для гарантированного выключения loading:

```typescript
// ✅ СТАЛО
const loadDocuments = async () => {
  try {
    setLoading(true);
    const docs = await ApiService.getVehicleDocuments(vehicle.id);
    setDocuments(docs);
  } catch (error: any) {
    console.error('Error loading documents:', error);
    if (error.upgrade_required) {
      setShowPaywall(true);
    } else {
      Alert.alert('Ошибка', 'Не удалось загрузить документы');
    }
  } finally {
    setLoading(false); // ✅ Всегда выключается
  }
};
```

**Эффект:**
- Экран теперь корректно завершает загрузку и показывает контент
- Loading индикатор выключается в любом случае (успех или ошибка)

---

### 🐛 Проблема #2: Устаревший API ImagePicker

**Симптом:**
Ошибка TypeScript: `Property 'launchImagePickerAsync' does not exist`

**Причина:**
Использовался устаревший метод `launchImagePickerAsync`, который был заменен на `launchImageLibraryAsync` в новых версиях expo-image-picker.

**Решение:**
```typescript
// ❌ БЫЛО
const result = await ImagePicker.launchImagePickerAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: 0.8,
});

// ✅ СТАЛО  
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: 0.8,
});
```

**Эффект:**
- Устранена ошибка TypeScript
- Совместимость с актуальной версией expo-image-picker

---

## Рекомендации для будущего

### ✅ Best Practices для async функций с loading состоянием:

```typescript
const loadData = async () => {
  try {
    setLoading(true);
    const data = await fetchData();
    setData(data);
  } catch (error) {
    handleError(error);
  } finally {
    setLoading(false); // ВСЕГДА добавляйте finally!
  }
};
```

### ⚠️ Частые ошибки:

1. **Забыть `setLoading(false)` в успешном случае**
   - Симптом: бесконечная загрузка
   - Решение: использовать `finally` блок

2. **Дублирование `setLoading(false)` в catch**
   - Проблема: код повторяется
   - Решение: вынести в `finally`

3. **Использование устаревших API**
   - Проблема: ошибки TypeScript и runtime
   - Решение: проверять актуальную документацию

---

## Тестирование

### Тест 1: Загрузка документов (успешная)
1. Открыть экран документов для любой машины
2. ✅ Loading показывается
3. ✅ Loading исчезает после загрузки
4. ✅ Показывается список документов или пустое состояние

### Тест 2: Загрузка документов (ошибка подписки)
1. FREE план пытается открыть документы
2. ✅ Loading показывается
3. ✅ Loading исчезает
4. ✅ Показывается Paywall

### Тест 3: Выбор фото
1. Нажать "Добавить документ"
2. Нажать "Выбрать фото"
3. ✅ Открывается галерея
4. ✅ Выбранное фото отображается

---

## Затронутые файлы

- `mobile/src/screens/VehicleDocumentsScreen.tsx`

## Изменения

- Добавлен `finally` блок в `loadDocuments()`
- Исправлен `launchImagePickerAsync` → `launchImageLibraryAsync`

