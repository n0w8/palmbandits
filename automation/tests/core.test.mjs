// Schnelle Selbsttests ohne Netz und ohne API: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinIso, noLongDashes, slugify, toFrontmatter } from '../lib/util.mjs';
import { ampel, buildIdf, clusterIntoStories, isRelevant, similarity, tokenize } from '../news-bot/analyze.mjs';
import { buildMarkdown, copiedPassages, normalizeArticle } from '../news-bot/output.mjs';
import { selectPins, validatePin, buildPins, orderPins } from '../pinterest/pins.mjs';
import { loadContent } from '../pinterest/content.mjs';
import { parseSequence } from '../pinterest/render.mjs';

test('Berliner Zeit mit Offset (Winter und Sommer)', () => {
  assert.equal(berlinIso(new Date('2026-11-17T08:30:00Z')), '2026-11-17T09:30:00+01:00');
  assert.equal(berlinIso(new Date('2026-07-01T08:30:00Z')), '2026-07-01T10:30:00+02:00');
});

test('Slug und lange Striche', () => {
  assert.equal(slugify('GTA 6: Größter Release – Übersicht & Tipps'), 'gta-6-groesster-release-uebersicht-und-tipps');
  assert.equal(noLongDashes('Release – heute'), 'Release, heute');
  assert.equal(noLongDashes('10–20 Uhr'), '10-20 Uhr');
});

test('GTA-Bezug und Deals', () => {
  assert.equal(isRelevant({ title: 'GTA 6 gets a new patch', snippet: '' }).ok, true);
  assert.equal(isRelevant({ title: 'Best TV deals for GTA 6', snippet: '' }).ok, false);
  assert.equal(isRelevant({ title: 'Red Dead Online bonuses', snippet: '' }).ok, false);
});

test('Cluster: gleiche Story in zwei Sprachen und Woertern', () => {
  const a = tokenize('GTA 6 hacker pleads guilty to all charges');
  const b = tokenize('Hacker behind 2022 GTA VI leaks pleads guilty');
  const c = tokenize('GTA 6 comes to NBA 2K27 with Vice City makeover');
  const w = buildIdf([a, b, c]);
  assert.ok(similarity(a, b, w) >= 0.5);
  assert.equal(similarity(a, c, w), 0);
});

test('Cluster ordnet Meldungen zu', () => {
  const now = Date.now();
  const mk = (id, title, domain, tier) => ({ id, title, domain, tier, outlet: domain, published: new Date(now).toISOString() });
  const items = [
    mk('1', 'GTA 6 hacker pleads guilty to all charges', 'pcgamer.com', 'A'),
    mk('2', 'GTA 6 hacker pleads guilty after costing Rockstar $5 million', 'gamesradar.com', 'A'),
    mk('3', 'Subway reveals GTA 6 sandwich in Miami', 'ign.com', 'A'),
  ];
  const { created } = clusterIntoStories(items, [], items.map((i) => tokenize(i.title)), now);
  assert.equal(created.length, 2);
});

test('Ampel', () => {
  const s = (tiers, titles) => ({ items: tiers.map((t, i) => ({ tier: t, domain: `site${i}.com`, outlet: `S${i}`, title: titles?.[i] ?? 'GTA 6 news' })) });
  assert.equal(ampel(s(['official'])).color, 'green');
  assert.equal(ampel(s(['A', 'A'])).color, 'green');
  assert.equal(ampel(s(['A', 'B'])).color, 'yellow');
  assert.equal(ampel(s(['B', 'B', 'B'])).color, 'yellow');
  assert.equal(ampel(s(['rumor', 'rumor'])).color, 'red');
  assert.equal(ampel(s(['A', 'A'], ['GTA 6 leak shows map', 'Leaked GTA 6 map'])).color, 'yellow');
});

test('Artikel wird repariert und als Frontmatter geschrieben', () => {
  const a = normalizeArticle({
    title: 'GTA 6 – Patch ist da', slug: 'GTA 6 Patch!', description: 'Kurz.', game: 'gta-6', tags: ['GTA 6', 'GTA 6', 'Patch'],
    body: '# Falsch\n\nText – mit Strich.', rumor: false, hype: 9, breaking: false,
  });
  assert.equal(a.title, 'GTA 6, Patch ist da');
  assert.equal(a.slug, 'gta-6-patch');
  assert.ok(a.description.length >= 120 && a.description.length <= 160, `Laenge ${a.description.length}`);
  assert.equal(a.hype, 5);
  assert.ok(!a.body.startsWith('# '));
  const story = { items: [{ tier: 'A', outlet: 'IGN', link: 'https://ign.com/x', title: 't', snippet: '' }] };
  const md = buildMarkdown(a, story, new Date('2026-11-17T08:30:00Z'));
  assert.match(md, /^---\ntitle: "GTA 6, Patch ist da"\n/);
  assert.match(md, /pubDate: 2026-11-17T09:30:00\+01:00/);
  assert.match(md, /sources:\n {2}- name: "IGN"\n {4}url: "https:\/\/ign.com\/x"/);
  assert.match(md, /author: "Palm Bandits Newsdesk"\nbot: true/);
});

test('Kopierschutz erkennt uebernommene Passagen', () => {
  const story = { items: [{ title: 'x', snippet: 'Rockstar has confirmed that the second patch will be released before launch on all platforms' }] };
  assert.ok(copiedPassages('Laut Quelle: Rockstar has confirmed that the second patch will be released before launch.', story).length > 0);
  assert.equal(copiedPassages('Rockstar bestaetigt ein zweites Update vor dem Start.', story).length, 0);
});

test('Frontmatter-Strings mit Anfuehrungszeichen bleiben gueltig', () => {
  assert.match(toFrontmatter({ title: 'Er sagt "Hallo"' }), /title: "Er sagt \\"Hallo\\""/);
});

test('Pins: Texte gueltig, max. 3 pro URL und Tag', () => {
  const pins = orderPins(buildPins(loadContent(true), new Date('2026-11-17T12:00:00+01:00')));
  for (const p of pins) assert.deepEqual(validatePin(p), [], p.id);
  const sameUrl = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, link: `https://palmbandits.com/cheats/gta-5/?utm_content=p${i}#c${i}` }));
  const picked = selectPins(sameUrl, { entries: [] }, { count: 5, day: '2026-11-17', dayLimit: 20 });
  assert.equal(picked.length, 3);
  const posted = { entries: [{ day: '2026-11-17', baseUrl: 'https://palmbandits.com/cheats/gta-5/' }] };
  assert.equal(selectPins(sameUrl, posted, { count: 5, day: '2026-11-17', dayLimit: 20 }).length, 2);
});

test('Konsolen-Tasten werden erkannt', () => {
  const t = parseSequence('R1, R2, L1, X, Links, Unten, Kreis', 'playstation');
  assert.deepEqual(t.map((x) => x.icon ?? x.text), ['R1', 'R2', 'L1', 'kreuz', 'links', 'unten', 'kreis']);
  assert.equal(parseSequence('X, A', 'xbox')[0].text, 'X');
});
