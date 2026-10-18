module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // This rewrites the illegal 'import.meta' code into a standard string
      ['transform-define', { 'import.meta.env.MODE': 'development' }],
    ],
  };
};
