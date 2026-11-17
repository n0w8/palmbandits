// Selbsttests fuer das Guide-Radar (ohne Netz, ohne API): node --test tests/radar.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import { hasLongDash } from '../lib/util.mjs';
import { detectGame, guideIntent, isGuideCandidate } from '../guide-radar/intent.mjs';
import { assessTopic, clusterTopics, findExistingGuide, guideTokens, loadExistingGuides, makeIdf } from '../guide-radar/topics.mjs';
import { draftsToday, emptyState, findSimilarTopic, isBlockedItem, pruneRadarState, rememberTopic } from '../guide-radar/state.mjs';
import { allowedInternalLinks, buildGuideMarkdown, filterLinks, fixDescription, normalizeGuide, sourcesForTopic } from '../guide-radar/output.mjs';
import { cleanText, extractArticleText, parseRadarFeed } from '../guide-radar/fetch.mjs';
import { buildPrBody } from '../guide-radar/pr.mjs';

const NOW = new Date('2026-11-17T12:00:00Z').getTime();
const iso = (hoursAgo) => new Date(NOW - hoursAgo * 3_600_000).toISOString();
const intentOf = (title, extra = {}) => guideIntent({ title, snippet: '', ...extra });

test('Guide-Absicht: Anleitungen, Fundorte, Geld, Easter Eggs (deutsch und englisch)', () => {
  for (const t of [
    'GTA Online: Fastest way to make money solo after the new update',
    'GTA 6: All 50 collectible locations in Vice City',
    'GTA 6 Fundorte: So findest du alle versteckten Sammelobjekte',
    'GTA 5 easter egg: hidden UFO found on Mount Chiliad',
    'GTA 6 Geld verdienen: Die besten Methoden für Anfänger',
    'How to unlock the secret car in GTA 6',
  ]) {
    const i = intentOf(t);
    assert.ok(isGuideCandidate(i), `${t} -> ${JSON.stringify(i)}`);
  }
});

test('Guide-Absicht: reine News, Deals und Reddit-Fragen fallen raus', () => {
  for (const t of [
    'GTA 6 Could Make $2 Billion This Week, 15 Million Pre-Orders Already',
    'GTA 6 pre-load is now available: How to free up 212GB of space on your PS5',
    'Rockstar releases new GTA 6 trailer',
    'Guide: GTA 6 Release Times: When Can You Start Playing?',
    'The DualSense Edge is taking a very rare discount as GTA 6 downloads',
    'GTA 6 sales numbers revealed',
  ]) {
    assert.equal(isGuideCandidate(intentOf(t)), false, t);
  }
  const q = intentOf('Where do I find the hidden car?', { type: 'reddit' });
  const s = intentOf('Where do I find the hidden car?', { type: 'outlet' });
  assert.equal(q.question, true);
  assert.ok(q.raw < s.raw, 'Reddit-Frage zaehlt nur halb');
});

test('Spiel-Erkennung', () => {
  assert.equal(detectGame('GTA 6 money glitch'), 'gta-6');
  assert.equal(detectGame('GTA VI: Leonida secrets'), 'gta-6');
  assert.equal(detectGame('Best business in GTA Online'), 'gta-online');
  assert.equal(detectGame('GTA 5 Online: Cayo Perico solo'), 'gta-online');
  assert.equal(detectGame('GTA V easter eggs'), 'gta-5');
  assert.equal(detectGame('San Andreas myths'), 'gta-san-andreas');
  assert.equal(detectGame('Random title', 'gta-online'), 'gta-online');
});

const item = (id, title, over = {}) => {
  const it = { id, title, link: `https://example.com/${id}`, outlet: 'X', domain: 'example.com', tier: 'B', type: 'outlet', text: 'x'.repeat(500), snippet: '', published: iso(2), ...over };
  it.intent = guideIntent(it);
  it.tokens = guideTokens(title);
  return it;
};

