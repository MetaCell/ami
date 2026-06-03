import { defineConfig } from 'vite';
import { resolve, join } from 'path';
import { readFileSync, statSync } from 'fs';

// Serve .gz files as raw bytes — vite would otherwise transparently inflate
// them via Content-Encoding: gzip, which breaks loaders that expect to
// decompress the bytes themselves (e.g. AMI's NIfTI/MGZ loaders).
const rawGzPlugin = {
  name: 'serve-gz-raw',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';
      if (!url.endsWith('.gz')) return next();
      try {
        const filePath = join(__dirname, decodeURIComponent(url));
        statSync(filePath);
        const buffer = readFileSync(filePath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
      } catch {
        next();
      }
    });
  },
};

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
  plugins: [rawGzPlugin],
});
