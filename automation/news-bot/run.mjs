// Palm Bandits News-Bot: Feeds lesen, filtern, Storys bilden, Ampel, mit Claude schreiben, Dateien ablegen.
// Aufruf: node news-bot/run.mjs [--dry-run] [--verbose]
// Ohne ANTHROPIC_API_KEY laeuft er automatisch als Probelauf (schreibt nichts).
import path from 'node:path';
import {
  AUTOMATION_DIR, berlinDate, env, envInt, hasFlag, loadDotEnv, readJson, setOutput, summary, truncate, BRAND } from '../lib/util.mjs';
import { fetchAll } from './fetch.mjs';
import { ampel, clusterIntoStories, isFresh, isRelevant, mergeStories, priority, tokenize } from './analyze.mjs';
import {
  countToday, isSeen, knownTitles, loadLog, loadState, markSeen, normTitleKey, pruneState, saveLog, saveState, siteNewsTitles, slimItem,
} from './state.mjs';
import { describeError, isRetryable, prefilter, writeArticle, WRITER_MODEL, FILTER_MODEL } from './writer.mjs';
import { NEWS_DIR, copiedPassagesPair, normalizeArticlePair, writeArticleFiles } from './output.mjs';
import { addArticleTexts } from './article-text.mjs';
import { discord } from './notify.mjs';

loadDotEnv();

const HAS_KEY = Boolean(env('ANTHROPIC_API_KEY') || env('ANTHROPIC_AUTH_TOKEN'));
const DRY = hasFlag('dry-run') || !HAS_KEY;
const VERBOSE = hasFlag('verbose');
const MAX_ARTICLES = envInt('MAX_ARTICLES', 5); // pro Lauf, gruen + gelb
const DAILY_CAP = envInt('DAILY_CAP', 40); // pro Tag, gruen + gelb
const MAX_DRAFTS_PER_RUN = envInt('MAX_DRAFTS_PER_RUN', 2); // gelbe Entwuerfe pro Lauf
const DAILY_DRAFT_CAP = envInt('DAILY_DRAFT_CAP', 12); // gelbe Entwuerfe pro Tag (jeder muss geprueft werden)
const MAX_AGE_HOURS = envInt('MAX_AGE_HOURS', 48); // Meldungen fuer die Story-Bildung
const FRESH_HOURS = envInt('FRESH_HOURS', 12); // nur Storys mit Meldung juenger als das werden geschrieben
const YELLOW_HOLD_MIN = envInt('YELLOW_HOLD_MINUTES', 40); // gelb wartet so lange auf eine zweite Quelle
const USE_PREFILTER = env('USE_PREFILTER', 'true') !== 'false';
const ARTICLE_TEXT_PAGES = envInt('ARTICLE_TEXT_PAGES', 2); // Originalartikel pro Story nachladen (0 = aus)
const RECENT_TITLES = envInt('RECENT_TITLES', 40); // so viele zuletzt geschriebene Titel kennt der Bot (gegen Doppelte)

