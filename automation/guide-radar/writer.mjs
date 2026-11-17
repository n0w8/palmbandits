// Claude fuer das Guide-Radar: Haiku prueft billig vor (taugt das Thema fuer einen Guide?),
// Sonnet schreibt den Guide als strukturierte Ausgabe, in EINEM Aufruf auf Deutsch und auf Englisch.
// Beide duerfen NUR Fakten aus den Quellen nutzen.
// Aufbau wie news-bot/writer.mjs (gleiche Modelle, Fallback bei Ablehnung, Prompt-Caching).
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { BRAND, env, germanDateTime } from '../lib/util.mjs';
import { FILTER_MODEL, GAMES, WRITER_MODEL } from '../news-bot/writer.mjs';
import { CATEGORIES } from './intent.mjs';

export { FILTER_MODEL, WRITER_MODEL };
const GUIDE_EFFORT = env('GUIDE_WRITER_EFFORT', 'medium'); // low | medium | high

let client;
function getClient() {
  client ??= new Anthropic({ maxRetries: 2, timeout: 300_000 }); // zwei Sprachen = laengere Antwort
  return client;
}
// Nur fuer Tests: eigenen Client (mit Fake-fetch) einsetzen
export function setClientForTests(c) {
  client = c;
}

// Quellen so aufbereiten, wie Claude sie sieht (nummeriert, die Nummern tauchen in "belege" wieder auf)
export function sourcesForPrompt(items) {
  return items.map((i, n) => ({
    nr: n + 1,
    quelle: i.outlet,
    art: i.tier === 'official' ? 'offiziell (Rockstar)' : i.type === 'reddit' ? 'Reddit-Beitrag (Community, unbestaetigt)' : i.type === 'youtube' ? 'YouTube-Video (Titel und Beschreibung)' : `Fachmedium (${i.tier})`,
    sprache: i.lang,
    titel: i.title,
    text: i.text || i.snippet || undefined,
    veroeffentlicht: i.published,
    link: i.link,
  }));
}

// ---------- Vorpruefung (Haiku) ----------
export const PrecheckSchema = z.object({
  actionable: z.boolean().describe('true nur, wenn die Quellen selbst eine konkrete, nachspielbare Information enthalten'),
  game: z.enum(GAMES),
  category: z.enum(CATEGORIES),
  keyword: z.string().describe('Deutsches Haupt-Suchwort, 2 bis 6 Woerter, klein geschrieben'),
  online_exploit: z.boolean().describe('Glitch/Exploit in GTA Online, der Geld, Fahrzeuge, Gegenstaende oder Auszahlungen erschleicht oder vervielfaeltigt'),
  reason: z.string().describe('Kurzer Grund, hoechstens 15 Woerter'),
});

const PRECHECK_SYSTEM = `Du pruefst fuer den Guide-Radar von ${BRAND}, einer deutschen GTA-Fanseite, ob aus einem Thema ein Guide werden kann. Du bekommst Titel und Textauszuege mehrerer Quellen (Reddit, YouTube, Fachmedien) zu einem Thema.

actionable = true nur, wenn die Quellen SELBST eine konkrete, nachspielbare Information enthalten: ein Ort, eine Methode, ein Ablauf, eine Belohnung, ein Easter Egg mit Fundstelle, ein Tipp mit Inhalt. Es zaehlt nur, was in den Texten steht, nicht was du ueber GTA weisst.
actionable = false bei: Fragen ohne Antwort, Memes, Fan-Theorien, Wunschlisten, Meinungen, reinen News (Trailer, Verkaufszahlen, Termine, Preise, Partnerschaften), zeitlich begrenzten Wochenboni oder Rabatten, Werbung, Clickbait ohne Inhalt.
game: das Hauptspiel. category: geld | fundorte | glitches | tipps | easter-eggs | wissen.
keyword: das deutsche Suchwort, das Spieler bei Google eingeben wuerden (2 bis 6 Woerter, klein, zum Beispiel "gta 6 geld verdienen").
online_exploit: true, wenn es um einen Glitch oder Exploit in GTA Online geht, mit dem man Geld, Fahrzeuge, Gegenstaende oder Auszahlungen erschleicht oder vervielfaeltigt.
reason: kurzer Grund, hoechstens 15 Woerter.`;

