// Feeds fuer das Guide-Radar holen. Nutzt den Feed-Parser des News-Bots und ergaenzt pro Meldung
// einen laengeren Text (Artikeltext aus dem Feed, Reddit-Beitrag, YouTube-Beschreibung), weil Guides
// nur aus Fakten der Quellen geschrieben werden duerfen.
import { XMLParser } from 'fast-xml-parser';
import path from 'node:path';
import { AUTOMATION_DIR, decodeEntities, readJson, sleep, stripHtml, truncate } from '../lib/util.mjs';
import { USER_AGENT, canonicalUrl, hostOf, parseFeed } from '../news-bot/fetch.mjs';

// Allgemeiner Bot-Name, keine persoenlichen Daten
export const RADAR_UA = USER_AGENT.replace('NewsBot', 'GuideRadar');
const TIMEOUT_MS = 12_000;
const TEXT_MAX = 4000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['item', 'entry', 'link', 'category'].includes(name),
  processEntities: true,
  htmlEntities: true,
});

function text(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object') return text(v['#text'] ?? '');
  return decodeEntities(String(v)).trim();
}

function linkOf(entry, isAtom) {
  const links = entry.link ?? [];
  if (!isAtom) return text(links[0] ?? entry.guid);
  const alt = links.find((l) => typeof l === 'object' && (!l['@_rel'] || l['@_rel'] === 'alternate'));
  const any = alt ?? links[0];
  return typeof any === 'object' ? any['@_href'] ?? '' : text(any);
}

// Reddit haengt "submitted by /u/Name to r/Sub [link] [comments]" an. Nutzernamen speichern wir nicht.
export function cleanText(s) {
  return String(s ?? '')
    .replace(/submitted by\s+\/?u\/\S+(\s+to\s+r\/\S+)?/gi, ' ')
    .replace(/\[(link|comments)\]/gi, ' ')
    .replace(/\/?u\/[A-Za-z0-9_-]{3,}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/►\s*[^►:]{0,40}:/g, ' ') // YouTube: "►My Twitter:" usw.
    .replace(/\s+/g, ' ')
    .trim();
}

// Laengere Texte pro Link aus dem Roh-XML (content:encoded, Atom-content, YouTube media:description)
export function extractLongTexts(xml) {
  const doc = parser.parse(xml);
  const isAtom = !!doc.feed;
  const entries = isAtom ? doc.feed.entry ?? [] : doc.rss?.channel?.item ?? doc['rdf:RDF']?.item ?? [];
  const out = new Map();
  for (const e of entries) {
    const link = linkOf(e, isAtom);
    if (!link) continue;
    const candidates = [
      text(e['content:encoded']),
      text(e.content),
      text(e['media:group']?.['media:description']),
      text(e.description),
      text(e.summary),
    ].map((c) => cleanText(stripHtml(c)));
    const longest = candidates.sort((a, b) => b.length - a.length)[0] ?? '';
    const cat = (e.category ?? []).find((c) => typeof c === 'object' && String(c['@_label'] ?? '').startsWith('r/'));
    out.set(canonicalUrl(link), {
      text: truncate(longest, TEXT_MAX),
      subreddit: cat ? String(cat['@_term']) : null,
    });
  }
  return out;
}

// Ein Feed -> einheitliche Meldungen (Grundfelder vom News-Bot-Parser, dazu type, text, gameHint)
export function parseRadarFeed(xml, source, config) {
  const tiers = config.outletTiers ?? {};
  const blocked = new Set(config.blockedDomains ?? []);
  const base = parseFeed(xml, source, tiers).filter((i) => !blocked.has(i.domain));
  const extra = extractLongTexts(xml);
  return base.map((item) => {
    const x = extra.get(item.canonical) ?? {};
    const it = {
      ...item,
      type: source.type ?? 'outlet',
      gtaOnly: !!source.gtaOnly,
      text: source.aggregator ? '' : x.text ?? '',
      gameHint: null,
    };
    // Google News bringt auch unbekannte Seiten: die zaehlen nur als Bestaetigung (Stufe C), nie allein
    if (source.aggregator && item.tier !== 'official' && !tiers[item.domain]) it.tier = 'C';
    if (it.type === 'reddit') {
      it.outlet = x.subreddit ? `Reddit r/${x.subreddit}` : 'Reddit';
      it.domain = 'reddit.com';
      it.gameHint = x.subreddit ? config.subredditGames?.[x.subreddit] ?? null : null;
    }
    if (it.type === 'youtube') it.domain = 'youtube.com';
    it.snippet = truncate(it.text || cleanText(it.snippet), 320);
    if (source.aggregator) it.snippet = '';
    return it;
  });
}

