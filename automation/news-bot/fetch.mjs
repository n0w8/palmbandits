// Feeds abrufen (parallel, 10 s Timeout) und in ein einheitliches Format bringen.
import { XMLParser } from 'fast-xml-parser';
import { decodeEntities, sha1, sleep, stripHtml, truncate } from '../lib/util.mjs';

export const USER_AGENT = 'Mozilla/5.0 (compatible; PalmBanditsNewsBot/1.0)';
const TIMEOUT_MS = 10_000;

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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

// "de.ign.com" -> "ign.com"; "blog.de.playstation.com" -> "playstation.com"
export function rootDomain(host) {
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;
  const twoLevel = /^(co|com|org|net|gov)\.[a-z]{2}$/.test(parts.slice(-2).join('.'));
  return parts.slice(twoLevel ? -3 : -2).join('.');
}

export function canonicalUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|ref_src|cmpid|ito)/i.test(k)) u.searchParams.delete(k);
    }
    u.hostname = u.hostname.toLowerCase();
    let s = u.toString();
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch {
    return url;
  }
}

function linkOf(entry, isAtom) {
  const links = entry.link ?? [];
  if (!isAtom) return text(links[0] ?? entry.guid);
  const alt = links.find((l) => typeof l === 'object' && (!l['@_rel'] || l['@_rel'] === 'alternate'));
  const any = alt ?? links[0];
  return typeof any === 'object' ? any['@_href'] ?? '' : text(any);
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseFeed(xml, source, outletTiers) {
  const doc = parser.parse(xml);
  const isAtom = !!doc.feed;
  const entries = isAtom ? doc.feed.entry ?? [] : doc.rss?.channel?.item ?? doc['rdf:RDF']?.item ?? [];
  const items = [];
  for (const e of entries) {
    let title = stripHtml(text(e.title));
    const link = linkOf(e, isAtom);
    if (!title || !link) continue;
    const published = parseDate(text(e.pubDate ?? e.published ?? e.updated ?? e['dc:date']));
    const rawSnippet = text(e.description ?? e.summary ?? e['content:encoded'] ?? e.content);
    let snippet = truncate(stripHtml(rawSnippet), 320);

    let outlet = source.outletName ?? source.name;
    let domain = rootDomain(hostOf(link));
    let tier = source.tier;
    if (source.aggregator) {
      // Google News: Originalquelle steckt in <source url="...">Name</source>, Titel endet auf " - Name"
      const src = e.source;
      const srcName = text(src);
      const srcUrl = typeof src === 'object' ? src['@_url'] : '';
      if (srcName) {
        outlet = srcName;
        const suffix = ` - ${srcName}`;
        if (title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
      }
      domain = rootDomain(hostOf(srcUrl || link));
      tier = source.tier === 'official' ? 'official' : outletTiers[domain] ?? outletTiers[hostOf(srcUrl)] ?? 'B';
      // Google-News-Auszug wiederholt nur Titel und Quelle, bringt also nichts
      snippet = '';
    }
    items.push({
      id: sha1(canonicalUrl(link)),
      title,
      link,
      canonical: canonicalUrl(link),
      snippet,
      published: published ? published.toISOString() : null,
      feed: source.name,
      outlet,
      domain,
      tier,
      lang: source.lang,
      focus: source.focus ?? null,
      aggregator: !!source.aggregator,
    });
  }
  return items;
}

async function fetchOne(source, outletTiers) {
  const started = Date.now();
  try {
    let xml;
    try {
      xml = await fetchText(source.url);
    } catch (err) {
      // Google News und Reddit drosseln manchmal (429), Server haben kurze Aussetzer (5xx, Netzwerkfehler):
      // einmal kurz warten und neu versuchen. 4xx ausser 429 (z. B. 404) nicht wiederholen.
      const transient = err.status === 429 || err.status >= 500 || (!err.status && err.name !== 'TimeoutError');
      if (!transient) throw err;
      await sleep(3000);
      xml = await fetchText(source.url);
    }
    const items = parseFeed(xml, source, outletTiers);
    return { source, ok: true, items, ms: Date.now() - started };
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'Timeout' : err.message;
    return { source, ok: false, error: msg, items: [], ms: Date.now() - started };
  }
}

// Google-News-Feeds nacheinander (sonst 429), alle anderen parallel.
export async function fetchAll(config) {
  const feeds = config.feeds.filter((f) => f.enabled !== false);
  const google = feeds.filter((f) => f.url.includes('news.google.com'));
  const others = feeds.filter((f) => !f.url.includes('news.google.com'));
  const googleRun = (async () => {
    const out = [];
    for (const f of google) {
      out.push(await fetchOne(f, config.outletTiers));
      await sleep(2000);
    }
    return out;
  })();
  const [g, o] = await Promise.all([googleRun, Promise.all(others.map((f) => fetchOne(f, config.outletTiers)))]);
  return [...g, ...o];
}