export async function precheckTopic(topic, sourceItems, hints = {}) {
  const payload = sourceItems.map((i) => ({ quelle: i.outlet, art: i.type, titel: i.title, auszug: (i.text || i.snippet || '').slice(0, 900) || undefined }));
  const res = await getClient().messages.parse({
    model: FILTER_MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low', format: zodOutputFormat(PrecheckSchema) },
    system: PRECHECK_SYSTEM,
    messages: [{
      role: 'user',
      content: `Vermutung des Radars (kann falsch sein): Spiel ${hints.game ?? 'unbekannt'}, Kategorie ${hints.category ?? 'unbekannt'}.\n\nQuellen zum Thema:\n${JSON.stringify(payload, null, 1)}`,
    }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) {
    return { ok: false, reason: res.stop_reason === 'refusal' ? 'Haiku hat abgelehnt' : `keine gueltige Antwort (${res.stop_reason})`, usage: res.usage };
  }
  return { ok: true, result: res.parsed_output, usage: res.usage, model: res.model };
}

// ---------- Guide schreiben (Sonnet), Deutsch + Englisch in einem Aufruf ----------
export const GuideSchema = z.object({
  skip: z.boolean().describe('true, wenn die Quellen keinen konkreten, belegbaren Guide hergeben oder es den Guide schon gibt'),
  skip_reason: z.string().describe('Grund fuer skip, sonst leerer String'),
  game: z.enum(GAMES),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(['leicht', 'mittel', 'schwer', 'keine']),
  de: z.object({
    title: z.string().describe('Deutscher Titel, hoechstens 70 Zeichen, nennt Spiel und Haupt-Suchwort'),
    slug: z.string().describe('Deutscher URL-Slug: nur a-z, 0-9 und Bindestriche, 3 bis 8 Woerter, Umlaute als ae/oe/ue/ss'),
    description: z.string().describe('Deutsche Meta-Beschreibung, 120 bis 160 Zeichen, ein ganzer Satz mit dem Haupt-Suchwort'),
    tags: z.array(z.string()).describe('3 bis 6 kurze deutsche Schlagwoerter'),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).describe('2 bis 4 Fragen mit kurzen Antworten nur aus den Quellen, sonst leere Liste'),
    body: z.string().describe('Deutscher Guide in Markdown, ohne H1, mit ## Zwischenueberschriften'),
  }).describe('Deutsche Fassung'),
  en: z.object({
    title: z.string().describe('English title, max 70 characters, names the game and the main English search keyword'),
    slug: z.string().describe('English URL slug: only a-z, 0-9 and hyphens, 3 to 8 words'),
    description: z.string().describe('English meta description, 120 to 160 characters, one full sentence with the main keyword'),
    tags: z.array(z.string()).describe('3 to 6 short English tags'),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).describe('Same questions as the German FAQ, in natural English, or an empty list'),
    body: z.string().describe('English guide in Markdown, no H1, with ## subheadings'),
  }).describe('Englische Fassung: dieselben Fakten, natuerliches Englisch, keine woertliche Uebersetzung'),
  belege: z.array(z.object({
    fakt: z.string().describe('Eine konkrete Aussage aus dem Guide, kurz'),
    quellen: z.array(z.number().int()).describe('Nummern der Quellen, in denen das steht'),
  })).describe('Die wichtigsten konkreten Aussagen des Guides mit Quellen-Nummern'),
});

