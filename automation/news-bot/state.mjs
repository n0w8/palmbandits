// Gedaechtnis des News-Bots: welche Meldungen schon gesehen wurden, welche Storys offen sind, was veroeffentlicht wurde.
import path from 'node:path';
import { DATA_DIR, berlinDate, readJson, sha1, writeJson } from '../lib/util.mjs';
import { tokenize } from './analyze.mjs';

export const SEEN_FILE = path.join(DATA_DIR, 'news-seen.json');
export const LOG_FILE = path.join(DATA_DIR, 'news-log.json');

const DAY = 86_400_000;

export function normTitleKey(title) {
  return sha1(tokenize(title).sort().join(' '), 12);
}

export function loadState() {
  const s = readJson(SEEN_FILE, null) ?? {};
  return {
    version: 1,
    items: s.items ?? {},
    titles: s.titles ?? {},
    stories: s.stories ?? [],
  };
}

export function pruneState(state, now) {
  const cutoff = now - 14 * DAY;
  for (const key of ['items', 'titles']) {
    for (const [k, ts] of Object.entries(state[key])) if (new Date(ts).getTime() < cutoff) delete state[key][k];
  }
  // Storys 2 Tage behalten (fuer Folgemeldungen); danach reichen die Item-Hashes.
  // Offene Storys ohne neue Meldung seit 24 h gelten als abgelaufen.
  state.stories = state.stories.filter((s) => now - new Date(s.lastSeen).getTime() < 2 * DAY);
  for (const s of state.stories) if (s.status === 'pending' && now - new Date(s.lastSeen).getTime() > DAY) s.status = 'expired';
  // Tokens werden beim Laden neu berechnet, nicht speichern. Erledigte Storys brauchen nur noch Titel (fuer Folgemeldungen).
  for (const s of state.stories) {
    for (const i of s.items) delete i.tokens;
    if (s.status !== 'pending') s.items = s.items.slice(0, 8).map(({ id, title, outlet, domain, tier }) => ({ id, title, outlet, domain, tier }));
  }
  return state;
}

export function saveState(state) {
  writeJson(SEEN_FILE, state);
}

export function isSeen(state, item) {
  return Boolean(state.items[item.id] || state.titles[normTitleKey(item.title)]);
}

export function markSeen(state, item, nowIso) {
  state.items[item.id] ??= nowIso;
  state.titles[normTitleKey(item.title)] ??= nowIso;
}

export function loadLog() {
  return readJson(LOG_FILE, { entries: [] });
}

export function saveLog(log, now) {
  log.entries = log.entries.filter((e) => now - new Date(e.ts).getTime() < 30 * DAY);
  writeJson(LOG_FILE, log);
}

export function countToday(log, now = new Date()) {
  const today = berlinDate(now);
  return log.entries.filter((e) => e.date === today && (e.color === 'green' || e.color === 'yellow')).length;
}

export function recentTitles(log, limit = 15) {
  return log.entries.slice(-limit).map((e) => e.title);
}

// Story-Felder, die gespeichert werden (kompakt halten)
export function slimItem(i) {
  return {
    id: i.id, title: i.title, link: i.link, outlet: i.outlet, domain: i.domain, tier: i.tier,
    lang: i.lang, published: i.published, snippet: i.snippet ? i.snippet.slice(0, 240) : '', aggregator: !!i.aggregator,
  };
}
