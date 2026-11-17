// Zweisprachigkeit (DE/EN) ohne Netz und ohne API: beide Dateien, Frontmatter, translationOf,
// Zuordnung in en-slugs.json und Pull Requests, die beide Fassungen mitnehmen.
// Alle Ausgabe-Ordner zeigen auf einen Temp-Ordner (per Umgebungsvariable, VOR dem Import gesetzt).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import Anthropic from '@anthropic-ai/sdk';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'bilingual-'));
const D = {
  news: path.join(TMP, 'src', 'content', 'news'),
  enNews: path.join(TMP, 'src', 'content', 'en', 'news'),
  drafts: path.join(TMP, 'drafts', 'news'),
  enDrafts: path.join(TMP, 'drafts', 'news', 'en'),
  guides: path.join(TMP, 'src', 'content', 'guides'),
  enGuides: path.join(TMP, 'src', 'content', 'en', 'guides'),
  guideDrafts: path.join(TMP, 'drafts', 'guides'),
  enGuideDrafts: path.join(TMP, 'drafts', 'guides', 'en'),
  slugs: path.join(TMP, 'src', 'data', 'en-slugs.json'),
};
Object.assign(process.env, {
  NEWS_OUT_DIR: D.news, EN_NEWS_OUT_DIR: D.enNews, DRAFTS_OUT_DIR: D.drafts, EN_DRAFTS_OUT_DIR: D.enDrafts,
  GUIDES_OUT_DIR: D.guides, EN_GUIDES_OUT_DIR: D.enGuides, GUIDE_DRAFTS_DIR: D.guideDrafts, EN_GUIDE_DRAFTS_DIR: D.enGuideDrafts,
  EN_SLUGS_FILE: D.slugs, SITE_URL: 'https://palmbandits.com',
});
// Sicherheitsnetz: in diesen Tests darf nichts ins Netz (kein Discord, keine API)
globalThis.fetch = async () => { throw new Error('Netzwerk ist in Tests verboten'); };

const { hasLongDash } = await import('../lib/util.mjs');
const { addEnSlug, readEnSlugs, localizeLinksEn, toEnPath, enGuideMap } = await import('../lib/i18n.mjs');
const { setClientForTests, writeArticle } = await import('../news-bot/writer.mjs');
const { copiedPassagesPair, normalizeArticlePair, writeArticleFiles } = await import('../news-bot/output.mjs');
const { openNewsPrs, buildNewsPrBody } = await import('../news-bot/open-prs.mjs');
const { allowedInternalLinks, allowedInternalLinksEn, normalizeGuidePair, writeGuideDraft } = await import('../guide-radar/output.mjs');
const { openGuidePrs } = await import('../guide-radar/open-prs.mjs');
const { buildPrBody } = await import('../guide-radar/pr.mjs');

after(() => rmSync(TMP, { recursive: true, force: true }));

const NOW = new Date('2026-11-17T08:30:00Z');
const words = (n, w) => Array.from({ length: n }, (_, i) => `${w}${i % 7}`).join(' ');
const story = {
  id: 's1',
  items: [
    { title: 'GTA 6 gets second patch before launch', outlet: 'IGN', tier: 'A', lang: 'en', domain: 'ign.com', snippet: 'Rockstar has confirmed that the second patch will be released before launch on all platforms', link: 'https://ign.com/a', published: '2026-11-17T08:00:00Z' },
    { title: 'GTA 6: Zweites Update vor dem Release', outlet: 'GameStar', tier: 'A', lang: 'de', domain: 'gamestar.de', snippet: '', link: 'https://gamestar.de/b', published: '2026-11-17T08:10:00Z' },
  ],
};
const rawArticle = (over = {}) => ({
  skip: false, skip_reason: '', game: 'gta-6', rumor: false, hype: 4, breaking: true,
  de: {
    title: 'GTA 6 – zweites Update vor dem Release', slug: 'gta-6-zweites-update-vor-release',
    description: 'Rockstar bringt vor dem Start von GTA 6 ein zweites Update, hier sind die bestätigten Fakten und was das für dich vor dem Release heißt.',
    tags: ['GTA 6', 'Update', 'Patch'], body: `Rockstar bestaetigt ein zweites Update.\n\n## Das ist bekannt\n\n${words(200, 'wort')}`,
  },
  en: {
    title: 'GTA 6 second patch arrives before launch — what changes', slug: 'gta-6-second-patch-before-launch',
    description: 'Rockstar is shipping a second GTA 6 patch before launch. Here are the confirmed facts and what the update means for you on day one.',
    tags: ['GTA 6', 'Patch', 'Update'], body: `Rockstar confirmed a second update.\n\n## What we know\n\nSee [the hub](/spiele/gta-6/) and [cheats](/cheats/gta-5).\n\n${words(200, 'word')}`,
  },
  ...over,
});

