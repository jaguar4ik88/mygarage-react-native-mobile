module.exports = function (api) {
  // Включаем кэш для ускорения сборки
  // При изменении .env файла перезапускайте с --clear флагом
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: true,
        },
      ],
    ],
  };
};
