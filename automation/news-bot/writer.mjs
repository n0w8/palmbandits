// Schreibt mit Claude aus einer Story (mehrere Quellen-Meldungen) einen eigenen Artikel, in EINEM Aufruf
// auf Deutsch und auf Englisch (zweisprachige Seite: /news/... und /en/news/...).
// Modelle: Claude Sonnet 5.5 schreibt, Claude Haiku 5.5 sortiert vorher billig aus (optional).
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { env, germanDateTime, BRAND } from '../lib/util.mjs';

export const WRITER_MODEL = env('WRITER_MODEL', 'claude-sonnet-5-5');
export const FILTER_MODEL = env('FILTER_MODEL', 'claude-haiku-5-5');
const WRITER_EFFORT = env('WRITER_EFFORT', 'medium'); // low | medium | high

export const GAMES = ['gta-6', 'gta-online', 'gta-5', 'gta-4', 'gta-san-andreas', 'gta-vice-city', 'gta-3', 'allgemein'];

let client;
function getClient() {
  client ??= new Anthropic({ maxRetries: 2, timeout: 240_000 }); // zwei Sprachen = laengere Antwort
  return client;
}
// Nur fuer Tests: eigenen Client (mit Fake-fetch) einsetzen
export function setClientForTests(c) {
  client = c;
}

// ---------- Vorfilter (Haiku): gleiche Storys zusammenlegen, Nicht-News aussortieren ----------
const FilterSchema = z.object({
  groups: z.array(z.array(z.string())).describe('Gruppen von Story-IDs, die dasselbe konkrete Ereignis behandeln (nur Gruppen mit mindestens 2 IDs)'),
  results: z.array(z.object({
    id: z.string(),
    relevant: z.boolean().describe('Echte Neuigkeit fuer deutsche GTA-Spieler?'),
    duplicate_of: z.string().describe(`Titel einer schon veroeffentlichten ${BRAND}-News, die dieselbe Neuigkeit behandelt, sonst leerer String`),
    reason: z.string().describe('Kurzer Grund, max. 12 Woerter'),
  })),
});

const FILTER_SYSTEM = `Du sortierst Nachrichten fuer eine deutsche GTA-Fanseite vor. Jede Story besteht aus Schlagzeilen verschiedener Medien (deutsch und englisch gemischt).

Du bekommst zwei Listen: "Neue Storys" (zu pruefen) und "Bekannte offene Storys" (schon frueher geprueft, warten noch auf eine zweite Quelle).

1. groups: Fasse Storys zusammen, die dasselbe konkrete Ereignis behandeln (z. B. derselbe Patch, dieselbe Ankuendigung, dasselbe Gerichtsurteil), auch wenn die Sprache verschieden ist. Das gilt auch zwischen einer neuen und einer bekannten Story (z. B. deutsche Meldung zu einer englischen Story von vorhin). Nicht zusammenfassen, wenn es nur um dasselbe Spiel oder dasselbe Thema allgemein geht.
2. results: Nur fuer jede NEUE Story: relevant = true, wenn es eine echte Neuigkeit zu GTA 6, GTA Online, GTA 5 oder anderen GTA-Teilen, Rockstar Games oder Take-Two mit GTA-Bezug ist. Nicht relevant: Kaufberatung, Deals, "alles was du wissen musst"-Sammelartikel ohne neue Info, Bestenlisten, Meinungsartikel, Kolumnen, Quiz, Memes, Lifestyle-Geschichten einzelner Fans, reine Fan-Theorien, Artikel in denen GTA nur am Rand vorkommt, alte Beitraege, die Google News nur neu datiert hat (z. B. ein GTA-Online-Update, Termin oder Event aus einem frueheren Jahr).
3. duplicate_of: nur fuellen, wenn eine der bereits veroeffentlichten ${BRAND}-News genau diese Neuigkeit schon behandelt.`;

// stories: neue, noch nicht gepruefte Storys. known: schon gepruefte, noch offene Storys (nur fuer groups),
// damit z. B. eine deutsche Meldung mit der englischen Story von vorhin zusammenfindet.
export async function prefilter(stories, recentTitles, known = []) {
  const brief = (s) => ({
    id: s.id,
    titel: [...new Set(s.items.map((i) => i.title))].slice(0, 5),
    quellen: [...new Set(s.items.map((i) => i.outlet))].slice(0, 6),
  });
  const res = await getClient().messages.parse({
    model: FILTER_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low', format: zodOutputFormat(FilterSchema) },
    system: FILTER_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        `Bereits veroeffentlicht (letzte Tage):\n${recentTitles.map((t) => `- ${t}`).join('\n') || '- (noch nichts)'}`,
        `Bekannte offene Storys (nur zum Zusammenfassen, keine results):\n${known.length ? JSON.stringify(known.map(brief)) : '[]'}`,
        `Neue Storys:\n${JSON.stringify(stories.map(brief))}`,
      ].join('\n\n'),
    }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) return null;
  return {
    groups: res.parsed_output.groups ?? [],
    map: new Map(res.parsed_output.results.map((r) => [r.id, r])),
    usage: res.usage,
  };
}

