// Gedaechtnis des Guide-Radars (automation/data/radar-seen.json):
// welche Meldungen schon zu einem Entwurf wurden oder abgelehnt sind, welche Themen schon bearbeitet sind,
// und ein Protokoll der Entwuerfe (fuer die Tagesgrenze). Alles aelter als 30 Tage wird aufgeraeumt.
import path from 'node:path';
import { DATA_DIR, berlinDate, readJson, writeJson } from '../lib/util.mjs';
import { similarity } from '../news-bot/analyze.mjs';
import { guideTokens } from './topics.mjs';

export const RADAR_FILE = path.join(DATA_DIR, 'radar-seen.json');
const DAY = 86_400_000;
export const KEEP_DAYS = 30;
export const REJECT_BLOCK_DAYS = 3; // abgelehnte Themen nur kurz sperren, vielleicht kommen bessere Quellen

export function emptyState() {
  return { version: 1, items: {}, topics: [], log: [] };
}

export function loadRadarState(file = RADAR_FILE) {
  const s = readJson(file, null) ?? {};
  return { version: 1, items: s.items ?? {}, topics: s.topics ?? [], log: s.log ?? [] };
}

export function saveRadarState(state, file = RADAR_FILE) {
  writeJson(file, state);
}

export function pruneRadarState(state, now = Date.now(), days = KEEP_DAYS) {
  const cutoff = now - days * DAY;
  for (const [id, v] of Object.entries(state.items)) if (new Date(v.ts).getTime() < cutoff) delete state.items[id];
  state.topics = state.topics.filter((t) => new Date(t.ts).getTime() >= cutoff);
  state.log = state.log.filter((e) => new Date(e.ts).getTime() >= cutoff);
  return state;
}

// Meldungen, die schon in einem Entwurf stecken oder abgelehnt wurden, nicht erneut verwerten
export function isBlockedItem(state, item) {
  const v = state.items[item.id];
  return Boolean(v && (v.s === 'drafted' || v.s === 'rejected'));
}

export function rememberTopic(state, topic, status, extra = {}, now = Date.now()) {
  const ts = new Date(now).toISOString();
  for (const it of topic.items) state.items[it.id] = { ts, s: status };
  const title = extra.title ?? topic.items[0]?.title ?? '';
  state.topics.push({
    id: topic.id,
    title,
    // Original-Schlagzeilen merken (meist englisch), damit spaetere Meldungen zum Thema erkannt werden
    titles: [...new Set([title, ...topic.items.map((i) => i.title)])].slice(0, 6),
    game: extra.game ?? topic.game ?? null,
    status,
    slug: extra.slug ?? undefined,
    reason: extra.reason ?? undefined,
    ts,
  });
  if (status === 'drafted') {
    state.log.push({ ts, date: berlinDate(new Date(now)), slug: extra.slug, title: extra.title, sources: extra.sources ?? topic.items.length });
  }
}

// Wurde ein aehnliches Thema schon entworfen (30 Tage) oder kuerzlich abgelehnt (3 Tage)?
export function findSimilarTopic(topic, state, w, now = Date.now(), threshold = 0.5) {
  for (const t of [...state.topics].reverse()) {
    const age = now - new Date(t.ts).getTime();
    if (t.status === 'rejected' && age > REJECT_BLOCK_DAYS * DAY) continue;
    if (topic.game && t.game && topic.game !== t.game) continue;
    for (const known of t.titles ?? [t.title]) {
      const tt = guideTokens(known);
      for (const it of topic.items) {
        if (similarity(it.tokens ?? guideTokens(it.title), tt, w) >= threshold) return t;
      }
    }
  }
  return null;
}

// Alle gemerkten Themen-Titel (fuer die Wort-Gewichtung)
export function memoryTitles(state) {
  return state.topics.flatMap((t) => t.titles ?? [t.title]);
}

export function draftsToday(state, now = new Date()) {
  const today = berlinDate(now);
  return state.log.filter((e) => e.date === today).length;
}