test('Bewertung: Nur-Reddit beobachten, zwei Quellen oder A-Medium als Entwurf', () => {
  const reddit = item('r1', 'Found a hidden UFO location in GTA 6', { type: 'reddit', tier: 'rumor', outlet: 'Reddit r/GTA6', domain: 'reddit.com', text: 'y'.repeat(300) });
  const reddit2 = item('r2', 'Hidden UFO location GTA 6 confirmed', { type: 'reddit', tier: 'rumor', outlet: 'Reddit r/GTA', domain: 'reddit.com', text: 'y'.repeat(300) });
  assert.equal(assessTopic({ items: [reddit, reddit2] }, NOW).decision, 'watch', 'zwei Subreddits bleiben eine Quelle');
  const yt = item('y1', 'GTA 6 hidden UFO location guide', { type: 'youtube', outlet: 'YouTube: TGG', domain: 'youtube.com', text: 'z'.repeat(300) });
  const two = assessTopic({ items: [reddit, yt] }, NOW);
  assert.equal(two.decision, 'draft');
  assert.equal(two.independent, 2);
  const strongA = item('a1', 'GTA 6: All UFO locations and how to unlock the secret reward', { tier: 'A', domain: 'ign.com', outlet: 'IGN' });
  assert.equal(assessTopic({ items: [strongA] }, NOW).decision, 'draft');
  const weakA = item('a2', 'GTA 6 tricks for launch night', { tier: 'A', domain: 'gamestar.de', outlet: 'GameStar' });
  assert.equal(assessTopic({ items: [weakA] }, NOW).decision, 'watch', 'eine Quelle mit schwachem Signal');
  const headlinesOnly = [
    item('g1', 'GTA 6 UFO location guide', { aggregator: true, text: '', link: 'https://news.google.com/rss/articles/a', domain: 'site1.com', outlet: 'Site1' }),
    item('g2', 'GTA 6 UFO location explained', { aggregator: true, text: '', link: 'https://news.google.com/rss/articles/b', domain: 'site2.com', outlet: 'Site2' }),
  ];
  assert.equal(assessTopic({ items: headlinesOnly }, NOW).decision, 'watch', 'ohne Quelltext kein Entwurf');
  const unknown = [item('c1', 'GTA 6 UFO location guide', { tier: 'C', domain: 'spam1.com' }), item('c2', 'GTA 6 UFO location tips', { tier: 'C', domain: 'spam2.com' })];
  assert.equal(assessTopic({ items: unknown }, NOW).decision, 'watch', 'nur unbekannte Seiten');
  const fresh = assessTopic({ items: [reddit, yt] }, NOW);
  const old = assessTopic({ items: [{ ...reddit, published: iso(70) }, { ...yt, published: iso(70) }] }, NOW);
  assert.ok(fresh.score > old.score, 'neuer = mehr Punkte');
});

test('Clustering: gleiche Entdeckung zusammen, verschiedene Spiele getrennt', () => {
  const a = { ...item('1', 'GTA 6 hidden UFO location found near Mount Kalaga'), game: 'gta-6' };
  const b = { ...item('2', 'Hidden UFO location in GTA 6 near Mount Kalaga explained'), game: 'gta-6' };
  const c = { ...item('3', 'GTA Online hidden UFO location near Mount Kalaga'), game: 'gta-online' };
  const d = { ...item('4', 'GTA 6 fastest money method solo'), game: 'gta-6' };
  const w = makeIdf([a, b, c, d].map((i) => i.tokens));
  const topics = clusterTopics([a, b, c, d], w);
  assert.equal(topics.length, 3);
  assert.equal(topics.find((t) => t.items.some((i) => i.id === '1')).items.length, 2);
});

