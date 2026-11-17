// Google-News-Sitemap: nur Artikel der letzten 48 Stunden (Vorgabe von Google News).
import type { APIContext } from 'astro';
import { getNews } from '../lib/utils';
import { SITE } from '../config';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(context: APIContext) {
  const site = (context.site ?? new URL(SITE.url)).toString().replace(/\/$/, '');
  const cutoff = Date.now() - 48 * 3600 * 1000;
  const fresh = (l: 'de' | 'en') => getNews(l).then((list) => list.filter((n) => n.data.pubDate.valueOf() >= cutoff && !n.data.rumor).map((n) => ({ n, l })));
  const news = [...(await fresh('de')), ...(await fresh('en'))];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${news
  .map(
    ({ n, l }) => `  <url>
    <loc>${site}${l === 'en' ? '/en' : ''}/news/${n.id}/</loc>
    <news:news>
      <news:publication><news:name>${esc(SITE.name)}</news:name><news:language>${l}</news:language></news:publication>
      <news:publication_date>${n.data.pubDate.toISOString()}</news:publication_date>
      <news:title>${esc(n.data.title)}</news:title>
    </news:news>
  </url>`,
  )
  .join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
