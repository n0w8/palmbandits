// Filtern (GTA-Bezug, Alter), Story-Cluster bilden und Ampel-Farbe bestimmen.
import { deUmlaut, sha1 } from '../lib/util.mjs';

// ---------- Relevanz ----------
const GTA_RE = /\bgta\b|\bgta ?(vi|6|v|5|iv|4|online|iii|3)\b|grand theft auto|\bleonida\b|lucia caminos|jason duval|\bfivem\b|\bvice city\b|\bliberty city\b|\blos santos\b|\bsan andreas\b/i;
const ROCKSTAR_RE = /\brockstar( games| north| newswire)?\b|\btake-?two\b/i;
// Kaufberatung, Deals, Quiz und Co. sind keine News
const NOISE_RE = /\b(deals?|angebote?|schn(ae|ä)ppchen|rabatt|preisvergleich|g(ue|ü)nstig(er)? (kaufen|vorbestellen)|cheapest|best price|lowest price|coupon|gutschein|quiz|podcast|wordle|giveaway|gewinnspiel|sponsored|anzeige)\b/i;

export function isRelevant(item) {
  const t = item.title;
  const s = item.snippet ?? '';
  if (NOISE_RE.test(t)) return { ok: false, why: 'Deal/Quiz/Werbung' };
  if (GTA_RE.test(t)) return { ok: true };
  if (GTA_RE.test(s) && (item.focus === 'gta' || ROCKSTAR_RE.test(t))) return { ok: true };
  return { ok: false, why: 'kein GTA-Bezug' };
}

export function isFresh(item, now, maxAgeHours) {
  if (!item.published) return false;
  const age = (now - new Date(item.published).getTime()) / 3_600_000;
  return age <= maxAgeHours && age > -2; // leichte Zukunfts-Toleranz fuer schiefe Zeitzonen
}

// ---------- Tokens und Aehnlichkeit ----------
const STOP = new Set(`
a an the and or of to in on at for from by with without into over after before about as is are was were be been being
this that these those it its it's you your yours we our they their he she his her them i me my not no yes so if than then
just now today here there how what why when where who which will would can could should may might must has have had do does did
new latest first more most all any some every also out up down off via vs per get gets got make makes made
says said report reports reported reportedly according officially official confirms confirmed confirm reveals revealed announces announced
der die das den dem des ein eine einer eines einem einen und oder aber mit ohne von vom zu zum zur im in am an auf aus bei fuer
ist sind war waren wird werden wurde wurden hat haben hatte hatten sein seine ihre ihr ihm ihn es sie er wir du dich dir dein deine
nicht kein keine noch schon jetzt heute hier dort wie was warum wann wo wer welche welcher welches auch nur mehr alle alles
neue neuen neuer neues erste ersten offiziell bestaetigt laut gibt kommt kommen startet zeigt verraet so sich man mal doch
da fast beim aus ab bis um wieder nun eben sehr viel viele vielen ganz bereits nach vor ueber unter gegen durch damit dann denn
weil wenn als ihr euch ihnen uns unser koennt kann koennen muss muessen musst soll sollen will wollen darf diese dieser dieses
need needs play plays playing played spielen spielt gespielt zocken best beste besten top big huge massive crucial finally endlich
still already everything thing things way know want look looks looking see go going give gives take takes come comes coming
day days week weeks year years ahead just really actually one two three ein zwei drei mega riesig alle wirklich wissen musst
gta game games spiel spiele news update updates video player players spieler fans fan rockstar rockstargames take two taketwo
grand theft auto
`.split(/\s+/).filter(Boolean));