function fakeClient(obj) {
  const fetch = async () => new Response(JSON.stringify({
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5',
    content: [{ type: 'text', text: JSON.stringify(obj) }], stop_reason: 'end_turn', stop_sequence: null, stop_details: null,
    usage: { input_tokens: 2500, output_tokens: 3800, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  }), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  return new Anthropic({ apiKey: 'test-key', fetch, maxRetries: 0 });
}

function fakeExec() {
  const calls = [];
  const exec = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (cmd === 'gh' && args[0] === 'pr') return 'https://github.com/test/repo/pull/7';
    return '';
  };
  return { exec, calls };
}

test('i18n: Pfade nach /en/ und Links im englischen Text', () => {
  const guides = new Map([['gta-6-launch-checkliste', 'gta-6-launch-checklist']]);
  assert.equal(toEnPath('/spiele/gta-6/'), '/en/games/gta-6/');
  assert.equal(toEnPath('/cheats/gta-5/'), '/en/cheats/gta-5/');
  assert.equal(toEnPath('/guides/kategorie/geld/'), '/en/guides/category/money/');
  assert.equal(toEnPath('/guides/kategorie/unbekannt/'), '/en/guides/');
  assert.equal(toEnPath('/guides/gta-6-launch-checkliste/', { guides }), '/en/guides/gta-6-launch-checklist/');
  assert.equal(toEnPath('/guides/ohne-englisch/', { guides }), null);
  assert.equal(toEnPath('/news/'), '/en/news/');
  const body = localizeLinksEn('A [hub](/spiele/gta-6) B [g](/guides/gta-6-launch-checkliste/) C [x](/guides/ohne-englisch/) D [ext](https://ign.com/x)', { guides });
  assert.equal(body, 'A [hub](/en/games/gta-6/) B [g](/en/guides/gta-6-launch-checklist/) C x D [ext](https://ign.com/x)');
});

test('en-slugs.json: anlegen, zusammenfuehren ohne Verlust, kaputte Datei nicht ueberschreiben', () => {
  const file = path.join(TMP, 'slugs-merge.json');
  assert.deepEqual(readEnSlugs(file), { news: {}, guides: {} }, 'fehlende Datei = leer');
  assert.equal(addEnSlug('news', 'a-de', 'a-en', file), true);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { news: { 'a-de': 'a-en' }, guides: {} });
  // Datei eines anderen Agenten mit eigenen Eintraegen und Zusatz-Schluessel
  writeFileSync(file, '﻿' + JSON.stringify({ news: { 'x-de': 'x-en' }, guides: { 'g-de': 'g-en' }, games: { 'gta-6': 'gta-6' } }), 'utf8');
  assert.equal(addEnSlug('guides', 'h-de', 'h-en', file), true);
  assert.equal(addEnSlug('guides', 'h-de', 'h-en', file), false, 'gleicher Eintrag schreibt nicht neu');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(data, { news: { 'x-de': 'x-en' }, guides: { 'g-de': 'g-en', 'h-de': 'h-en' }, games: { 'gta-6': 'gta-6' } });
  writeFileSync(file, '{ kaputt', 'utf8');
  assert.equal(addEnSlug('news', 'b-de', 'b-en', file), false);
  assert.equal(readFileSync(file, 'utf8'), '{ kaputt', 'kaputte Datei bleibt unangetastet');
});

