#!/bin/bash

# Скрипт для исправления ошибок SwiftGeneratePch в Xcode

echo "🔧 Исправление настроек Xcode для решения ошибок SwiftGeneratePch..."

# Завершаем все процессы Xcode
echo "🛑 Завершение процессов Xcode..."
pkill -f Xcode 2>/dev/null || true
pkill -f xcodebuild 2>/dev/null || true
pkill -f expo 2>/dev/null || true

# Переходим в директорию iOS
cd "$(dirname "$0")/../ios"

# Очищаем кэш Xcode
echo "🧹 Очистка кэша Xcode..."
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf build

# Очищаем кэш pods
echo "🧹 Очистка кэша pods..."
rm -rf Pods
rm -rf Podfile.lock

# Очищаем кэш Expo
echo "🧹 Очистка кэша Expo..."
cd .. && rm -rf node_modules/.cache

# Переустанавливаем pods
echo "📦 Переустановка pods..."
cd ios && pod install

echo "✅ Настройки Xcode исправлены!"
echo "📱 Теперь попробуйте собрать проект в Xcode"
