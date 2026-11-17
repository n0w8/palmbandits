// Baut aus den Inhalten die Pin-Liste (Texte, Links, Board, Design) und die Warteschlange.
// Regeln aus der bisherigen Pinterest-Erfahrung: max. 3 Pins pro Ziel-URL und Tag, max. 25 Pins pro Tag,
// keine langen Striche, jeder Link eindeutig (Pinterest-Bulk verwirft doppelte Links in einer CSV).
import path from 'node:path';
import { AUTOMATION_DIR, DATA_DIR, berlinDate, hasLongDash, noLongDashes, readJson, siteUrl, truncate, writeJson, BRAND } from '../lib/util.mjs';
import { GAME_NAMES, GAME_TAGS } from './content.mjs';
import { wallpaperName } from './wallpaper.mjs';

export const QUEUE_FILE = path.join(DATA_DIR, 'pin-queue.json');
export const POSTED_FILE = path.join(DATA_DIR, 'pins-posted.json');
export const OUT_DIR = path.join(AUTOMATION_DIR, 'pinterest', 'out');
export const MAX_PER_URL_PER_DAY = 3;
export const HARD_DAY_LIMIT = 25;

const CHEAT_CAT = { spieler: 'Spieler', waffen: 'Waffen', fahrzeuge: 'Fahrzeuge', wanted: 'Fahndung', welt: 'Welt & Wetter', spass: 'Spaß' };
const TIPS_WORD = { tipps: 'TIPPS', geld: 'GELD-TIPPS', fundorte: 'ORTE', glitches: 'GLITCHES', 'easter-eggs': 'EASTER EGGS', cheats: 'CHEATS', wissen: 'FAKTEN' };
const TIPS_LABEL = { tipps: 'Tipps', geld: 'Geld-Tipps', fundorte: 'versteckte Orte', glitches: 'Glitches', 'easter-eggs': 'Easter Eggs', cheats: 'Cheats', wissen: 'Fakten' };
const DIFF = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };

export function linkFor(urlPath, type, id, hash = '') {
  const u = `${siteUrl()}${urlPath}?utm_source=pinterest&utm_medium=social&utm_campaign=${type}&utm_content=${encodeURIComponent(id)}`;
  return hash ? `${u}#${hash}` : u;
}

export function baseUrl(link) {
  const u = new URL(link);
  return `${u.origin}${u.pathname}`;
}

function hashtags(...tags) {
  return [...new Set(tags.filter(Boolean))].slice(0, 4).map((t) => `#${t}`).join(' ');
}

function description(text, tags) {
  const tagStr = hashtags(...tags);
  const body = truncate(noLongDashes(text), 500 - tagStr.length - 1);
  return `${body} ${tagStr}`.trim();
}

function shortHeadline(title) {
  const t = noLongDashes(title);
  const i = t.indexOf(':');
  return i > 8 && t.length > 42 ? t.slice(0, i) : t;
}

function domainLabel() {
  return new URL(siteUrl()).host;
}

function germanDate(d) {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : berlinDate(date).split('-').reverse().join('.');
}