test('News gruen: ein Claude-Aufruf -> deutsche und englische Datei mit passendem Frontmatter', async () => {
  setClientForTests(fakeClient(rawArticle()));
  const res = await writeArticle(story, { color: 'green', reason: '2 A-Medien' }, [], NOW);
  assert.equal(res.ok, true);
  const pair = normalizeArticlePair(res.article);
  assert.equal(pair.de.slug, 'gta-6-zweites-update-vor-release');
  assert.equal(pair.en.slug, 'gta-6-second-patch-before-launch');
  for (const a of [pair.de, pair.en]) {
    for (const s of [a.title, a.description, a.body, ...a.tags]) assert.equal(hasLongDash(s), false, s);
    assert.ok(a.description.length >= 120 && a.description.length <= 160, `${a.lang} Beschreibung ${a.description.length}`);
  }
  assert.match(pair.en.body, /\[the hub\]\(\/en\/games\/gta-6\/\)/, 'interne Links zeigen auf /en/');
  assert.match(pair.en.body, /\[cheats\]\(\/en\/cheats\/gta-5\/\)/);

  const file = writeArticleFiles(pair, story, { color: 'green', reason: 'test' }, NOW);
  assert.equal(file.slug, '2026-11-17-gta-6-zweites-update-vor-release');
  assert.equal(file.url, 'https://palmbandits.com/news/2026-11-17-gta-6-zweites-update-vor-release/');
  assert.equal(file.en.slug, '2026-11-17-gta-6-second-patch-before-launch');
  assert.equal(file.en.url, 'https://palmbandits.com/en/news/2026-11-17-gta-6-second-patch-before-launch/');

  const de = matter(readFileSync(path.join(D.news, file.fileName), 'utf8'));
  const en = matter(readFileSync(path.join(D.enNews, file.en.fileName), 'utf8'));
  assert.equal(de.data.translationOf, undefined, 'deutsche Fassung ohne translationOf');
  assert.equal(en.data.translationOf, '2026-11-17-gta-6-zweites-update-vor-release');
  assert.equal(en.data.author, 'Palm Bandits Newsdesk');
  assert.equal(en.data.title, 'GTA 6 second patch arrives before launch, what changes');
  assert.deepEqual(en.data.tags, ['GTA 6', 'Patch', 'Update']);
  // gleiche gemeinsame Felder wie die deutsche Fassung
  for (const k of ['game', 'bot', 'breaking', 'rumor', 'hype', 'sources']) assert.deepEqual(en.data[k], de.data[k], k);
  assert.equal(en.data.pubDate.getTime(), de.data.pubDate.getTime());
  assert.deepEqual(Object.keys(en.data).filter((k) => k !== 'translationOf'), Object.keys(de.data), 'gleiche Felder wie Deutsch');

  assert.deepEqual(readEnSlugs(D.slugs).news, { '2026-11-17-gta-6-zweites-update-vor-release': '2026-11-17-gta-6-second-patch-before-launch' });
  assert.ok(!existsSync(D.drafts), 'gruen schreibt keine Entwuerfe');
});

