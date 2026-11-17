// Palm Bandits Guide-Radar: findet in Fachmedien, Reddit und YouTube neue Entdeckungen
// (Geld-Methoden, Fundorte, Glitches, Easter Eggs, Sammelobjekte, Tipps) und schreibt daraus
// Guide-Entwuerfe mit Quellen, auf Deutsch und Englisch (ein Claude-Aufruf, beide Fassungen im selben Pull Request).
// JEDER Radar-Guide geht als Pull Request zur Freigabe, nie direkt online.
// Aufruf: node guide-radar/run.mjs [--dry-run] [--verbose] [--no-enrich]
// Ohne ANTHROPIC_API_KEY laeuft er automatisch als Probelauf (ruft keine KI auf, schreibt nichts).
import { BRAND, berlinDate, env, envInt, hasFlag, loadDotEnv, setOutput, summary, truncate } from '../lib/util.mjs';
import { isFresh, isRelevant } from '../news-bot/analyze.mjs';
import { copiedPassages } from '../news-bot/output.mjs';
import { describeError } from '../news-bot/writer.mjs';
import { enrichItems, fetchRadar, loadRadarConfig } from './fetch.mjs';
import { INTENT_MIN, detectGame, guessCategory, guideIntent, isGuideCandidate } from './intent.mjs';
import { assessTopic, clusterTopics, findExistingGuide, guideTokens, headTitle, independentKey, loadExistingGuides, makeIdf, rankItems } from './topics.mjs';
import { draftsToday, findSimilarTopic, isBlockedItem, loadRadarState, memoryTitles, pruneRadarState, rememberTopic, saveRadarState } from './state.mjs';
import { FILTER_MODEL, WRITER_MODEL, costOf, precheckTopic, writeGuide } from './writer.mjs';
import { GUIDES_DIR, allowedInternalLinks, allowedInternalLinksEn, normalizeGuidePair, sourcesForTopic, writeGuideDraft } from './output.mjs';
import { enGuideMap } from '../lib/i18n.mjs';

loadDotEnv();

const HAS_KEY = Boolean(env('ANTHROPIC_API_KEY') || env('ANTHROPIC_AUTH_TOKEN'));
const DRY = hasFlag('dry-run') || !HAS_KEY;
const VERBOSE = hasFlag('verbose');
const ENRICH = !hasFlag('no-enrich');
const MAX_GUIDES = envInt('MAX_GUIDES', 2); // Entwuerfe pro Lauf
const DAILY_CAP = envInt('GUIDE_DAILY_CAP', 6); // Entwuerfe pro Tag (jeder muss gelesen werden)
const MAX_AGE_HOURS = envInt('RADAR_MAX_AGE_HOURS', 72);
const PRECHECK_MAX = envInt('RADAR_PRECHECK_MAX', 5); // hoechstens so viele Haiku-Vorpruefungen pro Lauf
const SHOW = envInt('RADAR_SHOW', 25);

const STATUS_DE = {
  draft: 'ENTWURF ', watch: 'BEOBACHT', exists: 'GIBT ES ', done: 'ERLEDIGT', rejected: 'ABGELEHNT',
};

function isGtaItem(item) {
  const rel = isRelevant(item);
  if (rel.ok) return true;
  if (rel.why.startsWith('Deal')) return false;
  return !!item.gtaOnly;
}

function fatalStatus(err) {
  return err?.status === 401 || err?.status === 403;
}

