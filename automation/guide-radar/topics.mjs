// Themen bilden (gleiche Entdeckung aus mehreren Quellen), bewerten und gegen vorhandene Guides pruefen.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { sha1 } from '../lib/util.mjs';
import { buildIdf, outletKey, similarity, SIM_THRESHOLD, tokenize } from '../news-bot/analyze.mjs';

// Guide-Woerter DE -> EN, damit "Fundorte" und "locations" zusammenfinden (ergaenzt tokenize des News-Bots)
const GUIDE_SYN = {
  geld: 'money', cash: 'money', dollar: 'money', millionen: 'million', millions: 'million',
  verdienen: 'earn', verdient: 'earn', earning: 'earn', making: 'earn', farmen: 'earn', farming: 'earn', farm: 'earn', grind: 'earn', grinding: 'earn',
  fundort: 'location', fundorte: 'location', fundorten: 'location', orte: 'location', ort: 'location', standort: 'location', location: 'location', spot: 'location', spots: 'location', finden: 'find', findest: 'find', found: 'find', gefunden: 'find', entdeckt: 'find', discovered: 'find',
  versteckt: 'hidden', versteckte: 'hidden', versteckten: 'hidden', verstecktes: 'hidden', versteckter: 'hidden', hidden: 'hidden',
  geheim: 'secret', geheime: 'secret', geheimen: 'secret', geheimer: 'secret', geheimnis: 'secret', secret: 'secret',
  sammelobjekt: 'collectible', sammelobjekte: 'collectible', collectible: 'collectible',
  trophaee: 'trophy', trophaeen: 'trophy', trophies: 'trophy', trophy: 'trophy', erfolge: 'trophy', erfolg: 'trophy', achievement: 'trophy', platin: 'trophy', platinum: 'trophy',
  freischalten: 'unlock', freigeschaltet: 'unlock', unlocked: 'unlock', unlocking: 'unlock', unlocks: 'unlock',
  tipps: 'tips', tips: 'tips', tricks: 'tips', trick: 'tips',
  schnell: 'fast', schnellste: 'fast', schnellsten: 'fast', schnellstes: 'fast', fastest: 'fast', quickest: 'fast', quick: 'fast',
  auto: 'car', autos: 'car', car: 'car', cars: 'car', fahrzeug: 'car', fahrzeuge: 'car', vehicle: 'car', wagen: 'car', supercar: 'car',
  waffe: 'weapon', waffen: 'weapon', weapon: 'weapon', gun: 'weapon', guns: 'weapon',
  geist: 'ghost', geister: 'ghost', ghost: 'ghost', ghosts: 'ghost',
  mythos: 'myth', mythen: 'myth', myth: 'myth', myths: 'myth',
  ueberfall: 'heist', ueberfaelle: 'heist', coup: 'heist', heists: 'heist', heist: 'heist', raubzug: 'heist',
  mission: 'mission', missionen: 'mission',
  anfaenger: 'beginner', einsteiger: 'beginner', beginners: 'beginner', beginner: 'beginner',
  eggs: 'egg', egg: 'egg', ostereier: 'egg', osterei: 'egg',
  bug: 'glitch', glitch: 'glitch',
};

// Bindestrich-Woerter trennen ("UFO-Fundort" -> "UFO Fundort"), dann wie der News-Bot zerlegen
export function guideTokens(title) {
  const s = String(title ?? '').replace(/([A-Za-zÄÖÜäöüß0-9])-(?=[A-Za-zÄÖÜäöüß])/g, '$1 ');
  return [...new Set(tokenize(s).map((t) => GUIDE_SYN[t] ?? t))];
}

// Wer zaehlt als unabhaengige Quelle? Reddit zaehlt als EINE Quelle, YouTube pro Kanal, Medien pro Domain.
export function independentKey(item) {
  if (item.type === 'reddit') return 'reddit';
  if (item.type === 'youtube') return `yt:${String(item.outlet ?? '').toLowerCase()}`;
  return outletKey(item.domain) || String(item.outlet ?? '').toLowerCase();
}

const RANK = { official: 0, A: 1, B: 2, C: 3, rumor: 4 };
const TYPE_RANK = { outlet: 0, youtube: 1, reddit: 2 };
export function rankItems(items) {
  return [...items].sort((a, b) => (RANK[a.tier] ?? 9) - (RANK[b.tier] ?? 9)
    || (TYPE_RANK[a.type] ?? 9) - (TYPE_RANK[b.type] ?? 9)
    || Number(!!a.aggregator) - Number(!!b.aggregator)
    || (b.intent?.score ?? 0) - (a.intent?.score ?? 0));
}

export function headTitle(topic) {
  return rankItems(topic.items)[0]?.title ?? '';
}

// Gieriges Clustering mit der Aehnlichkeit des News-Bots. Verschiedene Spiele werden nie zusammengelegt.
export function clusterTopics(items, w, threshold = SIM_THRESHOLD) {
  const topics = [];
  const sorted = [...items].sort((a, b) => (b.intent?.score ?? 0) - (a.intent?.score ?? 0) || String(a.published ?? '').localeCompare(String(b.published ?? '')));
  for (const it of sorted) {
    const toks = it.tokens ?? guideTokens(it.title);
    let best = null;
    let bestSim = 0;
    for (const t of topics) {
      if (t.game && it.game && t.game !== it.game) continue;
      for (const m of t.items) {
        const s = similarity(toks, m.tokens, w);
        if (s > bestSim) { bestSim = s; best = t; }
      }
    }
    const slim = { ...it, tokens: toks };
    if (best && bestSim >= threshold) {
      if (best.items.length < 12) best.items.push(slim);
      best.game ??= it.game ?? null;
    } else {
      topics.push({ id: sha1(`${it.id}|${it.title}`, 12), items: [slim], game: it.game ?? null });
    }
  }
  return topics;
}

