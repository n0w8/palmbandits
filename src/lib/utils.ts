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

export interface CheatFile {
  game: string;
  updated: string;
  howTo: Partial<Record<'pc' | 'phone' | 'playstation' | 'xbox', string>>;
  howTo_en?: Partial<Record<'pc' | 'phone' | 'playstation' | 'xbox', string>>;
  cheats: {
    id: string;
    effect: string;
    category: string;
    pc?: string;
    phone?: string;
    playstation?: string;
    xbox?: string;
    note?: string;
    effect_en?: string;
    note_en?: string;
  }[];
}

/** Effekt/Hinweis eines Cheats in der gewuenschten Sprache (Fallback Deutsch) */
export const cheatText = (c: CheatFile['cheats'][number], lang: Lang) => ({
  effect: (lang === 'en' && c.effect_en) || c.effect,
  note: (lang === 'en' && c.note_en) || c.note,
});

const BTN_EN: Record<string, string> = { Rechts: 'Right', Links: 'Left', Oben: 'Up', Unten: 'Down', Dreieck: 'Triangle', Kreis: 'Circle', Quadrat: 'Square' };
/** Tastenkombination in der gewuenschten Sprache (die JSON-Daten nutzen deutsche Tastennamen) */
export const comboL = (s: string, lang: Lang) => (lang === 'en' ? s.replace(/\b(Rechts|Links|Oben|Unten|Dreieck|Kreis|Quadrat)\b/g, (m) => BTN_EN[m]) : s);

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

export function getCheatFiles(): CheatFile[] {
  const mods = import.meta.glob<{ default: CheatFile }>('../data/cheats/*.json', { eager: true });
  return Object.values(mods).map((m) => m.default);
}

export function getCheatFile(game: string): CheatFile | undefined {
  return getCheatFiles().find((f) => f.game === game);
}

export const absUrl = (path: string, site: URL | string) => new URL(path, site).toString();