export function buildPins(content, now = new Date()) {
  const domain = domainLabel();
  const pins = [];

  for (const g of content.guides) {
    const d = g.data;
    const game = GAME_NAMES[d.game] ?? 'GTA';
    const tagsG = GAME_TAGS[d.game] ?? GAME_TAGS.allgemein;
    const bullets = (g.h2.length >= 3 ? g.h2 : g.list).slice(0, 5);
    const urlPath = `/guides/${g.slug}/`;
    const headline = shortHeadline(d.title);
    const id = `guide-${g.slug}`;
    pins.push({
      id, type: 'guide', board: d.category === 'tipps' ? 'tipps' : 'guides',
      title: truncate(noLongDashes(d.title), 100),
      description: description(`${d.description} Den kompletten Guide mit allen Schritten findest du auf ${BRAND}, der deutschen GTA-Community.`, [tagsG[0], 'gtaguide', d.category === 'geld' ? 'gtageld' : 'gtatipps']),
      link: linkFor(urlPath, 'guide', id),
      altText: truncate(`Pin-Grafik zum ${game} Guide "${headline}" mit ${bullets.length || 'mehreren'} nummerierten Punkten auf dunklem Hintergrund mit Sonnenuntergangs-Farbverlauf und fünf Sternen.`, 500),
      sortKey: [d.featured ? 0 : 1, -new Date(d.pubDate ?? 0).getTime(), g.slug],
      design: { type: 'guide', headline, text: d.description, bullets, gameName: game, difficulty: DIFF[d.difficulty] ?? null, cta: 'Ganzen Guide lesen »', domain, stars: d.featured ? 5 : 4 },
    });

    const items = (g.h2.length >= 4 ? g.h2 : g.list).slice(0, 7);
    if (items.length >= 4) {
      const numInTitle = parseInt((d.title.match(/\b(\d{1,2})\b/) ?? [])[1], 10);
      const count = numInTitle && numInTitle <= items.length ? numInTitle : items.length;
      const label = TIPS_LABEL[d.category] ?? 'Tipps';
      const tid = `tips-${g.slug}`;
      pins.push({
        id: tid, type: 'tips', board: 'tipps',
        title: truncate(`${shortHeadline(d.title)}: ${count} ${label} auf einen Blick`, 100),
        description: description(`${count} ${label} für ${game} kompakt zusammengefasst: ${items.slice(0, 3).join(', ')} und mehr. Alle Details stehen im Guide auf ${BRAND}.`, [tagsG[0], 'gtatipps', 'gaming']),
        link: linkFor(urlPath, 'tips', tid),
        altText: truncate(`Liste mit ${count} ${label} für ${game}: ${items.slice(0, count).join(', ')}.`, 500),
        sortKey: [d.featured ? 0 : 1, -new Date(d.pubDate ?? 0).getTime(), g.slug],
        design: { type: 'tips', headline: shortHeadline(d.title), bullets: items.slice(0, count), count, word: TIPS_WORD[d.category] ?? 'TIPPS', gameName: game, cta: 'Alle Details im Guide »', domain },
      });
    }
  }

  const maxNewsAgeMs = 3 * 86_400_000;
  for (const n of content.news) {
    const d = n.data;
    const age = now - new Date(d.pubDate ?? 0).getTime();
    if (age > maxNewsAgeMs || d.rumor || (d.hype ?? 3) < 3) continue;
    const game = GAME_NAMES[d.game] ?? 'GTA';
    const tagsN = GAME_TAGS[d.game] ?? GAME_TAGS.allgemein;
    const id = `news-${n.slug}`;
    pins.push({
      id, type: 'news', board: 'news',
      title: truncate(noLongDashes(d.title), 100),
      description: description(`${d.description} Alle bestätigten Fakten und was das für dich heißt, liest du auf ${BRAND}.`, [tagsN[0], 'gtanews', 'gaming']),
      link: linkFor(`/news/${n.slug}/`, 'news', id),
      altText: truncate(`News-Grafik zu ${game}: "${d.title}" in großer Schrift, darunter eine kurze Zusammenfassung und das Hype-Level als Sterne.`, 500),
      sortKey: [-new Date(d.pubDate ?? 0).getTime(), n.slug],
      design: { type: 'news', headline: d.title, text: d.description, hype: d.hype ?? 3, breaking: !!d.breaking, rumor: !!d.rumor, date: germanDate(d.pubDate), cta: 'Alle Infos lesen »', domain },
    });
  }

  for (const c of content.cheats) {
    const game = GAME_NAMES[c.game] ?? 'GTA';
    const tagsC = GAME_TAGS[c.game] ?? GAME_TAGS.allgemein;
    const id = `cheat-${c.game}-${c.id}`;
    const seq = c.playstation ?? c.xbox ?? null;
    const how = [
      c.pc ? `Auf dem PC gibst du ${c.pc} ein.` : '',
      c.phone ? `Am Handy im Spiel wählst du ${c.phone}.` : '',
      seq ? `Für ${c.playstation ? 'PlayStation' : 'Xbox'} steht die Tastenfolge auf dem Bild.` : '',
    ].filter(Boolean).join(' ');
    pins.push({
      id, type: 'cheat', board: 'cheats',
      title: truncate(noLongDashes(`${game} Cheat: ${c.effect}${c.pc ? ` (${c.pc})` : ''}`), 100),
      description: description(`So bekommst du in ${game} "${c.effect}". ${how} Alle ${game} Cheats für PC, Konsole und Handy findest du auf ${BRAND}.`, [tagsC[0], 'gtacheats', 'cheats']),
      link: linkFor(`/cheats/${c.game}/`, 'cheat', id, c.id),
      altText: truncate(`Pin-Grafik: ${game} Cheat "${c.effect}"${c.pc ? ` mit dem PC-Code ${c.pc} in großer Schrift` : ''}${seq ? ' und der Tastenfolge für die Konsole' : ''}${c.phone ? ` und der Handynummer ${c.phone}` : ''}.`, 500),
      game: c.game,
      sortKey: [Object.keys(CHEAT_CAT).indexOf(c.category ?? 'spieler'), c.id],
      design: {
        type: 'cheat', headline: c.effect, gameName: game, category: CHEAT_CAT[c.category] ?? null,
        code: c.pc ?? null, codeLabel: 'PC-CODE', phone: c.phone ?? null,
        howTo: c.pc ? c.howTo?.pc : c.phone ? c.howTo?.phone : c.howTo?.playstation ?? c.howTo?.xbox ?? null, note: c.note ?? null,
        sequence: seq, sequencePlatform: c.playstation ? 'playstation' : 'xbox', sequenceLabel: c.playstation ? 'PLAYSTATION' : 'XBOX',
        cta: `Alle ${game} Cheats »`, domain,
      },
    });
  }

  const wallCount = parseInt(process.env.PIN_WALLPAPERS ?? '8', 10);
  for (let seed = 1; seed <= wallCount; seed++) {
    const id = `wallpaper-${seed}`;
    const name = wallpaperName(seed);
    pins.push({
      id, type: 'wallpaper', board: 'wallpaper',
      title: truncate(`Handy-Wallpaper "${name}": Neon-Sonnenuntergang mit Palmen im 80er-Look`, 100),
      description: description(`Kostenloses Handy-Hintergrundbild im Synthwave-Stil: Sonnenuntergang, Palmen und eine Neon-Skyline, ganz ohne Logos. Perfekt für die Wartezeit auf GTA 6. Mehr GTA-Stoff gibt es auf ${BRAND}.`, ['wallpaper', 'synthwave', 'gta6']),
      link: linkFor('/spiele/gta-6/', 'wallpaper', id),
      altText: truncate(`Abstraktes Hochformat-Wallpaper "${name}": große gestreifte Sonne über einer Neon-Skyline, Palmen-Silhouetten und ${seed % 2 === 0 ? 'Meer mit Spiegelung' : 'leuchtendes Gitter'} in Pink, Orange und Lila.`, 500),
      sortKey: [seed],
      design: { type: 'wallpaper', seed, domain },
    });
  }

  for (const p of pins) {
    p.imagePath = `automation/pinterest/out/${p.id}.png`;
    for (const k of ['title', 'description', 'altText']) {
      if (hasLongDash(p[k])) p[k] = noLongDashes(p[k]);
    }
  }
  return pins;
}

