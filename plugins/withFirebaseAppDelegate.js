const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to automatically add Firebase initialization to AppDelegate
 * This ensures Firebase is configured even after ios/ folder is regenerated
 */
const withFirebaseAppDelegate = (config) => {
  return withAppDelegate(config, async (config) => {
    const { modResults } = config;
    const { contents } = modResults;

    // Check if already configured
    if (contents.includes('FirebaseApp.configure()')) {
      console.log('✅ Firebase already configured in AppDelegate');
      return config;
    }

    // Add import Firebase at the top
    if (!contents.includes('import Firebase')) {
      modResults.contents = contents.replace(
        /import ReactAppDependencyProvider/,
        `import ReactAppDependencyProvider\nimport Firebase`
      );
    }

    // Add FirebaseApp.configure() in didFinishLaunchingWithOptions
    modResults.contents = modResults.contents.replace(
      /(didFinishLaunchingWithOptions[^{]*{\s*)/,
      `$1// Initialize Firebase\n    FirebaseApp.configure()\n    \n    `
    );

    console.log('✅ Firebase initialization added to AppDelegate');
    return config;
  });
};

module.exports = withFirebaseAppDelegate;