test('Dedupe gegen vorhandene Guides der Seite (Titel-Aehnlichkeit, gleiches Spiel)', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'radar-guides-'));
  try {
    writeFileSync(path.join(dir, 'gta-online-geld-verdienen.md'), '---\ntitle: "GTA Online Geld verdienen: Die besten Methoden"\ngame: gta-online\ncategory: geld\n---\nText');
    writeFileSync(path.join(dir, 'gta-5-geheime-orte-easter-eggs.md'), '---\ntitle: "GTA 5 geheime Orte und Easter Eggs"\ngame: gta-5\ncategory: easter-eggs\n---\nText');
    const guides = loadExistingGuides(dir);
    assert.equal(guides.length, 2);
    const money = { game: 'gta-online', items: [item('m', 'GTA Online: best money methods to earn fast')] };
    const eggs = { game: 'gta-5', items: [item('e', 'GTA 5 secret locations and easter eggs you missed')] };
    const eggs6 = { game: 'gta-6', items: [item('e6', 'GTA 6 secret locations and easter eggs you missed')] };
    const other = { game: 'gta-online', items: [item('o', 'GTA Online new hangar business tips')] };
    const w = makeIdf([...guides.map((g) => g.tokens), ...[money, eggs, eggs6, other].map((t) => t.items[0].tokens)]);
    assert.equal(findExistingGuide(money, guides, w)?.guide.slug, 'gta-online-geld-verdienen');
    assert.equal(findExistingGuide(eggs, guides, w)?.guide.slug, 'gta-5-geheime-orte-easter-eggs');
    assert.equal(findExistingGuide(eggs6, guides, w), null, 'anderes Spiel ist kein Duplikat');
    assert.equal(findExistingGuide(other, guides, w), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Gedaechtnis: verwertete Meldungen gesperrt, aehnliche Themen erkannt, 30 Tage aufgeraeumt', () => {
  const state = emptyState();
  const t = { id: 't1', game: 'gta-6', items: [item('i1', 'GTA 6 hidden UFO location guide')] };
  rememberTopic(state, t, 'drafted', { title: 'GTA 6: Versteckter UFO-Fundort', slug: 'gta-6-ufo-fundort', game: 'gta-6' }, NOW);
  assert.equal(isBlockedItem(state, { id: 'i1' }), true);
  assert.equal(isBlockedItem(state, { id: 'i2' }), false);
  assert.equal(draftsToday(state, new Date(NOW)), 1);
  const again = { game: 'gta-6', items: [item('i3', 'GTA 6 UFO Fundort versteckt')] };
  const w = makeIdf([...t.items, ...again.items].map((i) => i.tokens));
  assert.equal(findSimilarTopic(again, state, w, NOW)?.slug, 'gta-6-ufo-fundort');
  pruneRadarState(state, NOW + 31 * 86_400_000);
  assert.equal(Object.keys(state.items).length, 0);
  assert.equal(state.topics.length, 0);
  assert.equal(state.log.length, 0);
});

const rawGuide = {
  skip: false, skip_reason: '',
  title: 'GTA 6 UFO – Fundort und Belohnung',
  slug: 'GTA 6 UFO Fundort!',
  description: 'Kurz.',
  game: 'gta-6', category: 'easter-eggs',
  tags: ['GTA 6', 'GTA 6', 'UFO', 'Easter Egg'],
  difficulty: 'keine',
  faq: [{ q: 'Wo ist das UFO in GTA 6?', a: 'Laut Community-Berichten nachts über einem Berg.' }, { q: 'Gibt es eine Belohnung?', a: 'Das ist noch unklar.' }],
  body: '# Falsch\n\nDas UFO in GTA 6 – laut Community-Berichten ein neues Easter Egg. Mehr im [Spiele-Hub](/spiele/gta-6) und bei [IGN](https://ign.com/x).\n\n## Wo du es findest\n\nText.',
  belege: [{ fakt: 'UFO erscheint nachts', quellen: [1, 9] }],
};

