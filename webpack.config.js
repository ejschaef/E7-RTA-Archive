const path = require('path');

module.exports = {
  entry: {
    "home-page"     : './static/assets/js/pages/home-page.js',
    "filter-syntax" : './static/assets/js/pages/filter-syntax.js',
    "test"          : './static/assets/js/pages/test.js',
  },
  output: {
    filename: '[name].bundle.js',         // Output bundled files
    path: path.resolve(__dirname, 'static/dist'),  // Output folder
  },
  //mode: 'production',             // Enables minification
  mode: 'development',
  devtool: 'source-map',
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