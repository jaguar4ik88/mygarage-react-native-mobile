# Обновление системы иконок

## Переход на Material Icons

Приложение было обновлено для использования Material Icons - профессиональной библиотеки иконок от Google с более чем 2000 иконками.

### Что изменилось

1. **Используется библиотека react-native-vector-icons**
   - Material Icons уже установлены в проекте
   - Не требует дополнительной установки

2. **Обновлен компонент Icon**
   - Заменены Unicode символы на Material Icons
   - Использует react-native-vector-icons/MaterialIcons
   - Расширена карта иконок с более чем 100 иконками

3. **Создан демонстрационный компонент IconShowcase**
   - Показывает все доступные иконки, сгруппированные по категориям
   - Демонстрирует правильное использование компонента

### Доступные иконки

#### Навигация
- `home` - Главная
- `manual` - Руководство  
- `reminders` - Напоминания
- `sto` - СТО
- `history` - История
- `profile` - Профиль

#### Действия
- `add` - Добавить
- `edit` - Редактировать
- `delete` - Удалить
- `close` - Закрыть
- `search` - Поиск
- `filter` - Фильтр
- `sort` - Сортировка

#### Статус
- `success` - Успех
- `error` - Ошибка
- `warning` - Предупреждение
- `info` - Информация
- `notification` - Уведомление

#### Стрелки
- `arrow-up`, `arrow-down`, `arrow-left`, `arrow-right` - Основные стрелки
- `chevron-up`, `chevron-down`, `chevron-left`, `chevron-right` - Шевроны
- `chevrons-up`, `chevrons-down`, `chevrons-left`, `chevrons-right` - Двойные шевроны

#### Файлы и медиа
- `file-pdf` - PDF файл
- `file` - Файл
- `folder` - Папка
- `image` - Изображение
- `video` - Видео
- `download` - Скачать
- `upload` - Загрузить

#### Автомобиль
- `car` - Автомобиль
- `wrench` - Гаечный ключ
- `tool` - Инструмент
- `gauge` - Спидометр
- `battery` - Батарея
- `truck` - Грузовик

#### Коммуникация
- `phone` - Телефон
- `mail` - Почта
- `message-circle` - Сообщение
- `share` - Поделиться
- `external-link` - Внешняя ссылка
- `link` - Ссылка

#### Дополнительные
- `star` - Звезда
- `heart` - Сердце
- `settings` - Настройки
- `logout` - Выход
- `calendar` - Календарь
- `clock` - Часы
- `eye` - Глаз
- `lock` - Замок
- `unlock` - Открыть замок
- `wifi` - Wi-Fi
- `signal` - Сигнал

### Использование

```tsx
import Icon from './src/components/Icon';

// Базовое использование
<Icon name="home" size={24} color={COLORS.primary} />

// С дополнительными параметрами
<Icon 
  name="add" 
  size={32} 
  color={COLORS.success} 
  strokeWidth={2.5}
  style={{ marginRight: 8 }}
/>

// В кнопке
<TouchableOpacity>
  <Icon name="edit" size={16} color={COLORS.text} />
</TouchableOpacity>
```

### Параметры компонента

- `name` (string) - Название иконки
- `size` (number) - Размер иконки в пикселях (по умолчанию: 24)
- `color` (string) - Цвет иконки (по умолчанию: COLORS.text)
- `style` (ViewStyle) - Дополнительные стили
- `strokeWidth` (number) - Толщина обводки (по умолчанию: 2)

### Преимущества Lucide Icons

1. **Консистентность** - Все иконки следуют единому дизайн-стилю
2. **Качество** - Высококачественные SVG иконки
3. **Производительность** - Tree-shakable, импортируются только используемые иконки
4. **Масштабируемость** - Векторные иконки отлично масштабируются
5. **Настраиваемость** - Легко настраиваются цвет, размер и толщина обводки
6. **Активное сообщество** - Регулярные обновления и новые иконки

### Демонстрация

Для просмотра всех доступных иконок используйте компонент `IconShowcase`:

```tsx
import IconShowcase from './src/components/IconShowcase';

// В вашем экране
<IconShowcase />
```

### Миграция

Все существующие компоненты продолжат работать без изменений. Старые названия иконок автоматически сопоставляются с новыми Lucide иконками.

### Ссылки

- [Lucide Icons](https://lucide.dev/)
- [GitHub Repository](https://github.com/lucide-icons/lucide)
- [React Native Package](https://www.npmjs.com/package/lucide-react-native)
