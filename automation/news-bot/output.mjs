// Artikel pruefen, reparieren und als Markdown nach dem Schema der Seite schreiben.
// Zweisprachig: deutsche Fassung nach src/content/news, englische nach src/content/en/news (mit translationOf),
// Zuordnung DE -> EN in src/data/en-slugs.json.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AUTOMATION_DIR, ROOT_DIR, berlinDate, berlinIso, deUmlaut, noLongDashes, siteUrl, slugify, toFrontmatter, truncate, BRAND } from '../lib/util.mjs';
import { EN_NEWS_DIR, EN_NEWS_DRAFTS_DIR, addEnSlug, localizeLinksEn, readEnSlugs } from '../lib/i18n.mjs';
import { GAMES } from './writer.mjs';
import { outletKey } from './analyze.mjs';

export const NEWS_DIR = process.env.NEWS_OUT_DIR || path.join(ROOT_DIR, 'src', 'content', 'news');
export const DRAFTS_DIR = process.env.DRAFTS_OUT_DIR || path.join(AUTOMATION_DIR, 'drafts', 'news');
export { EN_NEWS_DIR, EN_NEWS_DRAFTS_DIR };
export const AUTHOR = `${BRAND} Newsdesk`;

// Fuellsaetze je Sprache, falls Claude die Beschreibung zu kurz liefert
const DESC_FILL = {
  de: { add: 'Hier liest du, was bekannt ist und was das für dich heißt.', extras: [`Alle Fakten kompakt auf ${BRAND}.`, 'Bestätigt und unbestätigt sauber getrennt.'] },
  en: { add: 'Here is what we know and what it means for you.', extras: [`All the key facts in one place on ${BRAND}.`, 'Confirmed and unconfirmed details kept apart.'] },
};

// Meta-Beschreibung muss 120 bis 160 Zeichen haben. Notfalls mit Titel und Standardsatz auffuellen.
function fixDescription(d, title, lang = 'de') {
  d = noLongDashes(String(d ?? '')).replace(/\s+/g, ' ').trim();
  const { add, extras } = DESC_FILL[lang] ?? DESC_FILL.de;
  const end = (s) => s.replace(/[.!?]?$/, '.');
  const options = [d, `${end(d)} ${add}`, `${end(title)} ${end(d)} ${add}`];
  for (const o of options) if (o.length >= 120 && o.length <= 160) return o;
  if (d.length > 160) return truncate(d, 158);
  let s = options[2];
  for (const extra of extras) if (s.length < 120) s += ` ${extra}`;
  return s.length > 160 ? truncate(s, 158) : s;
}

