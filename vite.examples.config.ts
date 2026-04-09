import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: {
      base: resolve(__dirname, 'src'),
    },
  },
  server: {
    open: '/examples/',
  },
  optimizeDeps: {
    include: ['three'],
  },
});
