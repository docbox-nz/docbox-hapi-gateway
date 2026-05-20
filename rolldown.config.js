import { defineConfig } from 'rolldown';

export default defineConfig({
  external: ['@hapi/hapi'],
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.node.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.node.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  platform: 'node',
});