async function main() {
  const now = Date.now();
  let costUsd = 0;
  console.log(`${BRAND} Guide-Radar ${DRY ? '(PROBELAUF, ruft keine KI auf, schreibt nichts) ' : ''}${berlinDate(new Date(now))}`);
  if (!HAS_KEY && !hasFlag('dry-run')) console.log('Kein ANTHROPIC_API_KEY gesetzt: automatischer Probelauf.');

  // 1. Feeds
  const config = loadRadarConfig();
  const results = await fetchRadar(config);
  let okFeeds = 0;
  for (const r of results) {
    if (r.ok) okFeeds++;
    const status = r.ok ? `${String(r.items.length).padStart(3)} Meldungen` : `FEHLER ${r.error}${r.source.optional ? ' (optional)' : ''}`;
    console.log(`  ${r.ok ? 'ok ' : '!! '} ${truncate(r.source.name, 60).padEnd(60)} ${status} (${r.ms} ms)`);
  }
  console.log(`Feeds: ${okFeeds}/${results.length} erreichbar`);

  // 2. Filtern: Alter, GTA-Bezug, Guide-Absicht (reine News gehoeren dem News-Bot), Gedaechtnis
  const state = pruneRadarState(loadRadarState(), now);
  const drops = { alt: 0, kein_gta: 0, keine_absicht: 0, news: 0, doppelt: 0, schon_verwertet: 0 };
  const seen = new Map();
  for (const item of results.flatMap((r) => r.items)) {
    if (!isFresh(item, now, MAX_AGE_HOURS)) { drops.alt++; continue; }
    if (!isGtaItem(item)) { drops.kein_gta++; continue; }
    item.intent = guideIntent(item);
    if (!isGuideCandidate(item.intent)) {
      if (item.intent.raw >= INTENT_MIN) drops.news++; else drops.keine_absicht++;
      continue;
    }
    if (isBlockedItem(state, item)) { drops.schon_verwertet++; continue; }
    item.game = detectGame(item.title) ?? item.gameHint ?? detectGame(item.snippet);
    item.tokens = guideTokens(item.title);
    // Gleicher Artikel ueber Google News und direkt: Direktlink behalten
    const key = `${independentKey(item)}|${[...item.tokens].sort().join(' ')}`;
    const prev = seen.get(key) ?? [...seen.values()].find((p) => p.id === item.id);
    if (prev) {
      drops.doppelt++;
      if (prev.aggregator && !item.aggregator) seen.set(key, item);
      continue;
    }
    seen.set(key, item);
  }
  const candidates = [...seen.values()];
  console.log(`Meldungen mit Guide-Absicht: ${candidates.length} (verworfen: ${drops.alt} aelter als ${MAX_AGE_HOURS} h, ${drops.kein_gta} ohne GTA-Bezug, ${drops.keine_absicht} ohne Guide-Absicht, ${drops.news} reine News, ${drops.doppelt} doppelt, ${drops.schon_verwertet} schon verwertet)`);

  // 3. Themen bilden, bewerten, gegen vorhandene Guides und Gedaechtnis pruefen
  const guides = loadExistingGuides(GUIDES_DIR);
  const w = makeIdf([...candidates.map((i) => i.tokens), ...guides.map((g) => g.tokens), ...memoryTitles(state).map(guideTokens)]);
  const topics = clusterTopics(candidates, w);
  for (const t of topics) {
    t.assessment = assessTopic(t, now);
    t.head = headTitle(t);
    t.category = guessCategory(t.items.map((i) => i.intent));
    const ex = findExistingGuide(t, guides, w);
    const mem = ex ? null : findSimilarTopic(t, state, w, now);
    if (ex) { t.status = 'exists'; t.note = `Guide gibt es schon: /guides/${ex.guide.slug}/`; }
    else if (mem) { t.status = mem.status === 'drafted' ? 'done' : 'rejected'; t.note = mem.status === 'drafted' ? `schon als Entwurf: ${mem.slug ?? mem.title}` : `kuerzlich abgelehnt (${mem.reason ?? '-'})`; }
    else { t.status = t.assessment.decision; t.note = t.assessment.reason; }
  }
  const order = { draft: 0, watch: 1, exists: 2, done: 3, rejected: 4 };
  topics.sort((a, b) => order[a.status] - order[b.status] || b.assessment.score - a.assessment.score);
  const count = (s) => topics.filter((t) => t.status === s).length;
  console.log(`\nThemen: ${topics.length} | Entwurf moeglich ${count('draft')} | beobachten ${count('watch')} | gibt es schon ${count('exists')} | schon bearbeitet ${count('done') + count('rejected')}`);
  for (const t of topics.slice(0, VERBOSE ? topics.length : SHOW)) {
    const outlets = [...new Set(rankItems(t.items).map((i) => i.outlet))];
    console.log(`  [${STATUS_DE[t.status]}] ${String(t.assessment.score).padStart(5)}  ${truncate(t.head, 78).padEnd(78)} | ${t.game ?? '?'}/${t.category} | ${t.items.length} Meld., ${t.assessment.independent} unabh. | ${t.note}`);
    if (VERBOSE) for (const i of rankItems(t.items)) console.log(`        - (${i.tier}/${i.type}) ${i.outlet}: ${truncate(i.title, 90)}  [Absicht ${i.intent.score}: ${i.intent.hits.slice(0, 4).join(', ')}${i.intent.news.length ? `; News: ${i.intent.news.join(', ')}` : ''}]`);
  }
  if (!VERBOSE && topics.length > SHOW) console.log(`  ... und ${topics.length - SHOW} weitere (mit --verbose alle)`);

  // 4. Grenzen
  const today = draftsToday(state, new Date(now));
  const capacity = Math.max(0, Math.min(MAX_GUIDES, DAILY_CAP - today));
  const draftable = topics.filter((t) => t.status === 'draft');
  console.log(`\nHeute schon ${today}/${DAILY_CAP} Guide-Entwuerfe. Dieser Lauf: max. ${capacity}.`);
  const allowedLinks = allowedInternalLinks(guides);
  // Englische Seite: nur Guides verlinken, die es auf Englisch wirklich gibt
  const guideMap = enGuideMap();
  const allowedLinksEn = allowedInternalLinksEn([...guideMap.values()]);
  const guidesForPrompt = guides.map((g) => ({ ...g, en: guideMap.get(g.slug) }));
  const watchList = topics.filter((t) => t.status === 'watch').slice(0, 10);

  if (DRY) {
    const would = draftable.slice(0, capacity);
    for (const t of would) {
      const items = rankItems(t.items).slice(0, 8);
      if (ENRICH) await enrichItems(items);
      console.log(`  wuerde pruefen und schreiben: ${t.head}`);
      console.log(`    ${t.assessment.reason} | Punkte ${t.assessment.score} | Spiel ${t.game ?? '?'} | Kategorie ${t.category}`);
      for (const i of items) console.log(`    - ${i.outlet}: ${(i.text || i.snippet || '').length} Zeichen Quelltext${i.enriched ? ' (Artikel nachgeladen)' : ''}`);
    }
    summary([
      '### Guide-Radar (Probelauf)',
      '',
      `${topics.length} Themen: Entwurf moeglich ${count('draft')}, beobachten ${count('watch')}. Nichts geschrieben.`,
      ...would.map((t) => `- Wuerde schreiben: ${t.head} (${t.assessment.reason})`),
      ...watchList.map((t) => `- Beobachten: ${t.head} (${t.note})`),
    ].join('\n'));
    setOutput('drafts', 0);
    return;
  }

  // 5. Vorpruefen (Haiku) und schreiben (Sonnet)
  const picked = [];
  let prechecks = 0;
  let fatal = null;
  for (const t of draftable) {
    if (picked.length >= capacity || prechecks >= PRECHECK_MAX) break;
    const items = rankItems(t.items).slice(0, 8);
    if (ENRICH) await enrichItems(items);
    let pre = null;
    try {
      prechecks++;
      const r = await precheckTopic(t, items, { game: t.game, category: t.category });
      costUsd += costOf(r.model ?? FILTER_MODEL, r.usage);
      if (r.ok) pre = r.result;
      else console.warn(`  Vorpruefung ohne Ergebnis: ${t.head} (${r.reason})`);
    } catch (err) {
      console.warn(`  Vorpruefung uebersprungen: ${describeError(err)}`);
      if (fatalStatus(err)) { fatal = err; break; }
    }
    if (pre && !pre.actionable) {
      rememberTopic(state, t, 'rejected', { title: t.head, game: pre.game, reason: `Haiku: ${pre.reason}` }, now);
      console.log(`  Kein Guide-Thema: ${t.head} (Haiku: ${pre.reason})`);
      continue;
    }
    picked.push({ t, items, pre });
  }

  const drafts = [];
  for (const { t, items, pre } of fatal ? [] : picked) {
    try {
      const res = await writeGuide({ items, assessment: t.assessment, precheck: pre, existingGuides: guidesForPrompt, allowedLinks, allowedLinksEn, now: new Date(now) });
      costUsd += costOf(res.model ?? WRITER_MODEL, res.usage);
      if (!res.ok) {
        console.warn(`  nicht geschrieben: ${t.head}: ${res.reason}`);
        if (!res.retry) rememberTopic(state, t, 'rejected', { title: t.head, reason: res.reason }, now);
        continue;
      }
      if (res.guide.skip) {
        rememberTopic(state, t, 'rejected', { title: t.head, game: res.guide.game, reason: `Claude: ${res.guide.skip_reason}` }, now);
        console.log(`  Claude ueberspringt: ${t.head} (${res.guide.skip_reason})`);
        continue;
      }
      const pair = normalizeGuidePair(res.guide, {
        allowedLinksEn, guideMap,
        now: new Date(now), allowedLinks, independent: t.assessment.independent, communityOnly: t.assessment.communityOnly,
        onlineExploit: !!pre?.online_exploit, sourceCount: items.length, game: pre?.game ?? t.game, category: pre?.category ?? t.category,
      });
      const guide = pair.de;
      const srcStory = { items: items.map((i) => ({ title: i.title, snippet: `${i.snippet ?? ''} ${i.text ?? ''}` })) };
      // Kopierschutz fuer beide Fassungen (die Quellen sind meist englisch)
      const copied = [...copiedPassages(guide.body, srcStory), ...(pair.en ? copiedPassages(pair.en.body, srcStory) : [])];
      if (copied.length) guide.warnings.push(`${copied.length} Stelle(n) mit 8 oder mehr Woertern wie in einer Quelle, bitte umformulieren (z. B. "${copied[0]}")`);
      const sources = sourcesForTopic(items);
      const meta = {
        reason: t.assessment.reason, score: t.assessment.score, keyword: pre?.keyword ?? null, belege: guide.belege,
        promptSources: items.map((i) => ({ name: i.outlet, url: i.link })), topicId: t.id,
      };
      const file = writeGuideDraft(pair, meta, sources, new Date(now));
      rememberTopic(state, t, 'drafted', { title: guide.title, slug: file.slug, game: guide.game, sources: sources.length }, now);
      drafts.push(file);
      console.log(`  ENTWURF: ${guide.title} -> drafts/guides/${file.slug}.md${file.en ? ` + en/${file.en.fileName}` : ' (ohne EN)'}${guide.warnings.length ? ` (Hinweise: ${guide.warnings.join('; ')})` : ''}`);
    } catch (err) {
      console.warn(`  Fehler bei "${t.head}": ${describeError(err)}`);
      if (fatalStatus(err)) { fatal = err; break; }
    }
  }

  // 6. Speichern
  saveRadarState(state);
  console.log(`\nFertig: ${drafts.length} Guide-Entwurf/Entwuerfe. Geschaetzte Claude-Kosten dieses Laufs: ${costUsd.toFixed(4)} USD`);
  setOutput('drafts', drafts.length);
  summary([
    '### Guide-Radar',
    '',
    `${topics.length} Themen: Entwurf moeglich ${count('draft')}, beobachten ${count('watch')}, gibt es schon ${count('exists')}.`,
    ...drafts.map((d) => `- Entwurf (wartet auf Freigabe): ${d.meta.title}`),
    ...watchList.map((t) => `- Beobachten: ${t.head} (${t.note})`),
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
