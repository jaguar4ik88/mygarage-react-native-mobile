# Google Sign-In Environment Setup

## 🔧 Настройка переменных окружения

### Backend (.env файл)

Добавьте следующие переменные в ваш `.env` файл в папке `backend/`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_web_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Где получить эти значения:

1. **GOOGLE_CLIENT_ID** - это Web Client ID из Google Cloud Console
2. **GOOGLE_CLIENT_SECRET** - это Client Secret из Google Cloud Console

### Важно:

- Используйте **Web Client ID**, а не iOS или Android Client ID
- Client ID должен совпадать с тем, что используется в мобильном приложении
- Client Secret нужен только для backend верификации

### Пример:

```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
```

После добавления переменных перезапустите Laravel сервер:

```bash
cd backend
php artisan serve
```
