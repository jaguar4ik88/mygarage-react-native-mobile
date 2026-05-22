# 🛠 Руководство по разработке myGarage

## Быстрый старт

### 1. Запуск всего проекта одной командой

Создайте файл `start-dev.sh` в корне проекта:

```bash
#!/bin/bash
echo "🚀 Запуск myGarage в режиме разработки..."

# Запуск Laravel API в фоне
echo "📡 Запуск Laravel API..."
cd backend && php artisan serve &
BACKEND_PID=$!

# Ожидание запуска API
sleep 5

# Запуск React Native приложения
echo "📱 Запуск React Native приложения..."
cd ../mobile && npm start

# Остановка API при завершении
trap "kill $BACKEND_PID" EXIT
```

Сделайте файл исполняемым:
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### 2. Настройка базы данных

#### MySQL
```sql
CREATE DATABASE mygarage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mygarage_user'@'localhost' IDENTIFIED BY 'mygarage_password';
GRANT ALL PRIVILEGES ON mygarage.* TO 'mygarage_user'@'localhost';
FLUSH PRIVILEGES;
```

#### PostgreSQL
```sql
CREATE DATABASE mygarage;
CREATE USER mygarage_user WITH PASSWORD 'mygarage_password';
GRANT ALL PRIVILEGES ON DATABASE mygarage TO mygarage_user;
```

### 3. Конфигурация для разных окружений

#### Development (.env)
```env
APP_ENV=local
APP_DEBUG=true
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mygarage
DB_USERNAME=mygarage_user
DB_PASSWORD=mygarage_password
```

#### Production (.env)
```env
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=mysql
DB_HOST=your_production_host
DB_PORT=3306
DB_DATABASE=mygarage_prod
DB_USERNAME=your_prod_user
DB_PASSWORD=your_secure_password
```

## 🔧 Полезные команды

### Backend команды

```bash
# Создание миграции
php artisan make:migration create_vehicles_table

# Создание модели с миграцией и контроллером
php artisan make:model Vehicle -mcr

# Создание API ресурса
php artisan make:resource VehicleResource

# Создание API контроллера
php artisan make:controller Api/VehicleController --api

# Запуск тестов
php artisan test

# Просмотр логов
tail -f storage/logs/laravel.log

# Очистка всех кэшей
php artisan optimize:clear
```

### Mobile команды

```bash
# Установка новых зависимостей
npm install package-name

# Обновление Expo
npx expo install --fix

# Очистка кэша
npx expo start -c

# Сборка для тестирования
npx expo build:android --type apk

# Просмотр логов
npx expo logs
```

## 🐛 Отладка

### Проблемы с API

1. **Проверьте статус API:**
   ```bash
   curl http://localhost:8000/api/health
   ```

2. **Проверьте CORS:**
   ```bash
   curl -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS \
        http://localhost:8000/api/auth/login
   ```

3. **Проверьте логи Laravel:**
   ```bash
   tail -f backend/storage/logs/laravel.log
   ```

### Проблемы с мобильным приложением

1. **Очистите кэш:**
   ```bash
   npx expo start -c
   ```

2. **Переустановите зависимости:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Проверьте Metro bundler:**
   ```bash
   npx expo start --clear
   ```

4. **Проблемы с React Navigation:**
   ```bash
   # Установка недостающих зависимостей
   npm install react-native-gesture-handler react-native-reanimated
   
   # Очистка кэша
   npx expo start -c
   ```

## 📱 Тестирование на устройствах

### Android

1. **Эмулятор:**
   ```bash
   npx expo start --android
   ```

2. **Физическое устройство:**
   - Установите Expo Go
   - Отсканируйте QR код
   - Убедитесь, что устройство и компьютер в одной сети

### iOS

1. **Симулятор (только macOS):**
   ```bash
   npx expo start --ios
   ```

2. **Физическое устройство:**
   - Установите Expo Go
   - Отсканируйте QR код

## 🔐 Настройка аутентификации

### Laravel Sanctum

1. **Публикация конфигурации:**
   ```bash
   php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
   ```

2. **Настройка middleware:**
   ```php
   // app/Http/Kernel.php
   'api' => [
       \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
       'throttle:api',
       \Illuminate\Routing\Middleware\SubstituteBindings::class,
   ],
   ```

3. **Настройка CORS:**
   ```php
   // config/cors.php
   'allowed_origins' => [
       'http://localhost:3000',
       'http://192.168.1.100:3000',
   ],
   ```

## 📊 Мониторинг и логи

### Laravel

1. **Включение подробных логов:**
   ```env
   LOG_LEVEL=debug
   ```

2. **Просмотр логов в реальном времени:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

3. **Очистка логов:**
   ```bash
   php artisan log:clear
   ```

### React Native

1. **Включение отладки:**
   - Встряхните устройство
   - Выберите "Debug Remote JS"

2. **Просмотр логов:**
   ```bash
   npx expo logs
   ```

## 🚀 Деплой

### Backend (VPS)

1. **Подготовка сервера:**
   ```bash
   # Установка PHP 8.2+
   sudo apt update
   sudo apt install php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring

   # Установка Composer
   curl -sS https://getcomposer.org/installer | php
   sudo mv composer.phar /usr/local/bin/composer

   # Установка Nginx
   sudo apt install nginx

   # Установка MySQL
   sudo apt install mysql-server
   ```

2. **Деплой кода:**
   ```bash
   git clone <repository-url>
   cd mygarage/backend
   composer install --no-dev
   cp .env.example .env
   # Настройте .env файл
   php artisan key:generate
   php artisan migrate
   ```

3. **Настройка Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/mygarage/backend/public;

       add_header X-Frame-Options "SAMEORIGIN";
       add_header X-Content-Type-Options "nosniff";

       index index.php;

       charset utf-8;

       location / {
           try_files $uri $uri/ /index.php?$query_string;
       }

       location = /favicon.ico { access_log off; log_not_found off; }
       location = /robots.txt  { access_log off; log_not_found off; }

       error_page 404 /index.php;

       location ~ \.php$ {
           fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
           fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
           include fastcgi_params;
       }

       location ~ /\.(?!well-known).* {
           deny all;
       }
   }
   ```

### Mobile (App Stores)

1. **Настройка EAS Build:**
   ```bash
   npm install -g @expo/eas-cli
   eas login
   eas build:configure
   ```

2. **Сборка приложения:**
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

3. **Загрузка в магазины:**
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

---

**Удачной разработки! 🚗💨**