// ---------- Artikel schreiben (Sonnet), Deutsch + Englisch in einem Aufruf ----------
export const ArticleSchema = z.object({
  skip: z.boolean().describe('true, wenn die Quellen keine echte, ausreichend belegte Neuigkeit hergeben'),
  skip_reason: z.string().describe('Grund fuer skip, sonst leerer String'),
  game: z.enum(GAMES),
  rumor: z.boolean(),
  hype: z.number().int().describe('1 bis 5'),
  breaking: z.boolean(),
  de: z.object({
    title: z.string().describe('Deutscher Titel, hoechstens 70 Zeichen, nennt das Spiel'),
    slug: z.string().describe('Deutscher URL-Slug: nur a-z, 0-9 und Bindestriche, 3 bis 8 Woerter, Umlaute als ae/oe/ue/ss, ohne Datum'),
    description: z.string().describe('Deutsche Meta-Beschreibung, 120 bis 160 Zeichen, ein ganzer Satz'),
    tags: z.array(z.string()).describe('3 bis 6 kurze deutsche Schlagwoerter'),
    body: z.string().describe('Deutscher Artikeltext in Markdown, ohne H1, mit ## Zwischenueberschriften'),
  }).describe('Deutsche Fassung'),
  en: z.object({
    title: z.string().describe('English title, max 70 characters, names the game, written for English search intent'),
    slug: z.string().describe('English URL slug: only a-z, 0-9 and hyphens, 3 to 8 words, no date'),
    description: z.string().describe('English meta description, 120 to 160 characters, one full sentence'),
    tags: z.array(z.string()).describe('3 to 6 short English tags'),
    body: z.string().describe('English article in Markdown, no H1, with ## subheadings'),
  }).describe('Englische Fassung: dieselben Fakten, natuerliches Englisch, keine woertliche Uebersetzung'),
});

