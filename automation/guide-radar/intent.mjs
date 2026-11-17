// Guide-Absicht erkennen: Ist eine Meldung eine Entdeckung oder Anleitung (Geld, Fundort, Glitch, Easter Egg, Tipp)
// oder nur eine News (Trailer, Verkaufszahlen, Termine)? Reine Text-Regeln, deutsch und englisch, ohne KI.
import { deUmlaut } from '../lib/util.mjs';

export const CATEGORIES = ['geld', 'fundorte', 'glitches', 'tipps', 'easter-eggs', 'wissen'];

const norm = (s) => deUmlaut(String(s ?? '')).toLowerCase().replace(/[’`´]/g, "'");

// [Gewicht, Muster, Kategorie-Hinweis]. Jede Regel zaehlt pro Text hoechstens einmal.
export const INTENT_RULES = [
  [3, /\bhow to (get|find|unlock|make|earn|start|beat|complete|do|access|buy|use|farm|win|survive|level|rank|fix|solve|open|enter|reach|catch|collect)\b/, 'tipps'],
  [3, /\bwhere (to find|to get|to buy|is the|are the|can (i|you) (find|get|buy))\b|\bwhere'?s the\b/, 'fundorte'],
  [3, /\blocations?\b|\bfundort(e|en)?\b|\bfundstellen?\b|\bwo (du|ihr|man) .{0,40}(findest|findet|bekommst|bekommt)\b/, 'fundorte'],
  [3, /\bso (bekommst|findest|schaltest|kriegst|verdienst|holst|knackst|loest|startest|meisterst|farmst) (du|ihr)\b|\bso (geht|klappt|funktioniert)('?s|s)?\b/, 'tipps'],
  [3, /\bguides?\b|\bwalkthrough\b|\bkomplett-?loesung\b|\banleitung\b|\btutorial\b/, 'tipps'],
  [3, /\bcollectibles?\b|\bsammel(objekte?|gegenstaende?|items?|karten|kram)\b/, 'fundorte'],
  [3, /\beaster ?eggs?\b|\banspielungen?\b|\bhidden references?\b/, 'easter-eggs'],
  [3, /\bglitch(es|ed)?\b|\bexploits?\b/, 'glitches'],
  [3, /\bmoney (method|making|guide|glitch|grind|farm|loop)s?\b|\bmake (money|cash|millions)\b|\bgeld (verdienen|machen|farmen)\b|\bschnell(es)? geld\b|\bgeldquelle\b/, 'geld'],
  [3, /\b(fastest|best|easiest|quickest) (way|method)s?\b|\bam schnellsten\b|\bbeste (methode|art|weg)\b/, 'tipps'],
  [3, /\bunlock(s|ed|ing)?\b|\bfreischalt(en|ung)\b|\bfreigeschaltet\b/, 'tipps'],
  [3, /\btroph(y|ies)\b|\btrophaee(n)?\b|\bachievements?\b|\berfolge\b|\bplatin\b|\bplatinum\b|\b100 ?(%|prozent|percent)\b/, 'tipps'],
  [3, /\bsecrets?\b|\bgeheim(e|er|es|en|nis|nisse|tipps?)?\b|\bhidden\b|\bversteckt(e|er|es|en)?\b/, 'easter-eggs'],
  [3, /\btips\b|\btipps\b|\btricks?\b|\bkniffe?\b/, 'tipps'],
  [3, /\bbeginners?\b|\banfaenger\b|\beinsteiger\b|\bthings? (i wish|to know|you should)\b|\bdinge,? die (du|ihr)\b/, 'tipps'],
  [2, /\bmoney\b|\bgeld\b|\bcash\b|\$ ?\d|\bmillions?\b|\bmillionen\b|\bpassive income\b|\bpassives einkommen\b/, 'geld'],
  [2, /\bheists?\b|\bcoups?\b|\bueberfall\b|\braubzug\b|\bmissions?\b|\bmissionen\b|\bside (mission|activit)|\bnebenmissionen?\b|\brandom events?\b|\bzufallsereignis(se)?\b|\bstrangers?\b/, 'tipps'],
  [2, /\bbest (cars?|vehicles?|weapons?|guns?|propert(y|ies)|business(es)?|outfits?|planes?|bikes?|boats?)\b|\bbeste[n]? (autos?|fahrzeuge?|waffen?|immobilien?)\b|\bfastest (cars?|vehicles?|planes?|bikes?|supercars?)\b|\bschnellste[ns]? (auto|fahrzeug|wagen)\b/, 'tipps'],
  [2, /\bmyst(ery|eries)\b|\bmyth(s|os|en)?\b|\bufos?\b|\bghosts?\b|\bgeist(er)?\b|\bbigfoot\b|\breferences?\b/, 'easter-eggs'],
  [2, /\bfound\b|\bdiscovered\b|\bspotted\b|\bentdeckt\b|\bgefunden\b|\baufgetaucht\b/, null],
  [2, /\bspawn(s|ing|ed)?\b|\brare\b|\bselten(e|er|es|en)?\b|\bmissable\b|\bverpassbar\b|\bdon'?t miss\b|\bnicht verpassen\b/, 'fundorte'],
  [2, /\bupgrades?\b|\bskills?\b|\bstats?\b|\blevel(n|ing)? up\b|\branks?\b|\brp\b|\bxp\b|\bgrind(ing)?\b|\bfarm(ing|en)?\b|\bafk\b/, 'tipps'],
  [1, /\byou can\b|\bdu kannst\b|\bkannst du\b|\bthis is how\b|\bpro tip\b|\bprotipp\b/, null],
];

// Reine News: gehoeren zum News-Bot, nicht ins Guide-Radar. Jeder Treffer im Titel kostet 2 Punkte.
export const NEWS_RULES = [
  /\btrailers?\b/,
  /\bscreenshots?\b|\bnew screens\b/,
  /\bsales\b|\bsold\b|\bverkauf(t|szahlen|e)\b|\bumsatz\b|\brevenue\b|\bearnings\b|\banalysts?\b|\bbillion\b|\bmilliarden?\b/,
  /\bpre-?orders?\b|\bvorbestell/,
  /\bpre-?load(ing|ed)?\b|\bvorlad|\bvorab herunter/,
  /\brelease (date|time|times|uhrzeit|zeit)\b|\berscheinungstermin\b|\bstartzeit\b|\bunlock times?\b|\bwhen can you (start )?play/,
  /\bdelay(ed|s)?\b|\bverschoben\b|\bverschiebung\b|\bpostponed\b/,
  /\bprices?\b|\bpreis(e)?\b|\bkostet\b|\b\d+ ?(euro|eur|€|dollar)\b|\bdeals?\b|\brabatt/,
  /\breviews?\b|\bwertung\b|\bmetacritic\b|\bim test\b|\btestbericht\b/,
  /\binterview\b|\bstudio head\b|\bdevelopers? (say|said|explain)/,
  /\blayoffs?\b|\bentlassung/,
  /\blawsuit\b|\bcourt\b|\bgericht\b|\bhacker\b|\bguilty\b|\bschuldig\b|\bleak(s|ed|er)?\b|\bgeleakt\b|\brumou?rs?\b|\bgeruecht/,
  /\bstock\b|\baktie\b|\bquartal\b|\binvestors?\b/,
  /\bsubway\b|\bkfc\b|\bsandwich\b|\bweather channel\b|\bcollab(oration)?\b|\bpartnership\b|\bmerch\b|\bcontroller\b/,
  /\btwitch\b|\blivestream\b|\bstream(er|ing|s)?\b/,
  /\bthis week\b|\bdiese woche\b|\bweekly\b|\bwochen(update|bonus)\b|\bdouble (money|rp|cash)\b|\btriple\b|\b[234]x\b|\bboni\b|\bbonus(es)?\b|\bpodium\b|\bprize ride\b/,
  /\bservers? (are |is |sind )?down\b|\boutage\b|\bserverprobleme\b|\bstoerung\b/,
  /\busk\b|\bpegi\b|\besrb\b|\bage rating\b|\balterseinstufung\b|\bjugendschutz\b/,
  /\b\d+ ?gb\b|\bspeicherplatz\b|\bdownload size\b|\bdateigroesse\b|\bbox-?code\b|\bdigital code\b|\bdisc\b|\bphysical\b|\bphysisch/,
  /\bsubscription\b|\babo\b|\bgame pass\b|\bps plus\b/,
  /\bpatch notes?\b|\btitle update\b/,
];

// Kaufberatung, Rabatte, Gewinnspiele: nie ein Guide
export const DEAL_RE = /\b(deals?|discount(ed|s)?|angebote?|rabatt|schn(ae|ä)ppchen|sale|cheapest|lowest price|best price|bestpreis|preisvergleich|coupon|gutschein|giveaway|given away|gewinnspiel|verlosung|free copy|free copies|sponsored|anzeige)\b/;

export const INTENT_MIN = 3; // so viel Guide-Signal muss mindestens da sein
export const NET_MIN = 3; // nach Abzug der News-Treffer

function matchRules(text) {
  const t = norm(text);
  const hits = [];
  for (const [weight, re, cat] of INTENT_RULES) {
    const m = t.match(re);
    if (m) hits.push({ weight, word: m[0].trim(), cat });
  }
  return hits;
}

// Guide-Absicht einer Meldung (Titel zaehlt voll, Text nur halb und gedeckelt).
export function guideIntent(item) {
  const titleHits = matchRules(item.title);
  const titleWords = new Set(titleHits.map((h) => h.word));
  const textHits = matchRules(String(item.text || item.snippet || '').slice(0, 800)).filter((h) => !titleWords.has(h.word));
  const titleScore = titleHits.reduce((s, h) => s + h.weight, 0);
  const textScore = Math.min(3, textHits.reduce((s, h) => s + h.weight, 0) * 0.5);
  const tn = norm(item.title);
  const news = NEWS_RULES.map((re) => tn.match(re)?.[0]).filter(Boolean);
  // Reddit-Fragen ("Wo finde ich ...?") zeigen Nachfrage, aber noch keine Antwort
  const question = item.type === 'reddit' && /\?\s*$/.test(String(item.title).trim());
  let raw = titleScore + textScore;
  if (question) raw *= 0.5;
  const penalty = 2 * Math.min(3, news.length);
  const best = [...titleHits, ...textHits].filter((h) => h.cat).sort((a, b) => b.weight - a.weight)[0];
  return {
    raw: Math.round(raw * 10) / 10,
    score: Math.round((raw - penalty) * 10) / 10,
    hits: [...titleHits, ...textHits].map((h) => h.word),
    news,
    question,
    deal: DEAL_RE.test(tn),
    category: best?.cat ?? null,
  };
}

export function isGuideCandidate(intent) {
  return !intent.deal && intent.raw >= INTENT_MIN && intent.score >= NET_MIN;
}

// Grobe Spiel-Erkennung (die genaue Zuordnung macht spaeter Claude Haiku)
export function detectGame(text, fallback = null) {
  const t = norm(text);
  if (/\bgta ?(vi|6)\b|grand theft auto (vi|6)\b|\bleonida\b|\blucia caminos\b|\bjason duval\b/.test(t)) return 'gta-6';
  if (/\bgta ?(5 |v )?online\b|\bgtao\b/.test(t)) return 'gta-online';
  if (/\bgta ?(v|5)\b|grand theft auto (v|5)\b|\blos santos\b/.test(t)) return 'gta-5';
  if (/\bsan andreas\b|\bgta ?sa\b/.test(t)) return 'gta-san-andreas';
  if (/\bgta ?vice city\b|\bvice city stories\b/.test(t)) return 'gta-vice-city';
  if (/\bgta ?(iv|4)\b|\bliberty city stories\b/.test(t)) return 'gta-4';
  if (/\bgta ?(iii|3)\b/.test(t)) return 'gta-3';
  return fallback;
}

// Kategorie aus den Treffern mehrerer Meldungen (haeufigster Hinweis gewinnt, Gewicht zaehlt mit)
export function guessCategory(intents) {
  const votes = new Map();
  for (const i of intents) if (i.category) votes.set(i.category, (votes.get(i.category) ?? 0) + Math.max(1, i.raw));
  let best = 'tipps';
  let max = 0;
  for (const [c, v] of votes) if (v > max) { max = v; best = c; }
  return best;
}
