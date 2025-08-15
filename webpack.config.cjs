const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const TerserPlugin = require("terser-webpack-plugin");

const MODES = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
}

const MODE = MODES.DEVELOPMENT;

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
    "home-page"     : './static/assets/js/pages/home-page/home-page.js',
    "filter-syntax" : './static/assets/js/pages/filter-syntax.ts',
    "test"          : './static/assets/js/pages/test.js',
    "search"        : './static/assets/js/pages/search.js',
    "bundled-css"   : './static/assets/css/bundled-css.css',
  },
  output: {
    filename: '[name].[contenthash].bundle.js',    // Output bundled files with hash
    path: path.resolve(__dirname, 'static/dist'),  // Output folder
    clean: true,
  },
  mode: MODE,
  optimization: {
    minimize: MODE === 'production',
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          pure_funcs: [ // keep console.error
            'console.log',
            'console.info',
            'console.debug',
            'console.warn'
          ],
        },
      },
    })],
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.css'],
  },
};