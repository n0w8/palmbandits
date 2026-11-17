import { getCollection, type CollectionEntry } from 'astro:content';

import type { Lang } from '../i18n';

export type News = CollectionEntry<'news'> | CollectionEntry<'newsEn'>;
export type Guide = CollectionEntry<'guides'> | CollectionEntry<'guidesEn'>;

const TZ = 'Europe/Berlin';

export function fmtDate(d: Date, withTime = false) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: TZ,
  }).format(d);
}

export function readingTime(body = '') {
  const words = body.replace(/[#>*_`\-|[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 210));
}

export async function getNews(lang: Lang = 'de'): Promise<News[]> {
  const all: News[] = lang === 'en' ? await getCollection('newsEn') : await getCollection('news');
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getGuides(lang: Lang = 'de'): Promise<Guide[]> {
  const all: Guide[] = lang === 'en' ? await getCollection('guidesEn') : await getCollection('guides');
  return all.sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return (b.data.updatedDate ?? b.data.pubDate).valueOf() - (a.data.updatedDate ?? a.data.pubDate).valueOf();
  });
}

/** Pfad der anderen Sprachversion eines Artikels (oder null, wenn es keine gibt) */
export async function altArticlePath(kind: 'news' | 'guide', entry: News | Guide, lang: Lang): Promise<string | null> {
  const seg = kind === 'news' ? 'news' : 'guides';
  if (lang === 'en') {
    const de = entry.data.translationOf;
    return de ? `/${seg}/${de}/` : null;
  }
  const list: (News | Guide)[] = kind === 'news' ? await getCollection('newsEn') : await getCollection('guidesEn');
  const en = list.find((e) => e.data.translationOf === entry.id);
  return en ? `/en/${seg}/${en.id}/` : null;
}

export const absUrl = (path: string, site: URL | string) => new URL(path, site).toString();