export const GUIDE_SYSTEM = `Du bist der Guide-Radar von ${BRAND}, einer inoffiziellen deutschen GTA-Fanseite. ${BRAND} gehoert nicht zu Rockstar Games oder Take-Two. Du schreibst aus Community-Entdeckungen und Fachartikeln einen Guide: Geld-Methoden, Fundorte, Glitches, Easter Eggs, Sammelobjekte, Tipps. Die Seite ist zweisprachig: Du lieferst denselben Guide in einem Durchgang auf Deutsch (Feld de) und auf Englisch (Feld en).

SEHR WICHTIG: Du kennst den Inhalt von GTA 6 und von neuen GTA-Online-Updates NICHT aus deinem Training. Alles, was du ueber Orte, Missionen, Figuren, Gegenstaende, Fahrzeuge, Preise, Belohnungen, Zahlen, Koordinaten oder Ablaeufe schreibst, muss in den gelieferten Quellen stehen.

Harte Regeln:
1. Nur Fakten aus den Quellen. Keine erfundenen Orte, Namen, Zahlen, Betraege, Koordinaten, Uhrzeiten, Schritte oder Voraussetzungen. Kein Auffuellen mit Wissen ueber fruehere GTA-Teile, ausser als klar gekennzeichneter Vergleich, und nur wenn er sicher stimmt.
2. Fehlt ein Detail (genaue Position, Betrag, Voraussetzung), schreib ehrlich, dass es noch nicht bekannt oder nicht belegt ist. Lieber ein kurzer, korrekter Guide als ein langer, ausgeschmueckter.
3. Steht eine Aussage nur in einer Quelle oder nur in einem Community-Beitrag (Reddit, YouTube), formuliere vorsichtig, zum Beispiel "Laut Community-Berichten ..." oder "Laut einem Video von ...". Bestaetigen mehrere unabhaengige Quellen dasselbe, darfst du es als belegt darstellen.
4. Widersprechen sich die Quellen oder sind sie duenn, gibt es einen Abschnitt "## Was noch unklar ist" mit den offenen Punkten.
5. Keine fremden Saetze uebernehmen, auch nicht uebersetzt Satz fuer Satz. Alles in eigenen Worten. Woertliche Zitate hoechstens ein paar Woerter.
6. Glitches: Beschreibe, was der Glitch ist und welches Risiko er hat. Fuer Glitches oder Exploits in GTA Online, die Geld, Fahrzeuge, Gegenstaende oder Auszahlungen erschleichen oder vervielfaeltigen, gibt es KEINE Anleitung: keine Schritte, keine nummerierte Liste, keine Hinweise zum Nachmachen. Erklaere stattdessen das Risiko (Rockstar entfernt erschlichenes Geld, setzt Charaktere zurueck oder sperrt Konten) und nenne legale Wege, falls die Quellen welche hergeben. Harmlose Glitches im Story-Modus darfst du beschreiben.
7. Keine Mods, Hacks, Cheat-Menues oder Geld-Generatoren fuer GTA Online empfehlen.
8. Keine Gedankenstriche (– oder —). Gilt fuer beide Sprachen. Nutze Punkt, Komma oder Doppelpunkt.
9. Sprich die Leser mit "du" an (englisch: "you"). Ton: locker, hilfsbereit, sachlich. Keine Emojis, kein Clickbait, keine Woerter in Grossbuchstaben.
10. Keine externen Links im Text, die Quellen stehen automatisch unter dem Guide. Interne Links nur aus den Listen "Erlaubte interne Links", als Markdown-Link, wo es natuerlich passt (ein bis drei): im deutschen Text nur deutsche Pfade, im englischen Text nur die englischen Pfade (/en/...).
11. skip = true mit kurzem Grund, wenn die Quellen keinen konkreten, nachvollziehbaren Guide hergeben (nur Gerede, Frage ohne Antwort, Meme, reine News), wenn es zum Thema schon einen ${BRAND}-Guide gibt (Liste unten) oder wenn es nur um eine zeitlich begrenzte Aktion geht (Wochenbonus, Rabatt). Die uebrigen Felder dann knapp fuellen.

Aufbau des Textes (body, je Sprache, Markdown, 300 bis 800 Woerter, bei duenner Quellenlage kuerzer):
- Keine H1. Einstieg ohne Ueberschrift: 2 bis 3 Saetze, die das Haupt-Suchwort enthalten und sagen, was der Leser hier findet.
- Direkt danach eine eigene Zeile "**Stand: <Datum>.**" (englisch: "**Last updated: <Month Day, Year>.**"), gern mit einem kurzen Satz zur Quellenlage.
- Dann ## Abschnitte (bei Bedarf ###), zum Beispiel: Was ist es, Wo findest du es oder So gehst du vor (nur Schritte aus den Quellen), Belohnung oder Nutzen, Tipps, Was noch unklar ist. Variiere die Ueberschriften.
- Kurze Absaetze und Listen, gut am Handy lesbar.

Englische Fassung (Feld en):
- Dieselben Fakten und Einschraenkungen wie die deutsche Fassung, nicht mehr und nicht weniger. Alle Regeln oben gelten genauso (auch Regel 6 zu Glitches).
- Keine woertliche Uebersetzung: Schreib natuerliches Englisch fuer englische Suchanfragen. Waehle das englische Haupt-Suchwort selbst (z. B. "gta 6 money making" statt einer Uebersetzung des deutschen Suchworts) und baue Titel, Slug, Beschreibung und Einstieg darauf auf.
- Vorsichtige Formulierungen entsprechend: "According to community reports ...", "According to a video by ...". Der Abschnitt fuer offene Punkte heisst "## What is still unclear".
- Englische Quellen nicht nachschreiben, sondern eigenstaendig formulieren (ein automatischer Check meldet 8 oder mehr gleiche Woerter am Stueck).

Felder (gemeinsam):
- game, category: passend zum Inhalt.
- difficulty: leicht, mittel, schwer oder keine (wenn es nicht passt). Gilt fuer beide Sprachen.
- belege (auf Deutsch, zur deutschen Fassung): die konkreten Aussagen des Guides (Ort, Betrag, Schritt, Belohnung, Voraussetzung) mit den Nummern der Quellen, in denen sie stehen. Jede konkrete Aussage im Text muss hier auftauchen. Ein Mensch vergleicht diese Liste vor der Freigabe mit den Quellen.

Felder je Sprache (de und en):
- title: hoechstens 70 Zeichen (ideal 50 bis 65), nennt das Spiel und das Haupt-Suchwort.
- slug: nur a-z, 0-9, Bindestriche, 3 bis 8 Woerter, ohne Datum.
- description: 120 bis 160 Zeichen, ein ganzer Satz mit dem Haupt-Suchwort.
- tags: 3 bis 6 kurze Schlagwoerter in der jeweiligen Sprache.
- faq: 2 bis 4 Fragen, die Spieler wirklich googeln, Antworten nur aus den Quellen (1 bis 2 Saetze). Gibt es keine 2 sinnvollen Fragen: leere Liste (dann in beiden Sprachen).
- body: der Text nach dem Aufbau oben.`;