test('News: fehlende englische Fassung -> nur Deutsch, Hinweis, keine Zuordnung', () => {
  const pair = normalizeArticlePair(rawArticle({ en: { title: '', slug: '', description: '', tags: [], body: '' } }));
  assert.equal(pair.en, null);
  assert.ok(pair.de.warnings.some((w) => /Englische Fassung fehlt/.test(w)));
  const before = JSON.stringify(readEnSlugs(D.slugs));
  const file = writeArticleFiles({ ...pair, de: { ...pair.de, slug: 'nur-deutsch' } }, story, { color: 'green', reason: 'x' }, NOW);
  assert.equal(file.en, null);
  assert.ok(existsSync(path.join(D.news, '2026-11-17-nur-deutsch.md')));
  assert.equal(JSON.stringify(readEnSlugs(D.slugs)), before);
});

test('News: Kopierschutz prueft auch die englische Fassung', () => {
  const raw = rawArticle();
  raw.en.body = `Per IGN, Rockstar has confirmed that the second patch will be released before launch.\n\n${words(160, 'word')}`;
  const pair = normalizeArticlePair(raw);
  assert.ok(copiedPassagesPair(pair, story).length > 0);
});

test('News gelb: beide Fassungen als Entwurf, EIN Pull Request nimmt beide mit', async () => {
  const raw = rawArticle();
  raw.de.slug = 'gta-6-patch-entwurf';
  raw.en.slug = 'gta-6-patch-draft';
  const pair = normalizeArticlePair(raw);
  const file = writeArticleFiles(pair, story, { color: 'yellow', reason: '1 A-Medium' }, NOW);
  assert.ok(existsSync(path.join(D.drafts, file.fileName)));
  assert.ok(existsSync(path.join(D.enDrafts, file.en.fileName)));
  const meta = JSON.parse(readFileSync(path.join(D.drafts, file.fileName.replace(/\.md$/, '.json')), 'utf8'));
  assert.equal(meta.en.fileName, '2026-11-17-gta-6-patch-draft.md');
  assert.equal(meta.en.url, 'https://palmbandits.com/en/news/2026-11-17-gta-6-patch-draft/');
  assert.equal(readEnSlugs(D.slugs).news['2026-11-17-gta-6-patch-entwurf'], '2026-11-17-gta-6-patch-draft');
  assert.match(buildNewsPrBody(meta), /Zweisprachig/);
  assert.match(buildNewsPrBody(meta), /Englisch: https:\/\/palmbandits\.com\/en\/news\/2026-11-17-gta-6-patch-draft\//);

  const { exec, calls } = fakeExec();
  const notes = [];
  await openNewsPrs({ exec, notify: async (n) => notes.push(n), force: true, base: 'main' });
  assert.equal(process.exitCode ?? 0, 0);
  const adds = calls.filter((c) => c[0] === 'git' && c[1] === 'add').map((c) => c[2]);
  assert.equal(adds.length, 2, 'deutsche und englische Datei im selben Commit');
  assert.ok(adds[0].endsWith('src/content/news/2026-11-17-gta-6-patch-entwurf.md'), adds[0]);
  assert.ok(adds[1].endsWith('src/content/en/news/2026-11-17-gta-6-patch-draft.md'), adds[1]);
  assert.equal(calls.filter((c) => c[0] === 'gh' && c[1] === 'pr').length, 1, 'genau ein Pull Request');
  assert.ok(calls.some((c) => c[0] === 'git' && c[1] === 'commit' && /\(DE \+ EN\)/.test(c[3])));
  assert.ok(existsSync(path.join(D.news, '2026-11-17-gta-6-patch-entwurf.md')));
  assert.ok(existsSync(path.join(D.enNews, '2026-11-17-gta-6-patch-draft.md')));
  assert.deepEqual(readdirSync(D.drafts).filter((f) => f.endsWith('.md') || f.endsWith('.json')), [], 'Entwuerfe aufgeraeumt');
  assert.deepEqual(readdirSync(D.enDrafts), []);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].channel, 'staff');
});

