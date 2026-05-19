# Создание Android App Bundle (AAB) для Google Play

## Разница между APK и AAB:

- **APK** (`app-release.apk`) - готовый файл для установки на устройство
- **AAB** (`app-release.aab`) - формат для Google Play Console (Google сам создает APK для разных устройств)

⚠️ **Google Play Console требует AAB, а не APK!**

## 🚀 Быстрая сборка AAB:

```bash
cd mobile/android
./gradlew bundleRelease
```

**Файл будет здесь:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

## 📤 Загрузка в Google Play Console:

1. Войдите в [Google Play Console](https://play.google.com/console)
2. Выберите приложение `myGarage` (Package: `uno.mygarage.app`)
3. Production → Create new release
4. Загрузите файл: `app-release.aab`

## ⚠️ Важно:

- Для первой загрузки можно использовать debug keystore (как сейчас в проекте)
- Для обновлений нужен тот же keystore - сохраните его!
- После первой загрузки Google Play сам управляет подпиской
