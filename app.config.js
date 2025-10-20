module.exports = ({ config }) => {
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
                {
                  CFBundleURLSchemes: ['874405820729-59ggkvoo1adt2qlkoum4rppgsg1ve7po']
                }
              ]
            }
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
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

