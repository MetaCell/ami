import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  resolve: {
    alias: {
      base: resolve(__dirname, 'src'),
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./specs/vitest.setup.js'],
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

  plugins: [
    dts({
      // Emit relative to src/ so src/ami.ts → build/ami.d.ts, matching the
      // "types" field in package.json.
      entryRoot: 'src',
      // The helper files use an anonymous class factory pattern (TS4094) and
      // vendored external scripts have unresolvable private names (TS9005).
      // Skip diagnostics so declarations are emitted despite those pre-existing
      // errors — they don't affect the usable public API surface.
      skipDiagnostics: true,
      // Exclude vendored scripts and non-library trees
      exclude: ['external/**', 'specs/**', 'examples/**'],
    }),
  ],
});
