const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = {
  plugins: [
    new WebpackManifestPlugin({
      fileName: 'manifest.json',
      publicPath: 'dist/',  // adjust if needed
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
  ],
  entry: {
    "home-page"     : './static/assets/js/pages/home-page.js',
    "filter-syntax" : './static/assets/js/pages/filter-syntax.js',
    "test"          : './static/assets/js/pages/test.js',
    "search"        : './static/assets/js/pages/search.js',
    "bundled-css"   : './static/assets/css/bundled-css.css',
  },
  output: {
    filename: '[name].[contenthash].bundle.js',         // Output bundled files
    path: path.resolve(__dirname, 'static/dist'),  // Output folder
  },
  mode: 'production',             // Enables minification
  // mode: 'development',
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
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
};