import { defineConfig } from 'vite';

export default defineConfig({
  // Relative, so a build can be dropped into any path on any CDN.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
  },
  server: { port: 5176 },
});