const HOUR = 3_600_000;
const NO_FETCH_HOSTS = /(^|\.)(news\.google\.com|reddit\.com|youtube\.com|x\.com|twitter\.com|tiktok\.com)$/;
export const SINGLE_SOURCE_MIN_INTENT = 5;

// Hat die Meldung genug Text, aus dem Claude Fakten ziehen kann (oder laesst sich der Artikel nachladen)?
export function hasTextBasis(item) {
  const len = (item.text ?? '').length;
  if (item.type === 'reddit' || item.type === 'youtube') return len >= 200;
  if (len >= 400) return true;
  if (item.aggregator) return false; // Google-News-Links lassen sich nicht nachladen
  try {
    return !NO_FETCH_HOSTS.test(new URL(item.link).hostname.replace(/^www\./, ''));
  } catch {
    return false;
  }
}

// Bewertung: unabhaengige Quellen, Reddit/YouTube, Staerke der Guide-Absicht, Aktualitaet.
// Entwurf nur bei >= 2 unabhaengigen Quellen ODER einer offiziellen/A-Quelle. Nur-Reddit = beobachten.
// Dazu muss mindestens eine Quelle echten Text liefern (Guides duerfen nur Fakten aus den Quellen nutzen).
export function assessTopic(topic, now = Date.now()) {
  const items = topic.items;
  const keys = new Set(items.map(independentKey));
  const independent = keys.size;
  const hasReddit = items.some((i) => i.type === 'reddit');
  const hasYoutube = items.some((i) => i.type === 'youtube');
  const official = items.filter((i) => i.tier === 'official');
  const tierA = items.filter((i) => i.tier === 'A');
  const onlyReddit = items.every((i) => i.type === 'reddit');
  const textBasis = items.some(hasTextBasis);
  const known = items.filter((i) => i.type !== 'reddit' && i.tier !== 'C');
  const maxIntent = Math.max(...items.map((i) => i.intent?.score ?? 0));
  const newest = Math.max(...items.map((i) => new Date(i.published ?? 0).getTime()));
  const ageH = (now - newest) / HOUR;
  const recency = ageH <= 12 ? 3 : ageH <= 24 ? 2 : ageH <= 48 ? 1 : 0;
  const score = 4 * Math.min(independent, 4)
    + (official.length ? 4 : tierA.length ? 2 : 0)
    + (hasReddit ? 1 : 0)
    + (hasYoutube ? 1.5 : 0)
    + 0.75 * Math.min(maxIntent, 8)
    + recency;
  const names = [...new Set(rankItems(items).map((i) => i.outlet))].slice(0, 4).join(', ');
  let decision;
  let reason;
  if (onlyReddit) {
    decision = 'watch';
    reason = `nur Reddit (${names}), wartet auf zweite Quelle`;
  } else if (!textBasis) {
    decision = 'watch';
    reason = `nur Schlagzeilen ohne Quelltext (${names})`;
  } else if (!known.length) {
    decision = 'watch';
    reason = `nur unbekannte Seiten (${names}), wartet auf bekannte Quelle`;
  } else if (independent >= 2) {
    decision = 'draft';
    reason = `${independent} unabhaengige Quellen (${names})`;
  } else if ((official.length || tierA.length) && maxIntent < SINGLE_SOURCE_MIN_INTENT) {
    decision = 'watch';
    reason = `nur eine Quelle (${names}) und Guide-Signal schwach`;
  } else if (official.length) {
    decision = 'draft';
    reason = `offizielle Quelle (${official[0].outlet})`;
  } else if (tierA.length) {
    decision = 'draft';
    reason = `grosses Fachmedium (${tierA[0].outlet})`;
  } else {
    decision = 'watch';
    reason = `nur eine Quelle (${names}), zweite fehlt`;
  }
  return {
    decision, reason, independent, hasReddit, hasYoutube, textBasis,
    official: official.length > 0, tierA: tierA.length > 0, onlyReddit,
    communityOnly: items.every((i) => i.type === 'reddit' || i.type === 'youtube'),
    maxIntent, ageHours: Math.round(ageH * 10) / 10, score: Math.round(score * 10) / 10,
  };
}

// ---------- Vorhandene Guides der Seite ----------
export function loadExistingGuides(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    try {
      const { data } = matter(readFileSync(path.join(dir, f), 'utf8'));
      const slug = f.replace(/\.md$/, '');
      const title = String(data.title ?? slug);
      out.push({ slug, title, game: data.game ?? null, category: data.category ?? null, tokens: guideTokens(`${title} ${slug.replace(/-/g, ' ')}`) });
    } catch { /* kaputte Datei ignorieren, die Seite meldet das selbst */ }
  }
  return out;
}

// Gibt es zum Thema schon einen Guide? Gleiches Spiel (oder unbekannt) und aehnlicher Titel.
export function findExistingGuide(topic, guides, w, threshold = SIM_THRESHOLD) {
  let best = null;
  let bestSim = 0;
  for (const g of guides) {
    if (topic.game && g.game && g.game !== topic.game) continue;
    for (const it of topic.items) {
      const s = similarity(it.tokens ?? guideTokens(it.title), g.tokens, w);
      if (s > bestSim) { bestSim = s; best = g; }
    }
  }
  return best && bestSim >= threshold ? { guide: best, sim: Math.round(bestSim * 100) / 100 } : null;
}

export function makeIdf(tokenLists) {
  return buildIdf(tokenLists);
}
