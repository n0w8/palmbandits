// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Domain an EINER Stelle ändern: hier und in src/config.ts
export default defineConfig({
  site: 'https://palmbandits.com',
  trailingSlash: 'always',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) => !/\/(impressum|datenschutz)\/$/.test(page),
      changefreq: 'daily',
    }),
  ],
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
});