// Grobe Uebersetzung DE -> EN, damit deutsche und englische Titel zusammenfinden
const SYN = {
  veroeffentlichung: 'release', erscheint: 'release', erscheinen: 'release', release: 'release', launch: 'release', launches: 'release', launched: 'release', releasedate: 'release', releases: 'release', erscheinungstermin: 'release', start: 'release', marktstart: 'release',
  verschoben: 'delay', verschiebung: 'delay', delayed: 'delay', delays: 'delay', delay: 'delay', postponed: 'delay',
  vorladen: 'preload', preloading: 'preload', preload: 'preload', vorab: 'preload',
  preis: 'price', preise: 'price', kostet: 'price', pricing: 'price', price: 'price',
  karte: 'map', map: 'map', welt: 'map',
  absturz: 'crash', abstuerze: 'crash', crashes: 'crash', crash: 'crash',
  fehler: 'bug', bugs: 'bug', bug: 'bug', glitch: 'bug', glitches: 'bug',
  server: 'server', servers: 'server', serverprobleme: 'server', outage: 'server', down: 'server',
  geruecht: 'rumor', geruechte: 'rumor', rumour: 'rumor', rumor: 'rumor', rumors: 'rumor', leak: 'leak', leaks: 'leak', leaked: 'leak', geleakt: 'leak',
  verkaufszahlen: 'sales', verkauft: 'sales', sales: 'sales', sold: 'sales', verkaeufe: 'sales',
  wertung: 'review', test: 'review', review: 'review', reviews: 'review', tests: 'review',
  trailer: 'trailer', trailers: 'trailer',
  soundtrack: 'soundtrack', musik: 'soundtrack', album: 'soundtrack', songs: 'soundtrack',
  uhrzeit: 'time', time: 'time', zeit: 'time', freischaltung: 'unlock', unlock: 'unlock',
  speicherplatz: 'size', groesse: 'size', gb: 'size', filesize: 'size', size: 'size',
  pc: 'pc', ps5: 'ps5', playstation: 'ps5', xbox: 'xbox', series: 'xbox',
  wochenupdate: 'weekly', weekly: 'weekly', bonus: 'bonus', boni: 'bonus', bonuses: 'bonus', rewards: 'bonus', belohnungen: 'bonus',
  patch: 'patch', patches: 'patch', hotfix: 'patch', titelupdate: 'patch',
  code: 'code', codes: 'code', box: 'box', huelle: 'box', huellen: 'box', case: 'box', packung: 'box',
  fehlende: 'missing', fehlt: 'missing', fehlen: 'missing', missing: 'missing', ohne: 'missing', leer: 'missing', empty: 'missing',
  vorbesteller: 'preorder', vorbestellung: 'preorder', vorbestellungen: 'preorder', preorder: 'preorder', preorders: 'preorder', vorbestellt: 'preorder',
  physisch: 'physical', physische: 'physical', physischen: 'physical', physical: 'physical', disc: 'physical', retail: 'physical',
  hacker: 'hacker', hack: 'hacker', schuldig: 'guilty', guilty: 'guilty', gericht: 'court', court: 'court',
  zeichentrick: 'cartoon', animationsserie: 'cartoon', cartoon: 'cartoon', serie: 'series', tracklist: 'soundtrack', radio: 'soundtrack',
  wetter: 'weather', weather: 'weather', urlaub: 'vacation', urlaubsantraege: 'vacation', frei: 'vacation', krankmelden: 'vacation', pto: 'vacation',
  laenge: 'length', spielzeit: 'length', length: 'length', stunden: 'hours', hours: 'hours',
};

export function tokenize(title) {
  let s = deUmlaut(title).toLowerCase();
  s = s.replace(/grand theft auto/g, 'gta')
    .replace(/\bgta[\s-]*(vi|6)\b/g, ' gta6 ')
    .replace(/\bgta[\s-]*(v|5)\b/g, ' gta5 ')
    .replace(/\bgta[\s-]*online\b/g, ' gtaonline ')
    .replace(/\bvice[\s-]*city\b/g, ' vicecity ')
    .replace(/\blos[\s-]*santos\b/g, ' lossantos ')
    .replace(/\bpre-?load(ing)?\b/g, ' preload ')
    .replace(/\bpre-?orders?\b/g, ' preorder ')
    .replace(/(\w)-(\w)/g, '$1$2')
    .replace(/[^a-z0-9$€ ]+/g, ' ');
  const out = new Set();
  for (let w of s.split(/\s+/)) {
    if (!w || STOP.has(w)) continue;
    if (w.length < 2 && !/\d/.test(w)) continue;
    if (/^[a-z]{5,}s$/.test(w) && !SYN[w]) w = w.slice(0, -1); // einfache Plural-Kappung
    w = SYN[w] ?? w;
    if (STOP.has(w)) continue;
    out.add(w);
  }
  return [...out];
}