function fixBody(body) {
  return noLongDashes(body)
    .replace(/^#\s+/gm, '## ') // keine H1
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

// Woerter, die in jeder GTA-Meldung vorkommen (Spielnamen, Plattformen, Termin, Fuellwoerter).
// Eine Wortfolge nur aus solchen Woertern ("for PlayStation 5 and Xbox Series X|S") ist keine Kopie.
const COMMON_WORDS = new Set(`
a an the and or of to in on at for from by with as is are be will its it this that
der die das den dem des ein eine und oder von vom zu zum zur im in am an auf aus bei fuer mit ist sind wird werden
grand theft auto gta vi 6 v 5 iv 4 online rockstar games game take two interactive
playstation ps5 ps4 pro xbox series x s one pc steam
november 19 2026 2027 vice city leonida lucia jason caminos duval
`.split(/\s+/).filter(Boolean));

// Prueft, ob 8 oder mehr Woerter am Stueck aus einer Quelle stammen (Kopierschutz).
// Geprueft werden Titel, Auszug und (falls nachgeladen) der Artikeltext jeder Quelle.
export function copiedPassages(body, story, n = 8) {
  const norm = (s) => deUmlaut(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
  const grams = new Set();
  for (const i of story.items) {
    for (const src of [i.title, i.snippet, i.text]) {
      const w = norm(src ?? '');
      for (let k = 0; k + n <= w.length; k++) {
        const gram = w.slice(k, k + n);
        if (gram.filter((t) => !COMMON_WORDS.has(t)).length < 3) continue; // nur Namen/Plattformen/Fuellwoerter
        grams.add(gram.join(' '));
      }
    }
  }
  const b = norm(body);
  const hits = [];
  for (let k = 0; k + n <= b.length; k++) {
    const g = b.slice(k, k + n).join(' ');
    if (grams.has(g)) hits.push(g);
  }
  return hits;
}

// Eine Sprachfassung reparieren (flaches Objekt: title, slug, description, tags, body + gemeinsame Felder)
export function normalizeArticle(a, lang = 'de') {
  const warnings = [];
  const amp = lang === 'en' ? 'and' : 'und';
  const title = noLongDashes(a.title ?? '').replace(/\s+/g, ' ').trim();
  if (title.length > 70) warnings.push(`Titel ${title.length} Zeichen (Ziel max. 70)`);
  let slug = slugify(a.slug || title, 70, amp);
  if (slug.length < 3) slug = slugify(title, 70, amp);
  const description = fixDescription(a.description, title, lang);
  if (description !== String(a.description ?? '').trim()) warnings.push('Beschreibung automatisch angepasst');
  const tags = [...new Set((a.tags ?? []).map((t) => noLongDashes(t).trim()).filter(Boolean))].slice(0, 6);
  const game = GAMES.includes(a.game) ? a.game : 'allgemein';
  const hype = Math.min(5, Math.max(1, Math.round(Number(a.hype) || 3)));
  let body = fixBody(a.body ?? '');
  if (lang === 'en') body = localizeLinksEn(body); // falls doch ein interner Link drin ist: auf /en/... zeigen
  const words = body.split(/\s+/).length;
  if (words < 150) warnings.push(`Text kurz (${words} Woerter)`);
  return { ...a, lang, title, slug, description, tags, game, hype, body, rumor: !!a.rumor, breaking: !!a.breaking, warnings };
}

// Antwort von Claude (gemeinsame Felder + de + en) in zwei reparierte Fassungen aufteilen.
// Hinweise zur englischen Fassung landen mit "EN: " bei der deutschen (die zeigt Log und Pull Request).
export function normalizeArticlePair(raw) {
  const shared = { game: raw.game, rumor: raw.rumor, hype: raw.hype, breaking: raw.breaking };
  const de = normalizeArticle({ ...shared, ...(raw.de ?? {}) }, 'de');
  const e = raw.en;
  const enWords = String(e?.body ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (!e || !String(e.title ?? '').trim() || enWords < 40) {
    de.warnings.push('Englische Fassung fehlt oder ist leer, nur Deutsch geschrieben');
    return { de, en: null };
  }
  const en = normalizeArticle({ ...shared, ...e }, 'en');
  de.warnings.push(...en.warnings.map((w) => `EN: ${w}`));
  return { de, en };
}

// Kopierschutz fuer beide Fassungen (die Quellen sind meist englisch, also ist die englische Fassung besonders wichtig)
export function copiedPassagesPair(pair, story) {
  return [...copiedPassages(pair.de.body, story), ...(pair.en ? copiedPassages(pair.en.body, story) : [])];
}

// Quellen fuer das Frontmatter: offizielle zuerst, je Medium nur ein Link, max. 6
export function sourcesFor(story) {
  const order = { official: 0, A: 1, B: 2, rumor: 3 };
  const seen = new Set();
  const out = [];
  const sorted = [...story.items].filter((i) => i.link).sort((x, y) => order[x.tier] - order[y.tier] || Number(!!x.aggregator) - Number(!!y.aggregator));
  for (const i of sorted) {
    const key = outletKey(i.domain) || i.outlet.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: i.outlet, url: i.link });
    if (out.length >= 6) break;
  }
  return out;
}

// extra.translationOf: nur bei der englischen Fassung (ID der deutschen Datei ohne .md)
export function buildMarkdown(article, story, now, extra = {}) {
  const fm = toFrontmatter({
    title: article.title,
    description: article.description,
    pubDate: berlinIso(now),
    game: article.game,
    tags: article.tags,
    sources: sourcesFor(story),
    author: AUTHOR,
    bot: true,
    breaking: article.breaking,
    rumor: article.rumor,
    hype: article.hype,
    translationOf: extra.translationOf,
  });
  return `${fm}\n${article.body}`;
}

// taken: schon vergebene IDs (ohne .md), z. B. aus offenen Pull Requests laut en-slugs.json
function uniqueFile(base, dirs, taken = new Set()) {
  let name = `${base}.md`;
  let n = 2;
  while (taken.has(name.replace(/.md$/, '')) || dirs.some((d) => existsSync(path.join(d, name)))) name = `${base}-${n++}.md`;
  return name;
}

// Gruen -> direkt nach src/content/news und src/content/en/news.
// Gelb -> Entwuerfe in automation/drafts/news und automation/drafts/news/en (der Workflow macht daraus EINEN Pull Request).
// pair = { de, en } aus normalizeArticlePair (en darf null sein).
export function writeArticleFiles(pair, story, verdict, now) {
  const green = verdict.color === 'green';
  const { de, en } = pair;
  const date = berlinDate(now);
  const known = readEnSlugs() ?? { news: {} };

  const dir = green ? NEWS_DIR : DRAFTS_DIR;
  mkdirSync(dir, { recursive: true });
  const fileName = uniqueFile(`${date}-${de.slug}`, [dir, NEWS_DIR], new Set(Object.keys(known.news)));
  const slug = fileName.replace(/\.md$/, '');
  writeFileSync(path.join(dir, fileName), buildMarkdown(de, story, now), 'utf8');
  const url = `${siteUrl()}/news/${slug}/`;

  let enFile = null;
  if (en) {
    const enDir = green ? EN_NEWS_DIR : EN_NEWS_DRAFTS_DIR;
    mkdirSync(enDir, { recursive: true });
    const enName = uniqueFile(`${date}-${en.slug}`, [enDir, EN_NEWS_DIR], new Set(Object.values(known.news)));
    const enSlug = enName.replace(/\.md$/, '');
    writeFileSync(path.join(enDir, enName), buildMarkdown(en, story, now, { translationOf: slug }), 'utf8');
    enFile = { fileName: enName, slug: enSlug, url: `${siteUrl()}/en/news/${enSlug}/`, dir: enDir, title: en.title };
    // Auch bei Entwuerfen sofort eintragen: Die Seite nutzt nur Eintraege, deren Dateien es gibt.
    addEnSlug('news', slug, enSlug);
  }

  if (!green) {
    const meta = {
      title: de.title,
      url,
      verdict: verdict.reason,
      rumor: de.rumor,
      warnings: de.warnings,
      sources: sourcesFor(story),
      en: enFile ? { fileName: enFile.fileName, slug: enFile.slug, url: enFile.url, title: enFile.title } : null,
    };
    writeFileSync(path.join(dir, fileName.replace(/\.md$/, '.json')), JSON.stringify(meta, null, 2) + '\n', 'utf8');
  }
  return { fileName, slug, url, dir, en: enFile };
}
