import type { APIContext } from 'astro';
import { SITE } from '../config';

export function GET(context: APIContext) {
  const site = (context.site ?? new URL(SITE.url)).toString().replace(/\/$/, '');
  return new Response(
    `User-agent: *
Allow: /
Disallow: /search.json

Sitemap: ${site}/sitemap-index.xml
Sitemap: ${site}/news-sitemap.xml
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
