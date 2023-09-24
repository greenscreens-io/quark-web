/**
 * Install tools
 * npm install rollup -g
 * npm install terser -g
 * npm install rollup-plugin-sourcemaps --save-dev
 * npm install rollup-plugin-terser --save-dev
 * 
 * then call "rollup -c" from command line
 */

import { terser } from 'rollup-plugin-terser';
import sourcemaps from 'rollup-plugin-sourcemaps';

const devMode = (process.env.NODE_ENV === 'development');
console.log(`${devMode ? 'development' : 'production'} mode bundle`);

const minesm = terser({
  ecma: 2022,
  keep_classnames: false,
  keep_fnames: false,
  module: true,
  toplevel: false,
  mangle: {
    toplevel: true,
    keep_classnames: true,
    keep_fnames: true
  },
  compress: {
    module: true,
    toplevel: true,
    unsafe_arrows: true,
    keep_classnames: true,
    keep_fnames: true,
    drop_console: !devMode,
    drop_debugger: !devMode
  },
  output: { quote_style: 1 }
});


const dbg = {
  external: [],
  input: './modules/index.mjs',
  output: [
    { file: 'dist/io.greenscreens.quark.js', sourcemap: false, format: 'esm', plugins: [] }
  ]
};

const dist = {
  external: [],
  input: './modules/index.mjs',
  output: [
    //{ file: 'release/io.greenscreens.quark.js', format: 'esm' },
    { file: 'dist/io.greenscreens.quark.min.js', sourcemap: true, format: 'esm', plugins: [minesm, sourcemaps] }
  ]
};

const esm = {
  external: [],
  input: './modules/index.esm.mjs',
  output: [
    //{ file: 'release/io.greenscreens.quark.esm.js', format: 'esm' },
    { file: 'dist/io.greenscreens.quark.esm.min.js', sourcemap: true, format: 'esm', plugins: [minesm, sourcemaps] }
  ]
};

export default [dist, esm];