// Laedt fuer eine Story, die gleich geschrieben wird, den Text von bis zu 2 Originalartikeln nach
// (offizielle Quellen und grosse Fachmedien zuerst). Feeds liefern nur Schlagzeile und kurzen Anriss;
// mit dem Artikeltext hat Claude echte Fakten statt nur Ueberschriften. Der Text dient nur als
// Faktenquelle, er wird nicht gespeichert und vom Kopierschutz mitgeprueft.
import { extractArticleText } from '../guide-radar/fetch.mjs';
import { USER_AGENT, hostOf } from './fetch.mjs';
import { outletKey } from './analyze.mjs';

const TIMEOUT_MS = 10_000;
const SKIP_HOSTS = /(^|\.)(news\.google\.com|reddit\.com|redd\.it|youtube\.com|youtu\.be|x\.com|twitter\.com|tiktok\.com|instagram\.com|facebook\.com)$/;
const RANK = { official: 0, A: 1, B: 2 };

// Welche Meldungen lohnen sich? Keine Geruechte-Quellen, keine Google-News-Umleitungen, je Medium nur eine.
export function pickForText(items, maxPages = 2) {
  const seen = new Set();
  const out = [];
  const sorted = [...items]
    .filter((i) => i.tier in RANK && !i.aggregator && i.link && !SKIP_HOSTS.test(hostOf(i.link)))
    .sort((a, b) => RANK[a.tier] - RANK[b.tier] || (b.published ?? '').localeCompare(a.published ?? ''));
  for (const i of sorted) {
    const key = outletKey(i.domain) || hostOf(i.link);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
    if (out.length >= maxPages) break;
  }
  return out;
}

async function getHtml(url, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Setzt item.text (hoechstens maxLen Zeichen) bei den ausgewaehlten Meldungen. Fehler werden ignoriert.
export async function addArticleTexts(story, { maxPages = 2, maxLen = 2500, fetchImpl = fetch } = {}) {
  if (maxPages <= 0) return 0;
  const picked = pickForText(story.items, maxPages);
  const results = await Promise.allSettled(picked.map(async (item) => {
    const text = extractArticleText(await getHtml(item.link, fetchImpl), maxLen);
    // Nur nutzen, wenn wirklich mehr drinsteht als im Feed-Anriss
    if (text.length >= 300 && text.length > (item.snippet ?? '').length + 100) {
      item.text = text;
      return true;
    }
    return false;
  }));
  return results.filter((r) => r.status === 'fulfilled' && r.value).length;
}
