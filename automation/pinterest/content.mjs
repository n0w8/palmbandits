// Liest Guides, News und Cheats der Seite (oder die Testdaten in automation/fixtures).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { AUTOMATION_DIR, ROOT_DIR } from '../lib/util.mjs';

export const GAME_NAMES = {
  'gta-6': 'GTA 6', 'gta-online': 'GTA Online', 'gta-5': 'GTA 5', 'gta-4': 'GTA 4',
  'gta-san-andreas': 'GTA San Andreas', 'gta-vice-city': 'GTA Vice City', 'gta-3': 'GTA 3', allgemein: 'GTA',
};

export const GAME_TAGS = {
  'gta-6': ['gta6', 'gtavi'], 'gta-online': ['gtaonline', 'gta5online'], 'gta-5': ['gta5', 'gtav'], 'gta-4': ['gta4', 'gtaiv'],
  'gta-san-andreas': ['gtasanandreas', 'sanandreas'], 'gta-vice-city': ['gtavicecity', 'vicecity'], 'gta-3': ['gta3', 'gtaiii'], allgemein: ['gta', 'grandtheftauto'],
};

export function contentRoots(useFixtures) {
  const base = useFixtures ? path.join(AUTOMATION_DIR, 'fixtures') : ROOT_DIR;
  return {
    news: path.join(base, useFixtures ? 'content/news' : 'src/content/news'),
    guides: path.join(base, useFixtures ? 'content/guides' : 'src/content/guides'),
    cheats: path.join(base, useFixtures ? 'data/cheats' : 'src/data/cheats'),
  };
}

function cleanInline(s) {
  return String(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Allgemeine Zwischenueberschriften taugen nicht als Teaser
const GENERIC_H2 = /^(schnell(ü|ue)bersicht|(ü|ue)berblick|fazit|faq|h(ä|ae)ufige fragen.*|inhalt|inhaltsverzeichnis|einleitung|zusammenfassung|quellen|das wichtigste.*|kurz und knapp|tl;?dr|hinweis|disclaimer|mehr (guides|zum thema).*|siehe auch)$/i;

function readMarkdownDir(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx')).sort()) {
    try {
      const { data, content } = matter(readFileSync(path.join(dir, file), 'utf8'));
      const slug = file.replace(/\.mdx?$/, '');
      const h2 = [...content.matchAll(/^##\s+(.+?)\s*#*\s*$/gm)].map((m) => cleanInline(m[1])).filter((t) => t && !GENERIC_H2.test(t));
      const list = [...content.matchAll(/^\s*(?:[-*]|\d+\.)\s+(.+)$/gm)].map((m) => cleanInline(m[1])).filter((s) => s.length > 3 && s.length < 90);
      out.push({ slug, data, h2, list, file });
    } catch (err) {
      console.warn(`Kann ${file} nicht lesen: ${err.message}`);
    }
  }
  return out;
}

export function loadContent(useFixtures = false) {
  const roots = contentRoots(useFixtures);
  const guides = readMarkdownDir(roots.guides).filter((g) => g.data.title && !g.data.draft);
  const news = readMarkdownDir(roots.news).filter((n) => n.data.title && !n.data.draft);
  const cheats = [];
  if (existsSync(roots.cheats)) {
    for (const file of readdirSync(roots.cheats).filter((f) => f.endsWith('.json')).sort()) {
      try {
        const data = JSON.parse(readFileSync(path.join(roots.cheats, file), 'utf8').replace(/^﻿/, ''));
        const game = data.game ?? file.replace(/\.json$/, '');
        for (const c of data.cheats ?? []) if (c.id && c.effect) cheats.push({ ...c, game, howTo: data.howTo ?? {} });
      } catch (err) {
        console.warn(`Kann ${file} nicht lesen: ${err.message}`);
      }
    }
  }
  let facts = [];
  try {
    facts = (JSON.parse(readFileSync(path.join(AUTOMATION_DIR, 'social', 'facts.json'), 'utf8')).facts ?? []).filter((f) => f.id && f.hook && f.fact && f.source?.url);
  } catch { /* keine Fakten */ }
  return { guides, news, cheats, facts, roots };
}
