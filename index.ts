import { registerRootComponent } from 'expo';
// Import Firebase to ensure native module is loaded
import '@react-native-firebase/app';
import '@react-native-firebase/analytics';
import '@react-native-firebase/crashlytics';

import App from './App';

// Firebase will auto-initialize from GoogleService-Info.plist on iOS
console.log('🔥 Firebase will auto-initialize from GoogleService-Info.plist');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
