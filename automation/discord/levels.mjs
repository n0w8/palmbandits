// Fahndungslevel (Sterne nach Aktivitaet) und Guide-Helfer. Laeuft im stuendlichen Job (daily.mjs badges),
// ohne eigenen Bot-Server und ohne fremden Level-Bot.
//
// Sterne: Der Job liest alle neuen Nachrichten seit dem letzten Lauf (Text-, Ankuendigungs-Kanaele und aktive
// Threads/Forum-Beitraege). Pro Mitglied zaehlt hoechstens 1 Nachricht pro Minute (Spam bringt nichts).
// Ab den Schwellen in blueprint.mjs (Feld xp) gibt es den naechsten Stern. Es gibt nie einen Abstieg.
// Der Punktestand liegt als Datei im privaten Team-Kanal #bot-daten (nicht im oeffentlichen Repo).
//
// Guide-Helfer: Steht in einem Artikel (src/content/**.md) im Frontmatter
//   helpers:
//     - name: "Anzeigename"
//       discord: "discord-nutzername"   (oder die Discord-ID)
// bekommt dieses Mitglied automatisch die Rolle Guide-Helfer.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { api, apiUpload } from './api.mjs';
import { ROLES } from './blueprint.mjs';

export const COOLDOWN_MS = 60_000;
export const DATA_FILE = 'aktivitaet.json';
export const STAR_ROLES = ROLES.filter((r) => r.xp).sort((a, b) => a.xp - b.xp);
const USER_MSG_TYPES = new Set([0, 19]); // normale Nachricht, Antwort
const MAX_PAGES_PER_CHANNEL = 50; // erster Lauf auf grossem Server: Rest kommt im naechsten Lauf

export const emptyActivity = () => ({ v: 1, cursors: {}, users: {} });
export const snowflakeTime = (id) => Number((BigInt(id) >> 22n) + 1420070400000n);
const maxId = (a, b) => (BigInt(a) >= BigInt(b) ? a : b);

// Punkte vergeben: 1 pro Nachricht, hoechstens 1 pro Minute und Mitglied. Gibt die Zahl gezaehlter Nachrichten zurueck.
export function applyMessages(users, msgs, cooldown = COOLDOWN_MS) {
  let counted = 0;
  for (const m of [...msgs].sort((a, b) => a.ts - b.ts)) {
    const u = users[m.author] ?? (users[m.author] = { xp: 0, last: 0 });
    if (m.ts - u.last < cooldown) continue;
    u.xp += 1;
    u.last = m.ts;
    counted++;
  }
  return counted;
}

export function starFor(xp, stars = STAR_ROLES) {
  let hit = null;
  for (const r of stars) if (xp >= r.xp) hit = r;
  return hit;
}

// Welcher Stern soll es sein? Nie absteigen: ein hoeherer Stern (z. B. von Hand vergeben) bleibt.
// Ein Mitglied traegt immer nur EINEN Stern, niedrigere werden entfernt.
export function planStars(xp, currentKeys, stars = STAR_ROLES) {
  const rank = (k) => stars.findIndex((r) => r.key === k);
  const held = currentKeys.filter((k) => rank(k) >= 0);
  const best = held.reduce((b, k) => Math.max(b, rank(k)), -1);
  const earned = starFor(xp, stars);
  const earnedIdx = earned ? rank(earned.key) : -1;
  const targetIdx = Math.max(best, earnedIdx);
  if (targetIdx < 0) return { target: null, add: null, remove: [], levelUp: null };
  const target = stars[targetIdx].key;
  return {
    target,
    add: held.includes(target) ? null : target,
    remove: held.filter((k) => k !== target),
    levelUp: earnedIdx > best ? target : null,
  };
}

