/**
 * Install tools
 * npm install webpack -g
 * npm install terser -g
 * npm install terser-webpack-plugin --save-dev
 * 
 * then call "webpack" from command line
 */

const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const devMode = (process.env.NODE_ENV === 'development');
console.log(`${devMode ? 'development' : 'production'} mode bundle`);

const banner = `/* Copyright (C) 2015, 2022 Green Screens Ltd. */`;

const all = {
  mode : devMode ? 'development' : 'production',
  entry: './src/index.mjs',
  devtool: 'source-map',
  output: {
    filename: 'io.greenscreens.quark.all.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: devMode === false,
    minimizer: [
      new TerserPlugin({ parallel: true,
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true
        },      
      })
    ],  
  }, 
  plugins : [

  ]
};


module.exports = [all];
