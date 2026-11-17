// Guide pruefen, reparieren und als Markdown nach dem Guide-Schema der Seite schreiben (src/content.config.ts).
// Radar-Guides landen IMMER erst als Entwurf in automation/drafts/guides (nie direkt auf der Seite).
// Zweisprachig: englische Fassung als Entwurf in automation/drafts/guides/en, spaeter src/content/en/guides (mit translationOf).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AUTOMATION_DIR, BRAND, ROOT_DIR, berlinIso, noLongDashes, siteUrl, slugify, toFrontmatter, truncate } from '../lib/util.mjs';
import { EN_GUIDE_DRAFTS_DIR, EN_GUIDES_DIR, addEnSlug, localizeLinksEn, readEnSlugs } from '../lib/i18n.mjs';
import { GAMES } from '../news-bot/writer.mjs';
import { CATEGORIES } from './intent.mjs';
import { independentKey, rankItems } from './topics.mjs';

export const GUIDES_DIR = process.env.GUIDES_OUT_DIR || path.join(ROOT_DIR, 'src', 'content', 'guides');
export const GUIDE_DRAFTS_DIR = process.env.GUIDE_DRAFTS_DIR || path.join(AUTOMATION_DIR, 'drafts', 'guides');
export { EN_GUIDE_DRAFTS_DIR, EN_GUIDES_DIR };
export const AUTHOR = `${BRAND} Guide-Radar`;
const DIFFICULTIES = ['leicht', 'mittel', 'schwer'];

export function germanDate(now = new Date()) {
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
}

export function englishDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
}

function cheatGamesOnSite(cheatGames) {
  return cheatGames ?? (() => {
    try {
      return readdirSync(path.join(ROOT_DIR, 'src', 'data', 'cheats')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
    } catch {
      return ['gta-5', 'gta-san-andreas', 'gta-vice-city', 'gta-4', 'gta-3'];
    }
  })();
}

// Interne Links, die es auf der Seite wirklich gibt
export function allowedInternalLinks(existingGuides = [], cheatGames = null) {
  const cheats = cheatGamesOnSite(cheatGames);
  return [
    '/guides/',
    ...CATEGORIES.map((c) => `/guides/kategorie/${c}/`),
    ...GAMES.filter((g) => g !== 'allgemein').map((g) => `/spiele/${g}/`),
    '/cheats/',
    ...[...new Set([...cheats, 'gta-6'])].map((g) => `/cheats/${g}/`),
    ...existingGuides.map((g) => `/guides/${g.slug}/`),
  ];
}

// Interne Links fuer die englische Fassung. enGuideSlugs: Slugs vorhandener englischer Guides.
export function allowedInternalLinksEn(enGuideSlugs = [], cheatGames = null) {
  const cheats = cheatGamesOnSite(cheatGames);
  return [
    '/en/guides/',
    ...GAMES.filter((g) => g !== 'allgemein').map((g) => `/en/games/${g}/`),
    '/en/cheats/',
    ...[...new Set([...cheats, 'gta-6'])].map((g) => `/en/cheats/${g}/`),
    ...enGuideSlugs.map((s) => `/en/guides/${s}/`),
  ];
}

// Sprachabhaengige Texte und Muster fuer die Reparatur
const LANG = {
  de: {
    amp: 'und',
    descAdd: 'Mit Quellen und dem aktuellen Stand.',
    descExtras: [`Alles kompakt auf ${BRAND}.`, 'Belegt und offen sauber getrennt.'],
    standRe: /\bStand:/,
    standLine: (now) => `**Stand: ${germanDate(now)}.**`,
    unclearRe: /^#{2,3}\s+.*unklar/im,
    unclearAdd: '## Was noch unklar ist\n\nDieser Guide stützt sich bisher auf eine einzige Quelle. Sobald weitere Berichte oder offizielle Infos auftauchen, prüfen und ergänzen wir ihn.',
    communityRe: /laut (community|reddit|spieler|einem (video|beitrag|clip)|einem reddit|youtube|mehreren spielern|ersten berichten)|community-berichten/i,
    stepRe: /\bschritt \d/i,
  },
  en: {
    amp: 'and',
    descAdd: 'With sources and the latest status.',
    descExtras: [`Everything in one place on ${BRAND}.`, 'What is confirmed and what is open, kept apart.'],
    standRe: /\b(Last updated|Updated|As of):/i,
    standLine: (now) => `**Last updated: ${englishDate(now)}.**`,
    unclearRe: /^#{2,3}\s+.*(unclear|unknown|unconfirmed|open questions)/im,
    unclearAdd: '## What is still unclear\n\nSo far this guide is based on a single source. As soon as more reports or official information turn up, we will check and update it.',
    communityRe: /according to (the )?(community|reddit|players|a (video|post|clip)|youtube|several players|early reports)|community reports/i,
    stepRe: /\bstep \d/i,
  },
};

// Meta-Beschreibung muss 120 bis 160 Zeichen haben. Notfalls mit Titel und Standardsatz auffuellen.
export function fixDescription(d, title, lang = 'de') {
  const L = LANG[lang] ?? LANG.de;
  d = noLongDashes(String(d ?? '')).replace(/\s+/g, ' ').trim();
  const end = (s) => s.replace(/[.!?:]?$/, '.');
  const add = L.descAdd;
  const options = [d, `${end(d)} ${add}`, `${end(title)} ${end(d)}`, `${end(title)} ${end(d)} ${add}`];
  for (const o of options) if (o.length >= 120 && o.length <= 160) return o;
  if (d.length > 160) return truncate(d, 158);
  let s = options[3];
  for (const extra of L.descExtras) if (s.length < 120) s += ` ${extra}`;
  return s.length > 160 ? truncate(s, 158) : s;
}

// Markdown-Links pruefen: interne aus der Liste bleiben, alles andere wird zu reinem Text
export function filterLinks(body, allowed) {
  const ok = new Set(allowed);
  const removed = [];
  const out = body.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, label, url) => {
    let p = url.trim();
    if (/^https?:\/\//i.test(p)) {
      try {
        const u = new URL(p);
        const site = new URL(siteUrl());
        if (u.hostname.replace(/^www\./, '') === site.hostname.replace(/^www\./, '')) p = u.pathname;
      } catch { /* bleibt extern */ }
    }
    if (p.startsWith('/') && !p.endsWith('/') && !p.includes('#') && !p.includes('?')) p += '/';
    if (ok.has(p)) return `[${label}](${p})`;
    removed.push(url);
    return label;
  });
  return { body: out, removed };
}

