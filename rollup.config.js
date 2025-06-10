import typescript from 'rollup-plugin-typescript2';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
    // Node builds
    {
        external: ['@hapi/hapi'],
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/index.node.cjs',
                format: 'cjs',
                sourcemap: true
            },
            {
                file: 'dist/index.node.esm.js',
                format: 'esm',
                sourcemap: true
            }
        ],
        plugins: [
            json(),
            nodeResolve({
                browser: false,
                preferBuiltins: true
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json'
            }),
        ]
    }

];