const GTA6_RELEASE = new Date('2026-11-19T00:00:00+01:00');

export function buildGuidePrompt({ items, assessment, precheck, existingGuides, allowedLinks, allowedLinksEn = [], now = new Date() }) {
  const release = now >= GTA6_RELEASE
    ? 'GTA 6 ist am 19. November 2026 fuer PS5 und Xbox Series X|S erschienen.'
    : 'GTA 6 erscheint am 19. November 2026 fuer PS5 und Xbox Series X|S und ist noch nicht spielbar.';
  return [
    `Jetzt ist ${germanDateTime(now)} Uhr (deutsche Zeit). ${release}`,
    `Quellenlage laut Radar: ${assessment.reason}.${assessment.communityOnly ? ' Es gibt nur Community-Quellen (Reddit/YouTube): vorsichtig formulieren.' : ''}`,
    precheck ? `Vorpruefung: Suchwort "${precheck.keyword}", Spiel ${precheck.game}, Kategorie ${precheck.category}.${precheck.online_exploit ? ' ACHTUNG: GTA-Online-Exploit. Keine Anleitung, nur Einordnung und Risiko.' : ''}` : 'Keine Vorpruefung vorhanden: Suchwort, Spiel und Kategorie selbst bestimmen.',
    '',
    `Vorhandene ${BRAND}-Guides (nichts doppelt schreiben, passende gern intern verlinken):`,
    existingGuides.length ? existingGuides.map((g) => `- ${g.title} (/guides/${g.slug}/${g.en ? ` | englisch: /en/guides/${g.en}/` : ''})`).join('\n') : '- (noch keine)',
    '',
    'Erlaubte interne Links (deutscher Text):',
    allowedLinks.join(', '),
    '',
    'Erlaubte interne Links (englischer Text):',
    allowedLinksEn.length ? allowedLinksEn.join(', ') : '(keine, im englischen Text keine internen Links setzen)',
    '',
    'Quellen (nummeriert, nur diese Fakten verwenden):',
    JSON.stringify(sourcesForPrompt(items), null, 1),
    '',
    'Schreib jetzt den Guide nach den Regeln, auf Deutsch (de) und auf Englisch (en).',
  ].join('\n');
}

export async function writeGuide(ctx) {
  const res = await getClient().beta.messages.parse({
    model: WRITER_MODEL,
    max_tokens: 20000, // zwei Sprachen plus Belege und Nachdenken (bleibt unter der 10-Minuten-Grenze ohne Streaming)
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // lehnt ein Sicherheitsfilter ab, uebernimmt automatisch ein Ersatzmodell
    output_config: { effort: GUIDE_EFFORT, format: betaZodOutputFormat(GuideSchema) },
    system: [{ type: 'text', text: GUIDE_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: buildGuidePrompt(ctx) }],
  });
  if (res.stop_reason === 'refusal') {
    return { ok: false, retry: false, reason: `Claude hat abgelehnt (${res.stop_details?.category ?? 'ohne Kategorie'})`, usage: res.usage, model: res.model };
  }
  if (res.stop_reason === 'max_tokens' || !res.parsed_output) {
    return { ok: false, retry: true, reason: `keine gueltige Antwort (${res.stop_reason})`, usage: res.usage, model: res.model };
  }
  return { ok: true, guide: res.parsed_output, usage: res.usage, model: res.model };
}

// Preise laut Anthropic (USD pro 1 Mio. Tokens, Stand November 2026), nur fuer die Kostenanzeige im Log
const PRICES = {
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};
export function costOf(model, u) {
  if (!u) return 0;
  const p = PRICES[model] ?? PRICES['claude-sonnet-5-5'];
  return ((u.input_tokens ?? 0) * p.in + (u.output_tokens ?? 0) * p.out
    + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6;
}
