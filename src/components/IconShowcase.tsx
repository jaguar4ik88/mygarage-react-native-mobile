import * as React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING } from '../constants';

const IconShowcase: React.FC = () => {
  const iconCategories = [
    {
      title: 'Навигация',
      icons: [
        { name: 'home', label: 'Главная' },
        { name: 'manual', label: 'Руководство' },
        { name: 'reminders', label: 'Напоминания' },
        { name: 'sto', label: 'СТО' },
        { name: 'history', label: 'История' },
        { name: 'profile', label: 'Профиль' },
      ]
    },
    {
      title: 'Действия',
      icons: [
        { name: 'add', label: 'Добавить' },
        { name: 'edit', label: 'Редактировать' },
        { name: 'delete', label: 'Удалить' },
        { name: 'close', label: 'Закрыть' },
        { name: 'search', label: 'Поиск' },
        { name: 'filter', label: 'Фильтр' },
      ]
    },
    {
      title: 'Статус',
      icons: [
        { name: 'success', label: 'Успех' },
        { name: 'error', label: 'Ошибка' },
        { name: 'warning', label: 'Предупреждение' },
        { name: 'info', label: 'Информация' },
        { name: 'notification', label: 'Уведомление' },
      ]
    },
    {
      title: 'Стрелки',
      icons: [
        { name: 'arrow-up', label: 'Вверх' },
        { name: 'arrow-down', label: 'Вниз' },
        { name: 'arrow-left', label: 'Влево' },
        { name: 'arrow-right', label: 'Вправо' },
        { name: 'chevron-up', label: 'Шеврон вверх' },
        { name: 'chevron-down', label: 'Шеврон вниз' },
      ]
    },
    {
      title: 'Файлы и медиа',
      icons: [
        { name: 'file-pdf', label: 'PDF файл' },
        { name: 'image', label: 'Изображение' },
        { name: 'video', label: 'Видео' },
        { name: 'download', label: 'Скачать' },
        { name: 'upload', label: 'Загрузить' },
        { name: 'folder', label: 'Папка' },
      ]
    },
    {
      title: 'Автомобиль',
      icons: [
        { name: 'car', label: 'Автомобиль' },
        { name: 'wrench', label: 'Гаечный ключ' },
        { name: 'tool', label: 'Инструмент' },
        { name: 'gauge', label: 'Спидометр' },
        { name: 'battery', label: 'Батарея' },
        { name: 'truck', label: 'Грузовик' },
      ]
    },
    {
      title: 'Коммуникация',
      icons: [
        { name: 'phone', label: 'Телефон' },
        { name: 'mail', label: 'Почта' },
        { name: 'message-circle', label: 'Сообщение' },
        { name: 'share', label: 'Поделиться' },
        { name: 'external-link', label: 'Внешняя ссылка' },
        { name: 'link', label: 'Ссылка' },
      ]
    },
    {
      title: 'Дополнительные',
      icons: [
        { name: 'star', label: 'Звезда' },
        { name: 'heart', label: 'Сердце' },
        { name: 'settings', label: 'Настройки' },
        { name: 'logout', label: 'Выход' },
        { name: 'calendar', label: 'Календарь' },
        { name: 'clock', label: 'Часы' },
      ]
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Material Icons</Text>
      <Text style={styles.subtitle}>Professional icons from Google Material Design</Text>
      
      {iconCategories.map((category, categoryIndex) => (
        <View key={categoryIndex} style={styles.category}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <View style={styles.iconGrid}>
            {category.icons.map((icon, iconIndex) => (
              <View key={iconIndex} style={styles.iconItem}>
                <Icon 
                  name={icon.name} 
                  size={32} 
                  color={COLORS.primary} 
                />
                <Text style={styles.iconLabel}>{icon.label}</Text>
                <Text style={styles.iconName}>{icon.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All icons now use Material Icons - a professional icon library from Google with over 2000 icons
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  category: {
    marginBottom: SPACING.lg,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  iconLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  iconName: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  footer: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default IconShowcase;
