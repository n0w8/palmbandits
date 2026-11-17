// Gemeinsame Bausteine fuer RSS und Suchindex (DE unter /, EN unter /en/)
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNews, getGuides, getCheatFiles, cheatText } from './utils';
import { GAMES, getGame, gameL } from '../data/games';
import { SITE } from '../config';
import { href, ui, type Lang } from '../i18n';

export async function rssFor(lang: Lang, context: APIContext) {
  const news = await getNews(lang);
  const guides = await getGuides(lang);
  const h = (p: string) => href(lang, p);
  const items = [
    ...news.map((n) => ({ title: n.data.title, description: n.data.description, pubDate: n.data.pubDate, link: h(`/news/${n.id}/`), categories: [n.data.game, ...n.data.tags] })),
    ...guides.map((g) => ({ title: g.data.title, description: g.data.description, pubDate: g.data.updatedDate ?? g.data.pubDate, link: h(`/guides/${g.id}/`), categories: [g.data.game, g.data.category] })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
  return rss({
    title: `${SITE.name}: GTA News & Guides`,
    description: ui[lang].site.description,
    site: context.site ?? SITE.url,
    items: items.slice(0, 60),
    customData: `<language>${lang === 'en' ? 'en-gb' : 'de-de'}</language>`,
  });
}

export async function searchIndex(lang: Lang) {
  const news = await getNews(lang);
  const guides = await getGuides(lang);
  const h = (p: string) => href(lang, p);
  const en = lang === 'en';
  const out = [
    ...GAMES.map((g0) => {
      const g = gameL(g0, lang);
      return { t: g.name, d: g.tagline, u: h(`/spiele/${g.slug}/`), k: en ? 'Game' : 'Spiel', x: g.keywords.join(' ') };
    }),
    ...news.map((n) => ({ t: n.data.title, d: n.data.description, u: h(`/news/${n.id}/`), k: 'News', x: `${getGame(n.data.game).name} ${n.data.tags.join(' ')}` })),
    ...guides.map((g) => ({ t: g.data.title, d: g.data.description, u: h(`/guides/${g.id}/`), k: 'Guide', x: `${getGame(g.data.game).name} ${g.data.category} ${g.data.tags.join(' ')}` })),
    ...getCheatFiles().flatMap((f) =>
      f.cheats.map((c) => {
        const { effect } = cheatText(c, lang);
        return {
          t: `${c.pc ?? c.phone ?? effect}`,
          d: `${getGame(f.game).name}: ${effect}`,
          u: h(`/cheats/${f.game}/`) + `#${c.id}`,
          k: 'Cheat',
          // beide Sprachen durchsuchbar, damit "panzer" und "tank" funktionieren
          x: [c.pc, c.phone, c.effect, c.effect_en, getGame(f.game).name, 'cheat'].filter(Boolean).join(' '),
        };
      }),
    ),
  ];
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