// Eine Sprachfassung reparieren. ctx.lang: "de" (Standard) oder "en".
// Bei "en" werden deutsche interne Pfade erst auf /en/... umgeschrieben (ctx.guideMap: DE-Slug -> EN-Slug).
export function normalizeGuide(g, ctx = {}) {
  const lang = ctx.lang === 'en' ? 'en' : 'de';
  const L = LANG[lang];
  const now = ctx.now ?? new Date();
  const warnings = [];
  const title = noLongDashes(g.title ?? '').replace(/\s+/g, ' ').trim();
  if (title.length > 70) warnings.push(`Titel ${title.length} Zeichen (Ziel max. 70)`);
  let slug = slugify(g.slug || title, 70, L.amp);
  if (slug.length < 3) slug = slugify(title, 70, L.amp);
  const description = fixDescription(g.description, title, lang);
  if (description !== String(g.description ?? '').trim()) warnings.push('Beschreibung automatisch angepasst');
  const game = GAMES.includes(g.game) ? g.game : (ctx.game ?? 'allgemein');
  const category = CATEGORIES.includes(g.category) ? g.category : (ctx.category ?? 'tipps');
  let tags = [...new Set((g.tags ?? []).map((t) => noLongDashes(t).replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 6);
  if (!tags.length) tags = [game.replace(/^gta-/, 'GTA ').toUpperCase().replace('GTA ONLINE', 'GTA Online')];
  const difficulty = DIFFICULTIES.includes(g.difficulty) ? g.difficulty : undefined;
  let faq = (g.faq ?? [])
    .map((f) => ({ q: noLongDashes(f.q ?? '').trim(), a: noLongDashes(f.a ?? '').trim() }))
    .filter((f) => f.q && f.a)
    .slice(0, 4);
  if (faq.length < 2) {
    if (faq.length) warnings.push('Nur 1 FAQ-Frage, FAQ weggelassen');
    faq = undefined;
  }

  // Text: keine H1, keine langen Striche, nur erlaubte interne Links
  let body = noLongDashes(String(g.body ?? '')).replace(/\r\n/g, '\n').replace(/^#\s+/gm, '## ').replace(/\n{3,}/g, '\n\n').trim();
  if (lang === 'en') body = localizeLinksEn(body, { guides: ctx.guideMap ?? new Map() });
  if (ctx.allowedLinks) {
    const res = filterLinks(body, ctx.allowedLinks);
    body = res.body;
    if (res.removed.length) warnings.push(`Links entfernt (nicht erlaubt): ${res.removed.slice(0, 3).join(', ')}`);
  }
  if (/^#{2,3}\s/.test(body)) warnings.push('Einstieg ohne Ueberschrift fehlt');
  // "Stand"-Zeile sicherstellen (direkt nach dem Einstieg)
  if (!L.standRe.test(body)) {
    const stand = L.standLine(now);
    const i = body.indexOf('\n\n');
    body = i > -1 && !/^#{2,3}\s/.test(body) ? `${body.slice(0, i)}\n\n${stand}${body.slice(i)}` : `${stand}\n\n${body}`;
    warnings.push('Stand-Zeile ergaenzt');
  }
  // Duenne Quellenlage: ehrlicher Abschnitt "Was noch unklar ist"
  if (!L.unclearRe.test(body) && (ctx.independent ?? 2) < 2) {
    body += `\n\n${L.unclearAdd}`;
    warnings.push('Abschnitt "Was noch unklar ist" ergaenzt (nur eine Quelle)');
  }
  if (ctx.communityOnly && !L.communityRe.test(body)) warnings.push('Nur Community-Quellen, aber keine "Laut Community-Berichten"-Formulierung gefunden');
  // Exploit-Schutz: in GTA-Online-Glitch-Guides keine Schritt-fuer-Schritt-Anleitung
  const exploitRisk = !!ctx.onlineExploit || (category === 'glitches' && game === 'gta-online');
  if (exploitRisk && (/^\s*\d+[.)]\s/m.test(body) || L.stepRe.test(body))) {
    warnings.push('EXPLOIT-PRUEFUNG: nummerierte Schritte in einem GTA-Online-Glitch-Guide, bitte genau pruefen');
  }
  body = body.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 200) warnings.push(`Text kurz (${words} Woerter)`);

  // Belege gibt es nur einmal (zur deutschen Fassung)
  const n = ctx.sourceCount ?? Infinity;
  const belege = (g.belege ?? [])
    .map((b) => ({ fakt: noLongDashes(b.fakt ?? '').trim(), quellen: [...new Set((b.quellen ?? []).filter((q) => Number.isInteger(q) && q >= 1 && q <= n))] }))
    .filter((b) => b.fakt);
  if (lang === 'de') {
    if (belege.some((b) => !b.quellen.length)) warnings.push('Mindestens ein Beleg ohne gueltige Quellen-Nummer');
    if (!belege.length) warnings.push('Keine Belege-Liste von Claude');
  }

  return { lang, title, slug, description, game, category, tags, difficulty, faq, body, belege, exploitRisk, warnings };
}

// Antwort von Claude (gemeinsame Felder + de + en + belege) in zwei reparierte Fassungen aufteilen.
// ctx.allowedLinksEn und ctx.guideMap gelten fuer die englische Fassung. Hinweise zur englischen
// Fassung landen mit "EN: " bei der deutschen (die zeigt der Pull Request).
export function normalizeGuidePair(raw, ctx = {}) {
  const shared = { game: raw.game, category: raw.category, difficulty: raw.difficulty };
  const de = normalizeGuide({ ...shared, ...(raw.de ?? {}), belege: raw.belege }, { ...ctx, lang: 'de' });
  const e = raw.en;
  const enWords = String(e?.body ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (!e || !String(e.title ?? '').trim() || enWords < 60) {
    de.warnings.push('Englische Fassung fehlt oder ist leer, nur Deutsch geschrieben');
    return { de, en: null };
  }
  const en = normalizeGuide({ ...shared, ...e }, { ...ctx, lang: 'en', allowedLinks: ctx.allowedLinksEn, guideMap: ctx.guideMap });
  de.warnings.push(...en.warnings.map((w) => `EN: ${w}`));
  return { de, en };
}

// Quellen fuer das Frontmatter: offizielle und grosse Medien zuerst, je Quelle nur ein Link, max. 6
export function sourcesForTopic(items, max = 6) {
  const seen = new Set();
  const out = [];
  for (const i of rankItems(items).filter((x) => x.link)) {
    const key = independentKey(i);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: i.outlet, url: i.link });
    if (out.length >= max) break;
  }
  return out;
}

// extra.translationOf: nur bei der englischen Fassung (Slug des deutschen Guides)
export function buildGuideMarkdown(guide, sources, now = new Date(), extra = {}) {
  const fm = toFrontmatter({
    title: guide.title,
    description: guide.description,
    pubDate: berlinIso(now),
    game: guide.game,
    category: guide.category,
    tags: guide.tags,
    difficulty: guide.difficulty,
    featured: false,
    faq: guide.faq,
    sources,
    bot: true,
    author: AUTHOR,
    translationOf: extra.translationOf,
  });
  return `${fm}\n${guide.body}`;
}

export function uniqueSlug(slug, dirs = [GUIDES_DIR, GUIDE_DRAFTS_DIR], taken = new Set()) {
  let s = slug;
  let n = 2;
  while (taken.has(s) || dirs.some((d) => existsSync(path.join(d, `${s}.md`)))) s = `${slug}-${n++}`;
  return s;
}

// Entwurf(e) + Meta-Datei (fuer den Pull Request) schreiben.
// pair = { de, en } aus normalizeGuidePair (en darf null sein); ein einzelner Guide geht auch (nur Deutsch).
// Die Zuordnung DE -> EN kommt sofort nach src/data/en-slugs.json (die Seite nutzt nur Eintraege, deren Dateien es gibt).
export function writeGuideDraft(pair, meta, sources, now = new Date(), dirs = {}) {
  const {
    draftsDir = GUIDE_DRAFTS_DIR, guidesDir = GUIDES_DIR, enDraftsDir = EN_GUIDE_DRAFTS_DIR, enGuidesDir = EN_GUIDES_DIR, slugsFile,
  } = dirs;
  const deGuide = pair.de ?? pair;
  const enGuide = pair.de ? pair.en : null;
  const known = readEnSlugs(slugsFile) ?? { guides: {} }; // auch Slugs aus offenen Pull Requests nicht doppelt vergeben

  mkdirSync(draftsDir, { recursive: true });
  const slug = uniqueSlug(deGuide.slug, [guidesDir, draftsDir], new Set(Object.keys(known.guides)));
  const g = { ...deGuide, slug };
  writeFileSync(path.join(draftsDir, `${slug}.md`), buildGuideMarkdown(g, sources, now), 'utf8');
  const url = `${siteUrl()}/guides/${slug}/`;

  let en = null;
  if (enGuide) {
    mkdirSync(enDraftsDir, { recursive: true });
    const enSlug = uniqueSlug(enGuide.slug, [enGuidesDir, enDraftsDir], new Set(Object.values(known.guides)));
    writeFileSync(path.join(enDraftsDir, `${enSlug}.md`), buildGuideMarkdown({ ...enGuide, slug: enSlug }, sources, now, { translationOf: slug }), 'utf8');
    en = { slug: enSlug, fileName: `${enSlug}.md`, url: `${siteUrl()}/en/guides/${enSlug}/`, title: enGuide.title };
    addEnSlug('guides', slug, enSlug, slugsFile);
  }

  const full = { ...meta, title: g.title, slug, url, game: g.game, category: g.category, warnings: g.warnings, exploitRisk: g.exploitRisk, sources, createdAt: berlinIso(now), en };
  writeFileSync(path.join(draftsDir, `${slug}.json`), JSON.stringify(full, null, 2) + '\n', 'utf8');
  return { slug, url, file: path.join(draftsDir, `${slug}.md`), meta: full, en };
}