const WRITER_SYSTEM = `Du bist der Newsdesk von ${BRAND}, einer deutsch-englischen Fan-Community-Seite rund um GTA (GTA 6, GTA Online, GTA 5 und die Klassiker). ${BRAND} ist eine inoffizielle Fanseite und gehoert nicht zu Rockstar Games oder Take-Two.

Deine Aufgabe: Aus den gelieferten Quellen-Meldungen (Titel, kurze Auszuege, Medium, Link, bei bis zu zwei Meldungen zusaetzlich ein Auszug aus dem Originalartikel im Feld artikeltext) schreibst du eine eigene, kurze News. Die Seite ist zweisprachig: Du lieferst dieselbe News in einem Durchgang auf Deutsch (Feld de) und auf Englisch (Feld en). Die Meldungen anderer Medien sind fuer dich nur ein Hinweis, worueber gerade berichtet wird. Offizielle Quellen (Rockstar, Take-Two, Sony, Microsoft) haben Vorrang.

Harte Regeln:
1. Nur Fakten, die in den gelieferten Meldungen stehen. Erfinde nichts dazu: keine Zahlen, Termine, Uhrzeiten, Preise, Dateigroessen, Zitate, Namen oder Details. Wenn die Meldungen etwas offen lassen, schreib, dass es offen ist.
2. Keine fremden Saetze uebernehmen, auch nicht uebersetzt Satz fuer Satz. Formuliere alles neu in eigenen Worten. Woertliche Zitate hoechstens ein paar Woerter, in Anfuehrungszeichen und mit Quelle. Das gilt besonders fuer artikeltext: Er ist nur deine Faktenquelle. Uebernimm weder seinen Aufbau noch seine Reihenfolge noch seine Formulierungen, und schreib nichts, was nur als Meinung oder Vermutung des Autors darin steht, als Tatsache.
3. Trenne klar zwischen offiziell Bestaetigtem und dem, was nur Medien berichten oder vermuten. Nenne die Quelle im Text ("laut IGN", "wie Rockstar im Newswire schreibt").
4. Leaks, Insider-Infos und Geruechte immer als solche kennzeichnen, nie als Tatsache. Ist der Kern der Meldung unbestaetigt, setze rumor auf true.
5. Kein Clickbait: Der Titel sagt klar, was passiert ist. Keine Fragetitel ohne Antwort, keine Uebertreibungen ("krass", "unglaublich", "der Wahnsinn"), keine Woerter in Grossbuchstaben.
6. Keine Gedankenstriche (– oder —), in beiden Sprachen. Nutze Punkt, Komma oder Doppelpunkt.
7. Sprich die Leser mit "du" an (englisch: "you"). Ton: locker, direkt, nah an der Community, aber sachlich. Keine Emojis.
8. Keine H1-Ueberschrift im Text, der Titel wird separat angezeigt. Nutze ## und bei Bedarf ###.
9. Keine Links im Text. Die Quellen werden automatisch unter dem Artikel verlinkt.
10. Wenn die Meldungen zu duenn sind, nur Deals, Kaufberatung, ein Quiz, ein Meinungsstueck oder keine echte Neuigkeit enthalten, wenn GTA nur am Rand vorkommt, wenn es erkennbar ein alter Beitrag ist (z. B. ein Update, Termin oder Event aus einem frueheren Jahr, das nur neu datiert wurde), oder wenn die Neuigkeit schon in einer der zuletzt veroeffentlichten ${BRAND}-News steht: skip = true mit kurzem Grund. Die anderen Felder dann knapp fuellen.

Aufbau des Textes (body, je Sprache 220 bis 450 Woerter):
- Einstieg ohne Ueberschrift: 2 bis 3 Saetze mit dem Wichtigsten (wer, was, wann).
- Ein Abschnitt mit den bestaetigten Fakten, gern als kurze Liste.
- Falls es offene Punkte oder unbestaetigte Berichte gibt: ein eigener Abschnitt dafuer.
- Ein Abschnitt "Was das fuer dich heisst" (Ueberschrift darf leicht variieren): echter Mehrwert fuer Spieler in Deutschland, zum Beispiel was du jetzt tun kannst, worauf du achten solltest, Zeitangaben in deutscher Zeit (nur wenn die Quelle die Uhrzeit nennt), Hinweise zu Plattformen. Nur Tipps, die sich aus den Fakten ergeben oder allgemein gelten.
Variiere die Ueberschriften, damit nicht jeder Artikel gleich klingt.

Englische Fassung (Feld en):
- Dieselben Fakten wie die deutsche Fassung, nicht mehr und nicht weniger. Gleiche Einordnung (bestaetigt, berichtet, Geruecht) und gleiche Quellennennung ("according to IGN").
- Keine woertliche Uebersetzung: Schreib natuerliches Englisch fuer englischsprachige Leser und fuer englische Suchanfragen (z. B. "GTA 6 release time" statt einer Uebersetzung des deutschen Titels). Titel, Slug, Beschreibung und Tags dafuer eigenstaendig waehlen.
- Gleicher Aufbau und gleiche Laenge wie die deutsche Fassung, Ueberschriften natuerlich englisch (der Abschnitt "Was das fuer dich heisst" heisst z. B. "What this means for you", darf variieren).
- Der Praxis-Abschnitt richtet sich an Spieler weltweit, nicht nur in Deutschland. Uhrzeiten nur, wenn die Quelle sie nennt, dann in der Zeitzone der Quelle oder in UTC, nicht in deutscher Zeit.
- Regel 2 gilt hier besonders: Die meisten Quellen sind englisch, uebernimm keine ihrer Formulierungen, sondern schreib eigenstaendig (ein automatischer Check meldet 8 oder mehr gleiche Woerter am Stueck).

Felder (gemeinsam):
- game: das Hauptspiel der Meldung, "allgemein" wenn es um Rockstar/Take-Two allgemein geht.
- hype: 1 = Randnotiz, 2 = kleine News, 3 = normale News, 4 = grosse News, 5 = riesige offizielle Ankuendigung (Trailer, Termin, Verschiebung).
- breaking: true nur bei grosser, frischer, offiziell bestaetigter Nachricht.
- rumor: siehe Regel 4.

Felder je Sprache (de und en):
- title: hoechstens 70 Zeichen, konkret, nennt das Spiel (z. B. "GTA 6") und den wichtigsten Suchbegriff moeglichst weit vorne. Der Titel muss halten, was der Text liefert.
- slug: nur a-z, 0-9, Bindestriche, 3 bis 8 Woerter, ohne Datum. Deutscher Slug aus dem deutschen Titel, englischer Slug aus dem englischen Titel.
- description: 120 bis 160 Zeichen, ein ganzer Satz mit dem Kern der Meldung.
- tags: 3 bis 6 kurze Schlagwoerter in der jeweiligen Sprache (z. B. "GTA 6", "Release", "PS5").
- body: der Text nach dem Aufbau oben.

Hintergrund (Stand der Redaktion): Der Release-Termin von GTA 6 (Grand Theft Auto VI) ist der 19. November 2026, fuer PS5 und Xbox Series X|S. Ob das Spiel schon erschienen ist, ergibt sich aus dem aktuellen Datum in der Anfrage; schreib die Zeitform passend dazu. Schauplatz ist der Bundesstaat Leonida mit Vice City, die Hauptfiguren heissen Lucia Caminos und Jason Duval. Nutze dieses Wissen nur als Einordnung, nicht als Ersatz fuer Quellen.`;