test('Guide wird repariert und als Frontmatter nach dem Guide-Schema geschrieben', () => {
  const now = new Date('2026-11-20T08:30:00Z');
  const links = allowedInternalLinks([{ slug: 'gta-6-launch-checkliste' }], ['gta-5']);
  const g = normalizeGuide(rawGuide, { now, allowedLinks: links, independent: 1, communityOnly: true, sourceCount: 2 });
  assert.equal(g.title, 'GTA 6 UFO, Fundort und Belohnung');
  assert.equal(g.slug, 'gta-6-ufo-fundort');
  assert.ok(g.description.length >= 120 && g.description.length <= 160, `Laenge ${g.description.length}`);
  assert.equal(g.difficulty, undefined);
  assert.deepEqual(g.tags, ['GTA 6', 'UFO', 'Easter Egg']);
  assert.ok(!g.body.startsWith('#'));
  assert.match(g.body, /\[Spiele-Hub\]\(\/spiele\/gta-6\/\)/);
  assert.ok(!g.body.includes('ign.com'), 'externer Link entfernt');
  assert.match(g.body, /\*\*Stand: 20\. November 2026\.\*\*/);
  assert.match(g.body, /## Was noch unklar ist/);
  assert.deepEqual(g.belege[0].quellen, [1]);
  for (const s of [g.title, g.description, g.body, ...g.tags, ...g.faq.flatMap((f) => [f.q, f.a])]) assert.equal(hasLongDash(s), false, s);

  const items = [
    { type: 'reddit', tier: 'rumor', outlet: 'Reddit r/GTA6', link: 'https://www.reddit.com/r/GTA6/comments/a', domain: 'reddit.com' },
    { type: 'outlet', tier: 'A', outlet: 'IGN', link: 'https://www.ign.com/a', domain: 'ign.com' },
    { type: 'outlet', tier: 'A', outlet: 'IGN', link: 'https://www.ign.com/b', domain: 'ign.com' },
  ];
  const sources = sourcesForTopic(items);
  assert.deepEqual(sources.map((s) => s.name), ['IGN', 'Reddit r/GTA6']);
  const md = buildGuideMarkdown(g, sources, now);
  assert.match(md, /^---\ntitle: "GTA 6 UFO, Fundort und Belohnung"\ndescription: ".+"\npubDate: 2026-11-20T09:30:00\+01:00\ngame: "gta-6"\ncategory: "easter-eggs"\ntags:\n {2}- "GTA 6"/);
  assert.match(md, /featured: false\nfaq:\n {2}- q: "Wo ist das UFO in GTA 6\?"\n {4}a: "/);
  assert.match(md, /sources:\n {2}- name: "IGN"\n {4}url: "https:\/\/www.ign.com\/a"\n {2}- name: "Reddit r\/GTA6"/);
  assert.match(md, /bot: true\nauthor: "Palm Bandits Guide-Radar"\n---\n/);
  assert.ok(!/difficulty:/.test(md), 'keine Schwierigkeit wenn "keine"');
  // Mit gray-matter lesen wie die Seite und gegen die Schema-Regeln pruefen
  const { data } = matter(md);
  assert.equal(data.game, 'gta-6');
  assert.equal(data.category, 'easter-eggs');
  assert.equal(data.featured, false);
  assert.equal(data.bot, true);
  assert.ok(data.pubDate instanceof Date && !Number.isNaN(data.pubDate.getTime()));
  assert.ok(data.faq.length >= 2 && data.faq.length <= 4);
  assert.ok(data.sources.every((s) => s.name && /^https:\/\//.test(s.url)));
});

test('Exploit-Schutz: nummerierte Schritte in GTA-Online-Glitch-Guides werden gemeldet', () => {
  const g = normalizeGuide({ ...rawGuide, game: 'gta-online', category: 'glitches', body: 'Einstieg.\n\n## So geht es\n\n1. Mach dies\n2. Mach das' }, { independent: 2 });
  assert.equal(g.exploitRisk, true);
  assert.ok(g.warnings.some((w) => w.startsWith('EXPLOIT-PRUEFUNG')));
  const story = normalizeGuide({ ...rawGuide, game: 'gta-5', category: 'glitches', body: 'Einstieg.\n\n## So geht es\n\n1. Mach dies' }, { independent: 2 });
  assert.equal(story.exploitRisk, false);
});

test('Beschreibung und Links', () => {
  const d = fixDescription('Alle Fundorte der versteckten Sammelobjekte in GTA 6.', 'GTA 6 Sammelobjekte');
  assert.ok(d.length >= 120 && d.length <= 160, `${d.length}: ${d}`);
  const r = filterLinks('Siehe [Cheats](/cheats/gta-5) und [Fake](/gibt-es-nicht/).', ['/cheats/gta-5/']);
  assert.equal(r.body, 'Siehe [Cheats](/cheats/gta-5/) und Fake.');
  assert.deepEqual(r.removed, ['/gibt-es-nicht/']);
});

test('Feeds: Reddit ohne Nutzernamen, YouTube-Beschreibung, Artikeltext', () => {
  const reddit = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<entry><author><name>/u/someone</name></author><category term="gtaonline" label="r/gtaonline"/>
<content type="html">&lt;div class="md"&gt;&lt;p&gt;Found a hidden spot behind the casino where cash spawns every day.&lt;/p&gt;&lt;/div&gt; submitted by &lt;a href="https://www.reddit.com/user/someone"&gt; /u/someone &lt;/a&gt; to r/gtaonline [link] [comments]</content>
<link href="https://www.reddit.com/r/gtaonline/comments/abc/hidden_spot/"/><published>2026-11-17T10:00:00+00:00</published><title>Hidden cash spot behind the casino</title></entry></feed>`;
  const cfg = { outletTiers: {}, subredditGames: { gtaonline: 'gta-online' } };
  const [r] = parseRadarFeed(reddit, { name: 'Reddit', type: 'reddit', tier: 'rumor', lang: 'en', gtaOnly: true }, cfg);
  assert.equal(r.outlet, 'Reddit r/gtaonline');
  assert.equal(r.gameHint, 'gta-online');
  assert.match(r.text, /cash spawns every day/);
  assert.ok(!/someone/.test(r.text + r.snippet), 'kein Nutzername');

  const yt = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<entry><title>GTA 6 money guide</title><link rel="alternate" href="https://www.youtube.com/watch?v=x1"/><published>2026-11-17T10:00:00+00:00</published>
<media:group><media:title>GTA 6 money guide</media:title><media:description>Three ways to earn money fast. ►My Twitter: https://x.com/me</media:description></media:group></entry></feed>`;
  const [v] = parseRadarFeed(yt, { name: 'YT', type: 'youtube', tier: 'B', lang: 'en', outletName: 'YouTube: Test' }, cfg);
  assert.equal(v.outlet, 'YouTube: Test');
  assert.equal(v.text, 'Three ways to earn money fast.');

  const html = '<html><nav><p>Menu menu menu menu menu menu menu</p></nav><article><h2>Where to find it</h2><p>The UFO appears above the mountain at night after the story ends.</p><p>Subscribe to our newsletter</p><li>Bring a helicopter</li></article></html>';
  assert.equal(extractArticleText(html), '## Where to find it\nThe UFO appears above the mountain at night after the story ends.\n- Bring a helicopter');
  assert.equal(cleanText('Text submitted by /u/abc to r/GTA6 [link] [comments]'), 'Text');
});

test('Pull-Request-Text: Belege, Quellen und Checkliste', () => {
  const body = buildPrBody({
    title: 'GTA 6: UFO-Fundort', reason: '2 unabhaengige Quellen (IGN, Reddit r/GTA6)', score: 18, game: 'gta-6', category: 'easter-eggs', keyword: 'gta 6 ufo',
    warnings: ['Text kurz (180 Woerter)'], exploitRisk: true, url: 'https://palmbandits.com/guides/gta-6-ufo/',
    belege: [{ fakt: 'UFO erscheint nachts', quellen: [1, 2] }, { fakt: 'Ohne Beleg', quellen: [] }],
    promptSources: [{ name: 'IGN', url: 'https://ign.com/a' }, { name: 'Reddit r/GTA6', url: 'https://reddit.com/b' }],
  });
  assert.match(body, /- \[ \] Fakten mit Quellen verglichen/);
  assert.match(body, /- \[ \] Keine Exploit-Anleitung/);
  assert.match(body, /UFO erscheint nachts \(\[1\] IGN, \[2\] Reddit r\/GTA6\)/);
  assert.match(body, /OHNE QUELLE/);
  assert.match(body, /1\. \[IGN\]\(https:\/\/ign.com\/a\)/);
  assert.match(body, /Achtung, Glitch in GTA Online/);
  assert.equal(hasLongDash(body), false);
});
