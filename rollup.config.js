import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import livereload from 'rollup-plugin-livereload';

import pkg from './package.json';

const production = !process.env.ROLLUP_WATCH;

export default [
  {
    input: 'lib/index.ts',
    output: {
      name: 'auroraCharts',
      file: pkg.browser,
      format: 'umd',
      sourcemap: true,
    },
    plugins: [
      resolve({
        browser: true
      }),
      commonjs(),
      typescript({sourceMap: !production}),
    ],
    preserveModules: false,
    watch: {
      clearScreen: false
    }
  },
];


function serve() {
  let started = false;

  return {
    writeBundle() {
      if (!started) {
        started = true;

        require('child_process').spawn('npx', ['sirv', '--', 'dist', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true
        });
      }
    }
  };
}