const rawGuide = {
  skip: false, skip_reason: '', game: 'gta-6', category: 'easter-eggs', difficulty: 'leicht',
  de: {
    title: 'GTA 6 UFO: Fundort des versteckten Easter Eggs', slug: 'gta-6-ufo-fundort',
    description: 'Wo du das UFO in GTA 6 findest: Fundort, Uhrzeit und was die Community bisher über das versteckte Easter Egg weiß, mit Quellen.',
    tags: ['GTA 6', 'UFO', 'Easter Egg'],
    faq: [{ q: 'Wo ist das UFO in GTA 6?', a: 'Laut Community-Berichten nachts über einem Berg.' }, { q: 'Gibt es eine Belohnung?', a: 'Das ist noch unklar.' }],
    body: `Das UFO in GTA 6 ist laut Community-Berichten ein neues Easter Egg. Mehr im [Spiele-Hub](/spiele/gta-6/).\n\n**Stand: 20. November 2026.**\n\n## Wo du es findest\n\n${words(220, 'wort')}`,
  },
  en: {
    title: 'GTA 6 UFO location: where to find the hidden easter egg', slug: 'gta-6-ufo-location',
    description: 'Where to find the UFO in GTA 6: location, time of day and what the community knows so far about the hidden easter egg, with sources.',
    tags: ['GTA 6', 'UFO', 'Easter Egg'],
    faq: [{ q: 'Where is the UFO in GTA 6?', a: 'According to community reports, above a mountain at night.' }, { q: 'Is there a reward?', a: 'That is still unclear.' }],
    body: `According to community reports, the UFO is a new GTA 6 easter egg. More in the [game hub](/spiele/gta-6/) and the [launch checklist](/guides/gta-6-launch-checkliste/) and [old guide](/guides/ohne-englisch/).\n\n## Where to find it\n\n${words(220, 'word')}`,
  },
  belege: [{ fakt: 'UFO erscheint nachts', quellen: [1] }],
};

