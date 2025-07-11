const path = require('path');

module.exports = {
  entry: {
    home            : './static/assets/js/pages/home.js',
    "filter-syntax" : './static/assets/js/pages/filter-syntax.js',
    stats           : './static/assets/js/pages/stats.js',
    "user-query"    : './static/assets/js/pages/user-query.js',
    upload          : './static/assets/js/pages/upload.js',
    "loading-data"  : './static/assets/js/pages/loading-data.js',
  },
  output: {
    filename: '[name].bundle.js',         // Output bundled files
    path: path.resolve(__dirname, 'static/dist'),  // Output folder
  },
  mode: 'production',             // Enables minification
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',  // Optional, for transpiling if needed
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};