async function get(url, accept) {
  const res = await fetch(url, {
    headers: { 'User-Agent': RADAR_UA, Accept: accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.reset = Number(res.headers.get('x-ratelimit-reset')) || Number(res.headers.get('retry-after')) || 0;
    throw err;
  }
  return res.text();
}

const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5';

async function fetchOne(source, config) {
  const started = Date.now();
  try {
    let xml;
    try {
      xml = await get(source.url, FEED_ACCEPT);
    } catch (err) {
      // 429 (zu viele Abrufe): genau ein zweiter Versuch. Reddit nennt die Wartezeit in x-ratelimit-reset.
      if (err.status !== 429) throw err;
      const waitS = Math.min(65, Math.max(3, (err.reset || 0) + 1));
      await sleep(waitS * 1000);
      xml = await get(source.url, FEED_ACCEPT);
    }
    return { source, ok: true, items: parseRadarFeed(xml, source, config), ms: Date.now() - started };
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'Timeout' : err.message;
    return { source, ok: false, error: msg, items: [], ms: Date.now() - started };
  }
}

// Google News und Reddit nacheinander (drosseln sonst), alle anderen parallel.
export async function fetchRadar(config) {
  const feeds = config.feeds.filter((f) => f.enabled !== false);
  const slow = feeds.filter((f) => f.url.includes('news.google.com') || f.type === 'reddit');
  const fast = feeds.filter((f) => !slow.includes(f));
  const slowRun = (async () => {
    const out = [];
    for (const f of slow) {
      out.push(await fetchOne(f, config));
      await sleep(2000);
    }
    return out;
  })();
  const [s, o] = await Promise.all([slowRun, Promise.all(fast.map((f) => fetchOne(f, config)))]);
  return [...s, ...o];
}

// Quellen-Liste laden; Stufen pro Domain vom News-Bot uebernehmen und mit eigenen ergaenzen
export function loadRadarConfig() {
  const radar = readJson(path.join(AUTOMATION_DIR, 'guide-radar', 'sources.json'), null);
  if (!radar) throw new Error('guide-radar/sources.json fehlt oder ist kaputt');
  const news = readJson(path.join(AUTOMATION_DIR, 'news-bot', 'sources.json'), {});
  return { ...radar, outletTiers: { ...(news.outletTiers ?? {}), ...(radar.outletTiers ?? {}) } };
}

// ---------- Volltext eines Artikels (nur fuer die Themen, die geschrieben werden) ----------
const SKIP_HOSTS = /(^|\.)(news\.google\.com|reddit\.com|redd\.it|youtube\.com|youtu\.be|x\.com|twitter\.com|tiktok\.com)$/;

export function extractArticleText(html, maxLen = 5000) {
  const h = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ');
  const article = h.match(/<article\b[\s\S]*<\/article>/i)?.[0];
  const scope = article ?? h;
  const tags = article ? 'p|h2|h3|li' : 'p|h2|h3';
  const parts = [];
  const seen = new Set();
  for (const m of scope.matchAll(new RegExp(`<(${tags})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi'))) {
    const tag = m[1].toLowerCase();
    const t = stripHtml(m[2]);
    if (!t || seen.has(t)) continue;
    if (tag === 'p' && t.length < 30) continue;
    if (/cookie|newsletter|subscribe|abonnier|anzeige|affiliate|sign up|log in|copyright|©/i.test(t) && t.length < 220) continue;
    seen.add(t);
    parts.push(tag === 'li' ? `- ${t}` : tag.startsWith('h') ? `## ${t}` : t);
  }
  return truncate(parts.join('\n'), maxLen);
}

// Laedt fuer Fachmedien-Meldungen den Artikeltext nach, wenn der Feed nur einen Anriss liefert.
export async function enrichItems(items, { maxPages = 4, minLen = 1200 } = {}) {
  let fetched = 0;
  for (const it of items) {
    if (fetched >= maxPages) break;
    if (it.type !== 'outlet' || it.aggregator || (it.text ?? '').length >= minLen) continue;
    const host = hostOf(it.link);
    if (!host || SKIP_HOSTS.test(host)) continue;
    fetched++;
    try {
      const html = await get(it.link, 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5');
      const t = extractArticleText(html);
      if (t.length > (it.text ?? '').length) {
        it.text = t;
        it.enriched = true;
      }
    } catch (err) {
      it.enrichError = err.message;
    }
  }
  return items;
}