// Alle Discord-Namen/IDs aus helpers: in den Artikeln (klein geschrieben).
export function helperHandles(contentDir) {
  const out = new Set();
  let files = [];
  try { files = readdirSync(contentDir, { recursive: true }).filter((f) => String(f).endsWith('.md')); } catch { return out; }
  for (const f of files) {
    let data;
    try { data = matter(readFileSync(path.join(contentDir, String(f)), 'utf8')).data; } catch { continue; }
    for (const h of Array.isArray(data?.helpers) ? data.helpers : []) {
      const d = String(h?.discord ?? '').trim().replace(/^@/, '').toLowerCase();
      if (d) out.add(d);
    }
  }
  return out;
}

// Mitglied passt zu einem Eintrag, wenn ID oder Nutzername gleich sind.
export function matchesHandle(member, handles) {
  return handles.has(member.user.id) || handles.has(String(member.user.username ?? '').toLowerCase());
}

// ---------- Discord: Punktestand laden und speichern (Datei im Kanal #bot-daten) ----------
export async function loadActivity(channelId, botId) {
  const msgs = await api('GET', `/channels/${channelId}/messages?limit=25`);
  const mine = msgs.filter((m) => m.author?.id === botId && m.attachments?.some((a) => a.filename === DATA_FILE));
  if (!mine.length) return { data: emptyActivity(), stored: [] };
  const att = mine[0].attachments.find((a) => a.filename === DATA_FILE);
  // Wenn eine Datei da ist, aber nicht lesbar: abbrechen statt mit leerem Stand weiterzumachen.
  const res = await fetch(att.url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Aktivitaetsdatei nicht ladbar (HTTP ${res.status}), Lauf abgebrochen.`);
  const data = await res.json();
  if (data?.v !== 1 || typeof data.users !== 'object' || typeof data.cursors !== 'object') throw new Error('Aktivitaetsdatei ungueltig, Lauf abgebrochen.');
  return { data, stored: mine.map((m) => m.id) };
}

export async function saveActivity(channelId, data, stored, keep = 2) {
  const json = JSON.stringify(data);
  await apiUpload(`/channels/${channelId}/messages`, {
    content: `Aktivitätspunkte für die Sterne, Stand ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Bitte nicht löschen.`,
    allowed_mentions: { parse: [] },
  }, [{ name: DATA_FILE, data: json, type: 'application/json' }]);
  // die neueste Datei plus `keep` aeltere als Sicherung behalten, den Rest aufraeumen
  for (const id of stored.slice(keep)) {
    await api('DELETE', `/channels/${channelId}/messages/${id}`).catch(() => {});
  }
}

// Neue Nachrichten seit dem letzten Lauf einsammeln. Gibt { msgs, cursors } zurueck.
export async function collectNew(guildId, cursors, skip = new Set()) {
  const channels = await api('GET', `/guilds/${guildId}/channels`);
  const active = await api('GET', `/guilds/${guildId}/threads/active`);
  const targets = [...channels.filter((c) => c.type === 0 || c.type === 5), ...(active?.threads ?? [])].filter((c) => !skip.has(c.id));
  const next = { ...cursors };
  const msgs = [];
  for (const c of targets) {
    const start = cursors[c.id] ?? '0';
    if (!c.last_message_id || (start !== '0' && BigInt(c.last_message_id) <= BigInt(start))) continue; // nichts Neues
    let after = start;
    for (let page = 0; page < MAX_PAGES_PER_CHANNEL; page++) {
      let batch;
      try {
        batch = await api('GET', `/channels/${c.id}/messages?limit=100&after=${after}`);
      } catch (e) {
        if (e.status === 403 || e.status === 404) break; // kein Zugriff oder geloescht
        throw e;
      }
      if (!batch?.length) break;
      for (const m of batch) {
        after = maxId(after, m.id);
        if (m.author?.bot || m.webhook_id || !USER_MSG_TYPES.has(m.type)) continue;
        msgs.push({ author: m.author.id, ts: snowflakeTime(m.id) });
      }
      if (batch.length < 100) break;
    }
    if (after !== '0') next[c.id] = after;
  }
  return { msgs, cursors: next };
}
