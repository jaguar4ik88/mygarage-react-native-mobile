require('dotenv').config();

// Функция для извлечения Client ID из полного значения
const extractClientId = (fullClientId) => {
  if (!fullClientId) return null;
  return fullClientId.replace('.apps.googleusercontent.com', '');
};

// Генерация URL schemes из переменных окружения
// Важно: URL schemes должны начинаться с буквы согласно RFC1738
// Используем только полный формат com.googleusercontent.apps.{CLIENT_ID}
const generateGoogleUrlSchemes = () => {
  const schemes = [];
  
  // iOS Client ID
  const iosClientId = extractClientId(process.env.GOOGLE_IOS_CLIENT_ID);
  if (iosClientId) {
    schemes.push({
      CFBundleURLSchemes: [
        `com.googleusercontent.apps.${iosClientId}`
        // Не добавляем короткий формат, так как он начинается с цифры и не соответствует RFC1738
      ]
    });
  }
  
  // Web Client ID
  const webClientId = extractClientId(process.env.GOOGLE_WEB_CLIENT_ID);
  if (webClientId) {
    schemes.push({
      CFBundleURLSchemes: [
        `com.googleusercontent.apps.${webClientId}`
        // Не добавляем короткий формат, так как он начинается с цифры и не соответствует RFC1738
      ]
    });
  }
  
  return schemes;
};

module.exports = ({ config }) => {
  const googleUrlSchemes = generateGoogleUrlSchemes();
  
  return {
    ...require('./app.json').expo,
    plugins: [
      [
        'expo-build-properties',
        {
          ios: {
            useModularHeaders: true,
            infoPlist: {
              CFBundleURLTypes: [
                // App schemes
                {
                  CFBundleURLSchemes: [
                    'mygarage',
                    'uno.mygarage.com'
                  ]
                },
                // Google URL schemes из .env
                ...googleUrlSchemes
              ]
            }
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/ic_launcher/ios/AppIcon.appiconset/ItunesArtwork@2x.png',
          color: '#ffffff',
          mode: 'production',
        },
      ],
      '@react-native-firebase/app',
      '@react-native-firebase/crashlytics',
      './plugins/withFirebaseAppDelegate.js',
      '@react-native-google-signin/google-signin',
      'expo-apple-authentication',
    ],
  };
};