// Reihenfolge: frische News zuerst, danach abwechselnd Guide, Cheat, Tipps, Wallpaper (Cheats nach Spiel gemischt)
const PATTERN = ['guide', 'cheat', 'tips', 'cheat', 'wallpaper', 'cheat', 'guide', 'cheat', 'tips', 'cheat'];

function cmpKey(a, b) {
  for (let i = 0; i < Math.max(a.sortKey.length, b.sortKey.length); i++) {
    if (a.sortKey[i] < b.sortKey[i]) return -1;
    if (a.sortKey[i] > b.sortKey[i]) return 1;
  }
  return 0;
}

export function orderPins(pins) {
  const buckets = {};
  for (const p of pins) (buckets[p.type] ??= []).push(p);
  for (const list of Object.values(buckets)) list.sort(cmpKey);
  // Cheats reihum nach Spiel
  if (buckets.cheat) {
    const byGame = {};
    for (const c of buckets.cheat) (byGame[c.game] ??= []).push(c);
    const games = Object.keys(byGame).sort();
    const mixed = [];
    for (let i = 0; mixed.length < buckets.cheat.length; i++) for (const g of games) if (byGame[g][i]) mixed.push(byGame[g][i]);
    buckets.cheat = mixed;
  }
  const ordered = [...(buckets.news ?? [])];
  const rest = ['guide', 'cheat', 'tips', 'wallpaper'].reduce((n, t) => n + (buckets[t]?.length ?? 0), 0);
  for (let i = 0; ordered.length < (buckets.news?.length ?? 0) + rest; i++) {
    const t = PATTERN[i % PATTERN.length];
    let pick = buckets[t]?.shift();
    if (!pick) for (const alt of ['cheat', 'guide', 'tips', 'wallpaper']) if ((pick = buckets[alt]?.shift())) break;
    if (pick) ordered.push(pick);
  }
  return ordered;
}

export function loadPosted() {
  return readJson(POSTED_FILE, { entries: [] });
}

export function savePosted(posted) {
  writeJson(POSTED_FILE, posted);
}

export function buildQueue(pins, posted, existing, nowIso) {
  const done = new Set(posted.entries.map((e) => e.id));
  const created = new Map((existing ?? []).map((q) => [q.id, q.createdAt]));
  return orderPins(pins.filter((p) => !done.has(p.id))).map(({ sortKey, game, ...p }) => ({ ...p, createdAt: created.get(p.id) ?? nowIso }));
}

// Naechste Pins auswaehlen: Tageslimit und max. 3 pro Ziel-URL und Tag einhalten
export function selectPins(queue, posted, { count, day, dayLimit }) {
  const sameDay = posted.entries.filter((e) => e.day === day);
  const perUrl = new Map();
  for (const e of sameDay) perUrl.set(e.baseUrl, (perUrl.get(e.baseUrl) ?? 0) + 1);
  const room = Math.max(0, Math.min(dayLimit, HARD_DAY_LIMIT) - sameDay.length);
  const picked = [];
  for (const p of queue) {
    if (picked.length >= Math.min(count, room)) break;
    const b = baseUrl(p.link);
    if ((perUrl.get(b) ?? 0) >= MAX_PER_URL_PER_DAY) continue;
    perUrl.set(b, (perUrl.get(b) ?? 0) + 1);
    picked.push(p);
  }
  return picked;
}

export function validatePin(p) {
  const problems = [];
  if (p.title.length > 100) problems.push('Titel > 100 Zeichen');
  if (p.description.length > 500) problems.push('Beschreibung > 500 Zeichen');
  if (p.altText.length > 500) problems.push('Alt-Text > 500 Zeichen');
  if (hasLongDash(p.title + p.description + p.altText)) problems.push('langer Strich');
  const tags = (p.description.match(/#\w+/g) ?? []).length;
  if (tags < 2 || tags > 4) problems.push(`${tags} Hashtags`);
  return problems;
}
