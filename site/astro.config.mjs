import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://chassis-docs.com',
  base: '/chassis-assets',
  outDir: './dist',
  build: {
    assets: '_astro'
  },
  server: {
    port: 4322
  }
});
