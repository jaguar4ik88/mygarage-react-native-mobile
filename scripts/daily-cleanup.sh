#!/bin/bash

# Ежедневная очистка для предотвращения проблем со сборкой
# Запускайте этот скрипт каждый день перед началом работы

echo "🧹 Ежедневная очистка проекта..."

# Переходим в директорию проекта
cd "$(dirname "$0")/.."

# 1. Завершаем все процессы разработки
echo "🛑 Завершение процессов..."
pkill -f Xcode 2>/dev/null || true
pkill -f xcodebuild 2>/dev/null || true
pkill -f expo 2>/dev/null || true
pkill -f metro 2>/dev/null || true

# 2. Очищаем кэш Xcode
echo "🧹 Очистка кэша Xcode..."
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Caches/com.apple.dt.Xcode

# 3. Очищаем кэш Expo/React Native
echo "🧹 Очистка кэша Expo..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf ios/build

# 4. Очищаем кэш npm/yarn
echo "🧹 Очистка кэша пакетов..."
npm cache clean --force 2>/dev/null || true
yarn cache clean 2>/dev/null || true

# 5. Переустанавливаем зависимости (только если нужно)
if [ "$1" = "--full" ]; then
    echo "📦 Полная переустановка зависимостей..."
    rm -rf node_modules
    npm install
    
    cd ios
    rm -rf Pods Podfile.lock
    pod install
    cd ..
fi

# 6. Очищаем системные кэши
echo "🧹 Очистка системных кэшей..."
rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/*/Symbols/System/Library/Caches
rm -rf ~/Library/Caches/com.apple.dt.Xcode

echo "✅ Ежедневная очистка завершена!"
echo "💡 Совет: Запускайте './scripts/daily-cleanup.sh' каждый день"
echo "💡 Для полной очистки: './scripts/daily-cleanup.sh --full'"