export async function writeArticle(story, verdict, recentTitles, now = new Date()) {
  const rank = { official: 0, A: 1, B: 2, rumor: 3 };
  // Staerkste Quellen zuerst, innerhalb einer Stufe die mit nachgeladenem Artikeltext (damit sie nicht wegfallen)
  const sources = [...story.items].sort((a, b) => rank[a.tier] - rank[b.tier] || Number(!!b.text) - Number(!!a.text)).slice(0, 10).map((i) => ({
    medium: i.outlet,
    stufe: i.tier === 'official' ? 'offiziell' : i.tier === 'rumor' ? 'Geruechte-Quelle' : `Medium (${i.tier})`,
    sprache: i.lang,
    titel: i.title,
    auszug: i.snippet || undefined,
    artikeltext: i.text || undefined, // nur bei bis zu 2 nachgeladenen Artikeln (siehe article-text.mjs)
    veroeffentlicht: i.published,
    link: i.link,
  }));
  const user = [
    `Jetzt ist ${germanDateTime(now)} Uhr (deutsche Zeit).`,
    `Ampel: ${verdict.color === 'green' ? 'GRUEN (wird automatisch veroeffentlicht)' : 'GELB (ein Mensch prueft vor Veroeffentlichung)'}, Grund: ${verdict.reason}.`,
    '',
    `Zuletzt veroeffentlichte ${BRAND}-News (nichts doppelt schreiben):`,
    recentTitles.length ? recentTitles.map((t) => `- ${t}`).join('\n') : '- (noch keine)',
    '',
    'Quellen-Meldungen zu dieser Story:',
    JSON.stringify(sources, null, 1),
    '',
    'Schreib jetzt die News nach den Regeln, auf Deutsch (de) und auf Englisch (en).',
  ].join('\n');

  const res = await getClient().beta.messages.parse({
    model: WRITER_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // lehnt ein Sicherheitsfilter ab, uebernimmt automatisch ein Ersatzmodell
    output_config: { effort: WRITER_EFFORT, format: betaZodOutputFormat(ArticleSchema) },
    system: [{ type: 'text', text: WRITER_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });

  if (res.stop_reason === 'refusal') {
    return { ok: false, retry: false, reason: `Claude hat abgelehnt (${res.stop_details?.category ?? 'ohne Kategorie'})`, usage: res.usage };
  }
  if (res.stop_reason === 'max_tokens' || !res.parsed_output) {
    return { ok: false, retry: true, reason: `keine gueltige Antwort (${res.stop_reason})`, usage: res.usage };
  }
  return { ok: true, article: res.parsed_output, usage: res.usage, model: res.model };
}

export function isRetryable(err) {
  return err instanceof Anthropic.RateLimitError
    || err instanceof Anthropic.InternalServerError
    || err instanceof Anthropic.APIConnectionError
    || (err instanceof Anthropic.APIError && (err.status === 529 || err.status >= 500));
}

export function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'API-Schluessel ungueltig (ANTHROPIC_API_KEY pruefen)';
  if (err instanceof Anthropic.PermissionDeniedError) return 'keine Berechtigung fuer dieses Modell';
  if (err instanceof Anthropic.BadRequestError) return `Anfrage fehlerhaft: ${err.message}`;
  if (err instanceof Anthropic.RateLimitError) return 'Rate-Limit erreicht, naechster Lauf versucht es erneut';
  if (err instanceof Anthropic.APIError) return `API-Fehler ${err.status}: ${err.message}`;
  return err?.message ?? String(err);
}
