import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      base: resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'build',
    lib: {
      entry: resolve(__dirname, 'src/ami.ts'),
      name: 'AMI',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'ami.js' : 'ami.cjs'),
    },
    sourcemap: true,
    rollupOptions: {
      external: ['three'],
      output: {
        globals: { three: 'THREE' },
      },
    },
  },
});