test('Guide: zwei Fassungen, englische Links, Stand-Zeile, Entwuerfe, en-slugs und EIN Pull Request', async () => {
  mkdirSync(D.enGuides, { recursive: true });
  writeFileSync(path.join(D.enGuides, 'gta-6-launch-checklist.md'), '---\ntitle: "x"\n---\nx', 'utf8');
  addEnSlug('guides', 'gta-6-launch-checkliste', 'gta-6-launch-checklist', D.slugs);
  addEnSlug('guides', 'ohne-englisch', 'gibt-es-nicht', D.slugs); // Eintrag ohne englische Datei zaehlt nicht
  const guideMap = enGuideMap(D.slugs, D.enGuides);
  assert.deepEqual([...guideMap], [['gta-6-launch-checkliste', 'gta-6-launch-checklist']]);
  const now = new Date('2026-11-20T08:30:00Z');
  const ctx = {
    now, independent: 1, communityOnly: true, sourceCount: 2,
    allowedLinks: allowedInternalLinks([{ slug: 'gta-6-launch-checkliste' }], ['gta-5']),
    allowedLinksEn: allowedInternalLinksEn([...guideMap.values()], ['gta-5']),
    guideMap,
  };
  const { de, en } = normalizeGuidePair(rawGuide, ctx);
  assert.equal(de.slug, 'gta-6-ufo-fundort');
  assert.equal(en.slug, 'gta-6-ufo-location');
  assert.equal(en.category, 'easter-eggs', 'Kategorie bleibt der deutsche Wert');
  assert.equal(en.difficulty, 'leicht', 'Schwierigkeit bleibt der deutsche Wert');
  assert.match(en.body, /\[game hub\]\(\/en\/games\/gta-6\/\)/);
  assert.match(en.body, /\[launch checklist\]\(\/en\/guides\/gta-6-launch-checklist\/\)/);
  assert.ok(!/ohne-englisch|gibt-es-nicht/.test(en.body), 'Link ohne englische Seite wird zu Text');
  assert.match(en.body, /\*\*Last updated: November 20, 2026\.\*\*/);
  assert.match(en.body, /## What is still unclear/);
  assert.ok(!/Stand:/.test(en.body));
  assert.equal(en.belege.length, 0);
  assert.equal(de.belege.length, 1);
  assert.ok(!de.warnings.some((w) => w.startsWith('EN: Nur Community')), 'englische Community-Formulierung erkannt');
  for (const s of [en.title, en.description, en.body, ...en.tags, ...en.faq.flatMap((f) => [f.q, f.a])]) assert.equal(hasLongDash(s), false, s);

  const sources = [{ name: 'IGN', url: 'https://ign.com/ufo' }];
  const meta = { reason: '2 Quellen', score: 12, keyword: 'gta 6 ufo', belege: de.belege, promptSources: sources };
  const file = writeGuideDraft({ de, en }, meta, sources, now);
  assert.equal(file.slug, 'gta-6-ufo-fundort');
  assert.equal(file.en.slug, 'gta-6-ufo-location');
  assert.equal(file.meta.en.url, 'https://palmbandits.com/en/guides/gta-6-ufo-location/');
  const fmDe = matter(readFileSync(path.join(D.guideDrafts, 'gta-6-ufo-fundort.md'), 'utf8')).data;
  const fmEn = matter(readFileSync(path.join(D.enGuideDrafts, 'gta-6-ufo-location.md'), 'utf8')).data;
  assert.equal(fmDe.translationOf, undefined);
  assert.equal(fmEn.translationOf, 'gta-6-ufo-fundort');
  assert.equal(fmEn.author, 'Palm Bandits Guide-Radar');
  for (const k of ['game', 'category', 'difficulty', 'featured', 'bot', 'sources']) assert.deepEqual(fmEn[k], fmDe[k], k);
  assert.equal(fmEn.faq[0].q, 'Where is the UFO in GTA 6?');
  assert.deepEqual(Object.keys(fmEn).filter((k) => k !== 'translationOf'), Object.keys(fmDe));
  assert.equal(readEnSlugs(D.slugs).guides['gta-6-ufo-fundort'], 'gta-6-ufo-location');

  // Ein zweiter Entwurf mit gleichen Slugs (erster PR noch offen) bekommt neue Slugs
  const again = writeGuideDraft({ de, en }, meta, sources, now);
  assert.equal(again.slug, 'gta-6-ufo-fundort-2');
  assert.equal(again.en.slug, 'gta-6-ufo-location-2');
  rmSync(path.join(D.guideDrafts, 'gta-6-ufo-fundort-2.md'));
  rmSync(path.join(D.guideDrafts, 'gta-6-ufo-fundort-2.json'));
  rmSync(path.join(D.enGuideDrafts, 'gta-6-ufo-location-2.md'));

  const body = buildPrBody(file.meta);
  assert.match(body, /Zweisprachig/);
  assert.match(body, /- \[ \] Englische Fassung/);
  assert.match(body, /Englisch: https:\/\/palmbandits\.com\/en\/guides\/gta-6-ufo-location\//);
  assert.equal(hasLongDash(body), false);

  const { exec, calls } = fakeExec();
  await openGuidePrs({ exec, notify: async () => {}, force: true, base: 'main' });
  assert.equal(process.exitCode ?? 0, 0);
  const adds = calls.filter((c) => c[0] === 'git' && c[1] === 'add').map((c) => c[2]);
  assert.deepEqual(adds.map((a) => a.split('/').slice(-3).join('/')), ['content/guides/gta-6-ufo-fundort.md', 'en/guides/gta-6-ufo-location.md']);
  assert.equal(calls.filter((c) => c[0] === 'gh' && c[1] === 'pr').length, 1);
  assert.ok(existsSync(path.join(D.guides, 'gta-6-ufo-fundort.md')));
  assert.ok(existsSync(path.join(D.enGuides, 'gta-6-ufo-location.md')));
  assert.deepEqual(readdirSync(D.enGuideDrafts), []);
});