const GENERIC = new Set(['gta6', 'gta5', 'gtaonline', 'ps5', 'xbox', 'pc', 'release', 'vicecity', 'leonida', 'lossantos', 'gta', 'take', 'two']);

// Gedaempfte IDF: seltene Woerter zaehlen mehr, aber nicht so extrem, dass gemeinsame Woerter untergehen
export function buildIdf(tokenLists) {
  const df = new Map();
  for (const toks of tokenLists) for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = tokenLists.length || 1;
  return (t) => {
    const base = Math.sqrt(Math.log((n + 1) / ((df.get(t) ?? 0) + 1)) + 1);
    return GENERIC.has(t) ? 0.3 : base;
  };
}

// Gewichteter Overlap-Koeffizient: Anteil gemeinsamer (gewichteter) Woerter am kuerzeren Titel.
// Es muessen mindestens 2 "starke" (nicht allgemeine) Woerter uebereinstimmen.
export function similarity(a, b, w) {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  let inter = 0;
  let strongShared = 0;
  for (const t of a) if (sb.has(t)) { inter += w(t); if (!GENERIC.has(t)) strongShared++; }
  if (strongShared < 2) return 0;
  const sa = a.reduce((s, t) => s + w(t), 0);
  const sbw = b.reduce((s, t) => s + w(t), 0);
  return inter / Math.min(sa, sbw);
}

export const SIM_THRESHOLD = 0.5;