// Preise laut Anthropic (USD pro 1 Mio. Tokens), nur fuer die Kostenanzeige im Log
const PRICES = {
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  'claude-sonnet-5': { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};
let costUsd = 0;
function addCost(model, u) {
  if (!u) return;
  const p = PRICES[model] ?? PRICES['claude-sonnet-5-5'];
  costUsd += ((u.input_tokens ?? 0) * p.in + (u.output_tokens ?? 0) * p.out
    + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6;
}

const COLOR_DE = { green: 'GRUEN', yellow: 'GELB ', red: 'ROT  ' };
const RANK = { official: 0, A: 1, B: 2, rumor: 3 };
// Anzeige-Titel: Schlagzeile der staerksten Quelle
const headTitle = (story) => [...story.items].sort((a, b) => (RANK[a.tier] ?? 9) - (RANK[b.tier] ?? 9))[0]?.title ?? story.title;
const newestMs = (story) => Math.max(...story.items.map((i) => new Date(i.published ?? story.firstSeen).getTime()));

async function main() {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  console.log(`${BRAND} News-Bot ${DRY ? '(PROBELAUF, schreibt nichts)' : ''} ${berlinDate(new Date(now))}`);
  if (!HAS_KEY && !hasFlag('dry-run')) console.log('Kein ANTHROPIC_API_KEY gesetzt: automatischer Probelauf.');
  console.log(`Einstellungen: Schreiber ${WRITER_MODEL}, Vorfilter ${FILTER_MODEL}, max. ${MAX_ARTICLES} Artikel pro Lauf, ${DAILY_CAP} pro Tag (davon max. ${DAILY_DRAFT_CAP} Entwuerfe), Artikeltext von ${ARTICLE_TEXT_PAGES} Quellen`);

  // 1. Feeds holen
  const config = readJson(path.join(AUTOMATION_DIR, 'news-bot', 'sources.json'));
  const results = await fetchAll(config);
  let okFeeds = 0;
  for (const r of results) {
    if (r.ok) okFeeds++;
    const status = r.ok ? `${String(r.items.length).padStart(3)} Meldungen` : `FEHLER ${r.error}${r.source.optional ? ' (optional)' : ''}`;
    if (VERBOSE || !r.ok) console.log(`  ${r.ok ? 'ok ' : '!! '} ${r.source.name.padEnd(42)} ${status} (${r.ms} ms)`);
  }
  console.log(`Feeds: ${okFeeds}/${results.length} erreichbar`);

  // 2. Filtern (Alter, GTA-Bezug, Deals) und Doppelte im selben Lauf entfernen
  const all = results.flatMap((r) => r.items);
  const drops = { alt: 0, kein_gta: 0, deal: 0, doppelt: 0 };
  const byTitle = new Map();
  const ids = new Set();
  for (const item of all) {
    if (!isFresh(item, now, MAX_AGE_HOURS)) { drops.alt++; continue; }
    const rel = isRelevant(item);
    if (!rel.ok) { if (rel.why.startsWith('Deal')) drops.deal++; else drops.kein_gta++; continue; }
    if (ids.has(item.id)) { drops.doppelt++; continue; }
    ids.add(item.id);
    const key = normTitleKey(item.title);
    const prev = byTitle.get(key);
    if (prev) {
      drops.doppelt++;
      if (prev.aggregator && !item.aggregator) byTitle.set(key, item); // Direktlink bevorzugen
      continue;
    }
    byTitle.set(key, item);
  }
  const relevant = [...byTitle.values()];
  console.log(`Meldungen: ${all.length} gesamt, ${relevant.length} relevant (verworfen: ${drops.alt} aelter als ${MAX_AGE_HOURS} h, ${drops.kein_gta} ohne GTA-Bezug, ${drops.deal} Deals/Quiz, ${drops.doppelt} doppelt)`);

  // 3. Gegen Gedaechtnis pruefen und Storys bilden
  const state = pruneState(loadState(), now);
  const newItems = relevant.filter((i) => !isSeen(state, i));
  const idfCorpus = [...relevant, ...state.stories.flatMap((s) => s.items)].map((i) => tokenize(i.title));
  const { created, attached } = clusterIntoStories(newItems, state.stories, idfCorpus, now);
  state.stories.push(...created);
  for (const i of newItems) markSeen(state, i, nowIso);
  console.log(`Neu: ${newItems.length} Meldungen -> ${created.length} neue Storys, ${attached.length} Folgemeldungen zu bekannten Storys`);

  const log = loadLog();
  // Bekannte Titel gegen Doppelte: Bot-Protokoll plus von Hand geschriebene News der letzten 3 Tage
  const recent = knownTitles(log, siteNewsTitles(NEWS_DIR, new Date(now), 3), RECENT_TITLES);
  const isOpen = (s) => s.status === 'pending' && now - newestMs(s) <= FRESH_HOURS * 3_600_000;

  // 4. Vorfilter mit Haiku (nur Echtbetrieb): gleiche Storys zusammenlegen, Nicht-News raus
  if (!DRY && USE_PREFILTER) {
    // Nur noch nicht gepruefte Storys bewerten lassen (spart Kosten). Schon gepruefte offene Storys gehen als
    // Kontext mit, damit Haiku z. B. eine deutsche Meldung der englischen Story von vorhin zuordnet (mehr Gruen).
    const open = state.stories.filter((s) => isOpen(s) && !s.checked).sort((a, b) => newestMs(b) - newestMs(a)).slice(0, 80);
    const known = state.stories.filter((s) => isOpen(s) && s.checked).sort((a, b) => newestMs(b) - newestMs(a)).slice(0, 60);
    const openIds = new Set(open.map((s) => s.id));
    if (open.length) {
      try {
        const pf = await prefilter(open, recent, known);
        if (pf) {
          addCost(FILTER_MODEL, pf.usage);
          const before = state.stories.length;
          state.stories = mergeStories(state.stories, pf.groups);
          for (const s of open) s.checked = true;
          let out = 0;
          for (const s of state.stories) {
            const r = openIds.has(s.id) ? pf.map.get(s.id) : undefined; // nur neue Storys bewerten
            if (!r || s.status !== 'pending') continue;
            if (!r.relevant || r.duplicate_of) {
              s.status = 'skipped';
              s.reason = r.duplicate_of ? `doppelt zu "${r.duplicate_of}"` : `Vorfilter: ${r.reason}`;
              out++;
              if (VERBOSE) console.log(`  Vorfilter raus: ${headTitle(s)} (${s.reason})`);
            }
          }
          console.log(`Vorfilter (Haiku): ${open.length} neue Storys geprueft (${known.length} bekannte als Kontext), ${before - state.stories.length} zusammengelegt, ${out} aussortiert`);
        }
      } catch (err) {
        console.warn(`Vorfilter uebersprungen: ${describeError(err)}`);
      }
    }
  }

  // 5. Ampel
  const newsrooms = config.newsrooms; // Seiten mit gemeinsamer Redaktion zaehlen als ein Medium
  const candidates = [];
  const table = [];
  const createdIds = new Set(created.map((s) => s.id));
  const attachedIds = new Set(attached.map((a) => a.story.id));
  for (const story of state.stories) {
    const verdict = ampel(story, newsrooms);
    story.verdict = verdict.color;
    if (story.status === 'pending') story.reason = verdict.reason;
    const ageMin = (now - new Date(story.firstSeen).getTime()) / 60000;
    let action;
    if (story.status !== 'pending') {
      action = { published: 'schon veroeffentlicht', draft: 'Entwurf liegt schon vor', skipped: `uebersprungen (${story.reason})`, expired: 'abgelaufen' }[story.status] ?? story.status;
    } else if (!isOpen(story)) {
      action = `zu alt (aelter als ${FRESH_HOURS} h), wird nicht geschrieben`;
    } else if (verdict.color === 'red') {
      action = 'nicht schreiben (nur Geruechte)';
    } else if (verdict.color === 'green') {
      action = 'veroeffentlichen';
      candidates.push({ story, verdict });
    } else if (ageMin >= YELLOW_HOLD_MIN || DRY) {
      action = DRY && ageMin < YELLOW_HOLD_MIN ? `Entwurf als PR (im Echtbetrieb erst nach ${YELLOW_HOLD_MIN} min Wartezeit)` : 'Entwurf als Pull Request';
      candidates.push({ story, verdict });
    } else {
      action = `wartet noch ${Math.ceil(YELLOW_HOLD_MIN - ageMin)} min auf zweite Quelle`;
    }
    if (createdIds.has(story.id) || attachedIds.has(story.id) || story.status === 'pending') table.push({ story, verdict, action });
  }
  // Gruen vor Gelb, dann offizielle, viele Quellen, neueste
  candidates.sort((a, b) => (a.verdict.color === b.verdict.color ? 0 : a.verdict.color === 'green' ? -1 : 1)
    || priority(b.story, b.verdict) - priority(a.story, a.verdict));

  const order = { green: 0, yellow: 1, red: 2 };
  table.sort((a, b) => order[a.verdict.color] - order[b.verdict.color] || b.story.items.length - a.story.items.length);
  const counts = { green: 0, yellow: 0, red: 0 };
  for (const t of table) counts[t.verdict.color]++;
  console.log(`\nStorys (neu/offen): ${table.length}  |  gruen ${counts.green}  gelb ${counts.yellow}  rot ${counts.red}  |  schreibbar (juenger als ${FRESH_HOURS} h): ${candidates.length}`);
  const show = VERBOSE ? table : table.slice(0, 30);
  for (const { story, verdict, action } of show) {
    const outlets = [...new Set(story.items.map((i) => i.outlet))];
    console.log(`  [${COLOR_DE[verdict.color]}] ${truncate(headTitle(story), 76).padEnd(76)} | ${story.items.length} Meld., ${outlets.length} Quellen | ${verdict.reason} -> ${action}`);
    if (VERBOSE) for (const i of story.items) console.log(`        - (${i.tier}) ${i.outlet}: ${truncate(i.title, 90)}`);
  }
  if (table.length > show.length) console.log(`  ... und ${table.length - show.length} weitere (mit --verbose alle)`);

  // 6. Auswahl mit Grenzen
  const todayAll = countToday(log, new Date(now));
  const todayDrafts = log.entries.filter((e) => e.date === berlinDate(new Date(now)) && e.color === 'yellow').length;
  const capacity = Math.max(0, Math.min(MAX_ARTICLES, DAILY_CAP - todayAll));
  let draftRoom = Math.max(0, Math.min(MAX_DRAFTS_PER_RUN, DAILY_DRAFT_CAP - todayDrafts));
  const picked = [];
  for (const c of candidates) {
    if (picked.length >= capacity) break;
    if (c.verdict.color === 'yellow') {
      if (draftRoom <= 0) continue;
      draftRoom--;
    }
    picked.push(c);
  }
  console.log(`\nHeute schon ${todayAll}/${DAILY_CAP} Artikel (davon ${todayDrafts}/${DAILY_DRAFT_CAP} Entwuerfe). Dieser Lauf: ${picked.length} von max. ${capacity}`);

  if (DRY) {
    for (const c of picked) {
      console.log(`  wuerde schreiben: [${COLOR_DE[c.verdict.color]}] ${headTitle(c.story)}`);
      // --texts: zusaetzlich pruefen, ob der Originaltext der Quellen geladen werden kann (ohne KI)
      if (hasFlag('texts')) {
        await addArticleTexts(c.story, { maxPages: ARTICLE_TEXT_PAGES }).catch(() => 0);
        for (const i of c.story.items.filter((x) => x.text)) console.log(`      Artikeltext: ${i.outlet}, ${i.text.length} Zeichen`);
      }
    }
    summary(`### News-Bot Probelauf\n\n${table.length} Storys, gruen ${counts.green}, gelb ${counts.yellow}, rot ${counts.red}. Nichts geschrieben.`);
    setOutput('published', 0);
    setOutput('drafts', 0);
    setOutput('urls', '');
    return;
  }

  // 7. Schreiben
  const published = [];
  const drafts = [];
  let fatal = null;
  for (const { story, verdict } of picked) {
    try {
      // Originaltext von bis zu 2 starken Quellen nachladen (mehr Fakten, weniger Raten); Fehler sind egal
      const texts = await addArticleTexts(story, { maxPages: ARTICLE_TEXT_PAGES }).catch(() => 0);
      if (VERBOSE) console.log(`  Artikeltext nachgeladen: ${texts} Quelle(n) fuer "${headTitle(story)}"`);
      const res = await writeArticle(story, verdict, recent, new Date(now));
      addCost(res.model ?? WRITER_MODEL, res.usage);
      if (!res.ok) {
        console.warn(`  nicht geschrieben: ${headTitle(story)}: ${res.reason}`);
        if (!res.retry) { story.status = 'skipped'; story.reason = res.reason; }
        continue;
      }
      if (res.article.skip) {
        story.status = 'skipped';
        story.reason = `Claude: ${res.article.skip_reason}`;
        console.log(`  Claude ueberspringt: ${headTitle(story)} (${res.article.skip_reason})`);
        continue;
      }
      // Eine Antwort, zwei Fassungen: article = deutsch (fuer Log, Discord, Gedaechtnis), pair.en = englisch
      const pair = normalizeArticlePair(res.article);
      const article = pair.de;
      let finalVerdict = verdict;
      const copied = copiedPassagesPair(pair, story);
      if (verdict.color === 'green' && (copied.length || article.rumor)) {
        const why = copied.length ? 'Text enthaelt eine Passage wie in der Quelle' : 'Claude stuft den Kern als unbestaetigt ein';
        finalVerdict = { ...verdict, color: 'yellow', reason: `${verdict.reason}; zur Pruefung, weil ${why}` };
        article.warnings.push(why);
      }
      const file = writeArticleFiles(pair, story, finalVerdict, new Date(now));
      story.status = finalVerdict.color === 'green' ? 'published' : 'draft';
      story.slug = file.slug;
      log.entries.push({ ts: nowIso, date: berlinDate(new Date(now)), color: finalVerdict.color, slug: file.slug, enSlug: file.en?.slug, title: article.title, storyId: story.id, reason: finalVerdict.reason });
      recent.push(article.title);
      console.log(`  ${finalVerdict.color === 'green' ? 'VEROEFFENTLICHT' : 'ENTWURF'}: ${article.title} -> ${file.fileName}${file.en ? ` + en/${file.en.fileName}` : ' (ohne EN)'}${article.warnings.length ? ` (Hinweise: ${article.warnings.join('; ')})` : ''}`);
      if (finalVerdict.color === 'green') {
        published.push({ ...file, article });
        // Ein Post pro Artikel (deutsch), die englische Fassung als Zusatzfeld
        const fields = file.en ? [{ name: 'English version', value: file.en.url }] : [];
        await discord({ title: article.title, url: file.url, description: article.description, color: 'green', footer: article.rumor ? 'Gerücht, nicht offiziell bestätigt' : 'Bestätigt · mit Quellen', game: article.game, ping: !!article.breaking, fields });
      } else {
        drafts.push({ ...file, article });
      }
    } catch (err) {
      console.warn(`  Fehler bei "${headTitle(story)}": ${describeError(err)}`);
      if (!isRetryable(err) && (err?.status === 401 || err?.status === 403)) { fatal = err; break; }
    }
  }

  // 8. Speichern
  for (const s of state.stories) s.items = s.items.map(slimItem);
  saveState(state);
  saveLog(log, now);
  console.log(`\nFertig: ${published.length} veroeffentlicht, ${drafts.length} Entwuerfe. Geschaetzte Claude-Kosten dieses Laufs: ${costUsd.toFixed(4)} USD`);

  setOutput('published', published.length);
  setOutput('drafts', drafts.length);
  // IndexNow: deutsche und englische Adresse melden
  setOutput('urls', published.flatMap((p) => [p.url, p.en?.url]).filter(Boolean).join(' '));
  summary([
    '### News-Bot',
    '',
    `Storys neu/offen: ${table.length} (gruen ${counts.green}, gelb ${counts.yellow}, rot ${counts.red})`,
    ...published.map((p) => `- Gruen, veroeffentlicht: [${p.article.title}](${p.url})${p.en ? ` / [EN](${p.en.url})` : ''}`),
    ...drafts.map((d) => `- Gelb, Entwurf: ${d.article.title}`),
    `Kosten ca. ${costUsd.toFixed(4)} USD`,
  ].join('\n'));
  if (fatal) {
    console.error(`Abbruch: ${describeError(fatal)}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
