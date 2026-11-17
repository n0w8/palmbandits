// Zweisprachigkeit (DE/EN): Pfade der englischen Inhalte, Zuordnung DE -> EN (src/data/en-slugs.json)
// und Umschreiben interner Links auf die englischen Seiten (/en/...).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AUTOMATION_DIR, ROOT_DIR, writeJson } from './util.mjs';

export const EN_NEWS_DIR = process.env.EN_NEWS_OUT_DIR || path.join(ROOT_DIR, 'src', 'content', 'en', 'news');
export const EN_GUIDES_DIR = process.env.EN_GUIDES_OUT_DIR || path.join(ROOT_DIR, 'src', 'content', 'en', 'guides');
export const EN_NEWS_DRAFTS_DIR = process.env.EN_DRAFTS_OUT_DIR || path.join(AUTOMATION_DIR, 'drafts', 'news', 'en');
export const EN_GUIDE_DRAFTS_DIR = process.env.EN_GUIDE_DRAFTS_DIR || path.join(AUTOMATION_DIR, 'drafts', 'guides', 'en');
export const EN_SLUGS_FILE = process.env.EN_SLUGS_FILE || path.join(ROOT_DIR, 'src', 'data', 'en-slugs.json');

// Liest src/data/en-slugs.json. Fehlt die Datei: leere Zuordnung. Ist sie kaputt: null (dann nichts ueberschreiben).
export function readEnSlugs(file = EN_SLUGS_FILE) {
  if (!existsSync(file)) return { news: {}, guides: {} };
  try {
    const data = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return { ...data, news: { ...(data.news ?? {}) }, guides: { ...(data.guides ?? {}) } };
  } catch {
    return null;
  }
}

// Traegt eine Zuordnung ein, ohne vorhandene Eintraege (oder andere Schluessel) zu loeschen.
// kind: "news" | "guides", deId/enId: Dateiname ohne .md. Gibt true zurueck, wenn geschrieben wurde.
export function addEnSlug(kind, deId, enId, file = EN_SLUGS_FILE) {
  if (!deId || !enId) return false;
  const data = readEnSlugs(file);
  if (!data) {
    console.warn(`en-slugs.json ist kein gueltiges JSON, Zuordnung ${deId} -> ${enId} nicht eingetragen.`);
    return false;
  }
  if (data[kind][deId] === enId) return false;
  data[kind][deId] = enId;
  writeJson(file, data);
  return true;
}

// Vorhandene englische Guides: Map DE-Slug -> EN-Slug (nur, wenn die englische Datei wirklich existiert)
export function enGuideMap(file = EN_SLUGS_FILE, dir = EN_GUIDES_DIR) {
  const map = new Map();
  const ids = new Set(existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')) : []);
  for (const [de, en] of Object.entries(readEnSlugs(file)?.guides ?? {})) if (ids.has(en)) map.set(de, en);
  return map;
}

const CAT_EN = { geld: 'money', fundorte: 'locations', glitches: 'glitches', 'easter-eggs': 'easter-eggs', tipps: 'tips', wissen: 'lore' };

// Deutscher Seitenpfad -> englischer Seitenpfad (oder null, wenn es keine englische Entsprechung gibt)
export function toEnPath(p, { guides = new Map(), news = new Map() } = {}) {
  if (p.startsWith('/en/')) return p;
  let m;
  if (p === '/guides/') return '/en/guides/';
  // Englische Kategorieseiten gibt es unter /en/guides/category/<en>/ (Zuordnung wie src/i18n/index.ts CAT_EN)
  if ((m = p.match(/^\/guides\/kategorie\/([a-z-]+)\/$/))) return CAT_EN[m[1]] ? `/en/guides/category/${CAT_EN[m[1]]}/` : '/en/guides/';
  if ((m = p.match(/^\/guides\/([a-z0-9-]+)\/$/))) return guides.has(m[1]) ? `/en/guides/${guides.get(m[1])}/` : null;
  if (p === '/news/') return '/en/news/';
  if ((m = p.match(/^\/news\/([a-z0-9-]+)\/$/))) return news.has(m[1]) ? `/en/news/${news.get(m[1])}/` : null;
  if ((m = p.match(/^\/spiele\/([a-z0-9-]+)\/$/))) return `/en/games/${m[1]}/`;
  return null;
}

// Interne Markdown-Links im englischen Text auf /en/... umschreiben. Links ohne englische Seite werden zu reinem Text.
export function localizeLinksEn(body, maps = {}) {
  return String(body).replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (m, label, url) => {
    let p = url;
    if (!p.endsWith('/') && !p.includes('#') && !p.includes('?')) p += '/';
    const en = toEnPath(p, maps);
    return en ? `[${label}](${en})` : label;
  });
}