// Neue Meldungen bestehenden Storys zuordnen oder neue Storys bilden.
export function clusterIntoStories(newItems, stories, idfCorpus, now) {
  const w = buildIdf(idfCorpus);
  const recent = stories.filter((s) => now - new Date(s.lastSeen).getTime() < 48 * 3_600_000);
  const created = [];
  const attached = [];
  const sorted = [...newItems].sort((x, y) => (x.published ?? '').localeCompare(y.published ?? ''));
  for (const item of sorted) {
    const toks = tokenize(item.title);
    let best = null;
    let bestSim = 0;
    for (const s of [...recent, ...created]) {
      for (const member of s.items) {
        const sim = similarity(toks, member.tokens ?? tokenize(member.title), w);
        if (sim > bestSim) { bestSim = sim; best = s; }
      }
    }
    const slim = { ...item, tokens: toks };
    if (best && bestSim >= SIM_THRESHOLD) {
      if (best.items.length < 15) best.items.push(slim);
      best.lastSeen = new Date(now).toISOString();
      if (!created.includes(best)) attached.push({ story: best, item: slim, sim: bestSim });
    } else {
      created.push({
        id: sha1(item.id + item.title, 12),
        title: item.title,
        items: [slim],
        firstSeen: new Date(now).toISOString(),
        lastSeen: new Date(now).toISOString(),
        status: 'pending',
      });
    }
  }
  // Zweiter Durchgang: Storys zusammenlegen, die sich sehr aehnlich sind (Reihenfolge-Effekte ausgleichen)
  const MERGE_AT = SIM_THRESHOLD + 0.1;
  const maxSim = (s1, s2) => {
    let m = 0;
    for (const a of s1.items) for (const b of s2.items) m = Math.max(m, similarity(a.tokens ?? tokenize(a.title), b.tokens ?? tokenize(b.title), w));
    return m;
  };
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < created.length; i++) {
      for (const target of [...recent, ...created.slice(0, i)]) {
        if (maxSim(created[i], target) >= MERGE_AT) {
          for (const it of created[i].items) {
            if (target.items.length < 15) target.items.push(it);
            if (!created.includes(target)) attached.push({ story: target, item: it, sim: MERGE_AT });
          }
          target.lastSeen = new Date(now).toISOString();
          created.splice(i, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return { created, attached };
}

// Haiku-Gruppen (gleiche Neuigkeit) zusammenlegen: kleinere Storys wandern in die groesste
export function mergeStories(stories, groups) {
  const byId = new Map(stories.map((s) => [s.id, s]));
  const removed = new Set();
  for (const ids of groups) {
    const members = ids.map((id) => byId.get(id)).filter((s) => s && !removed.has(s.id));
    if (members.length < 2) continue;
    members.sort((a, b) => b.items.length - a.items.length);
    const [main, ...rest] = members;
    for (const s of rest) {
      for (const it of s.items) if (main.items.length < 15 && !main.items.some((x) => x.id === it.id)) main.items.push(it);
      if (s.firstSeen < main.firstSeen) main.firstSeen = s.firstSeen;
      removed.add(s.id);
    }
  }
  return stories.filter((s) => !removed.has(s.id));
}

// ---------- Ampel ----------
const RUMOR_WORDS = /\b(leak|leaks|leaked|geleakt|rumou?r|rumou?rs|geruecht|geruechte|gerücht|gerüchte|insider|reportedly|angeblich|soll(en)? (laut|angeblich)|unbestaetigt|unbestätigt|datamine|datamined|spekulation|speculation)\b/i;

export function outletKey(domain) {
  return (domain || '').split('.')[0];
}

export function ampel(story) {
  const items = story.items;
  const official = items.filter((i) => i.tier === 'official');
  const nonRumor = items.filter((i) => i.tier !== 'rumor');
  const aOutlets = new Set(items.filter((i) => i.tier === 'A').map((i) => outletKey(i.domain)));
  const bOutlets = new Set(items.filter((i) => i.tier === 'B').map((i) => outletKey(i.domain)));
  const rumorShare = items.filter((i) => RUMOR_WORDS.test(i.title)).length / items.length;
  const rumorSignal = rumorShare >= 0.5;
  const outlets = new Set(nonRumor.map((i) => outletKey(i.domain)));

  if (official.length) {
    return { color: 'green', reason: `offizielle Quelle (${[...new Set(official.map((i) => i.outlet))].join(', ')})`, rumorSignal, outlets: outlets.size };
  }
  if (nonRumor.length === 0) {
    return { color: 'red', reason: 'nur Geruechte-Quellen (Reddit, Leaker, Insider)', rumorSignal: true, outlets: 0 };
  }
  if (aOutlets.size >= 2 && !rumorSignal) {
    return { color: 'green', reason: `${aOutlets.size} unabhaengige A-Medien (${[...aOutlets].join(', ')})`, rumorSignal, outlets: outlets.size };
  }
  if (aOutlets.size >= 2 && rumorSignal) {
    return { color: 'yellow', reason: `Leak/Geruecht, obwohl ${aOutlets.size} A-Medien berichten`, rumorSignal, outlets: outlets.size };
  }
  const which = aOutlets.size ? `1 A-Medium (${[...aOutlets][0]})` : `nur B-Medien (${[...bOutlets].join(', ')})`;
  return { color: 'yellow', reason: `${which}, zweite starke Quelle fehlt`, rumorSignal, outlets: outlets.size };
}

// Reihenfolge: offizielle zuerst, dann viele Quellen, dann neueste
export function priority(story, verdict) {
  const newest = Math.max(...story.items.map((i) => new Date(i.published ?? story.firstSeen).getTime()));
  const officialBonus = story.items.some((i) => i.tier === 'official') ? 1e13 : 0;
  return officialBonus + verdict.outlets * 1e11 + newest / 1000;
}
