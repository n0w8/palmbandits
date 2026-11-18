// Schnelle Selbsttests ohne Netz und ohne API: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinIso, noLongDashes, slugify, toFrontmatter } from '../lib/util.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ampel, buildIdf, clusterIntoStories, isRelevant, newsroomKey, similarity, tokenize } from '../news-bot/analyze.mjs';
import { buildMarkdown, copiedPassages, normalizeArticle } from '../news-bot/output.mjs';
import { knownTitles, siteNewsTitles } from '../news-bot/state.mjs';
import { addArticleTexts, pickForText } from '../news-bot/article-text.mjs';
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

// ---------- Nachtrag 18.11.2026: Dauerbetrieb (Redaktionen, Kopierschutz, bekannte Titel, Artikeltext) ----------

test('Ampel: Seiten mit gemeinsamer Redaktion zaehlen als ein Medium', () => {
  const s = (domains) => ({ items: domains.map((d, i) => ({ tier: 'A', domain: d, outlet: `S${i}`, title: 'GTA 6 news' })) });
  assert.equal(newsroomKey('gamepro.de'), 'gamestar');
  assert.equal(ampel(s(['gamestar.de', 'gamepro.de'])).color, 'yellow');
  assert.equal(ampel(s(['gamestar.de', 'ign.com'])).color, 'green');
  assert.equal(ampel(s(['pcgames.de', 'pcgameshardware.de']), { pcgameshardware: 'pcgames' }).color, 'yellow');
  assert.equal(ampel(s(['gamestar.de', 'gamepro.de']), {}).color, 'green'); // ohne Zuordnung: zwei Medien
});

test('Kopierschutz: Namen und Plattformen allein sind keine Kopie, Artikeltext wird mitgeprueft', () => {
  const story = { items: [{ title: 'x', snippet: 'Grand Theft Auto VI launches on November 19 for PlayStation 5 and Xbox Series X|S worldwide' }] };
  assert.equal(copiedPassages('GTA 6 erscheint. Grand Theft Auto VI launches on November 19 for PlayStation 5 and Xbox Series X|S.', story).length, 0);
  const withText = { items: [{ title: 'x', snippet: '', text: 'The studio said the patch fixes crashes in the opening mission and improves streaming of textures.' }] };
  assert.ok(copiedPassages('Laut IGN: the patch fixes crashes in the opening mission and improves streaming.', withText).length > 0);
});

test('Bekannte Titel: von Hand geschriebene News der letzten Tage plus Protokoll, ohne Doppelte', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pb-news-'));
  writeFileSync(path.join(dir, '2026-11-17-hand.md'), '---\ntitle: "GTA 6 Release: Uhrzeit und Preload"\npubDate: 2026-11-17T02:30:00+01:00\n---\nText');
  writeFileSync(path.join(dir, '2026-11-17-bot.md'), '---\ntitle: "Bot-News"\nbot: true\n---\nText');
  writeFileSync(path.join(dir, '2026-11-01-alt.md'), '---\ntitle: "Alte News"\n---\nText');
  const site = siteNewsTitles(dir, new Date('2026-11-18T10:00:00Z'), 3);
  assert.deepEqual(site, ['GTA 6 Release: Uhrzeit und Preload']);
  const log = { entries: Array.from({ length: 50 }, (_, i) => ({ title: `Titel ${i}` })).concat([{ title: 'gta 6 release: uhrzeit und preload' }]) };
  const known = knownTitles(log, site, 40);
  assert.equal(known[0], 'GTA 6 Release: Uhrzeit und Preload');
  assert.equal(known.length, 40); // 1 Hand-Titel + 39 aus dem Protokoll (der doppelte faellt weg)
  assert.ok(!known.includes('Titel 0'));
});

test('Artikeltext: nur starke Quellen mit Direktlink, je Medium einer, Fehler werden ignoriert', async () => {
  const items = [
    { tier: 'rumor', domain: 'reddit.com', link: 'https://www.reddit.com/r/GTA6/x', title: 'r' },
    { tier: 'B', domain: 'dexerto.com', link: 'https://www.dexerto.com/a', title: 'b', published: '2026-11-18T01:00:00Z' },
    { tier: 'A', domain: 'ign.com', link: 'https://www.ign.com/a', title: 'a1', published: '2026-11-18T01:00:00Z' },
    { tier: 'A', domain: 'ign.com', link: 'https://www.ign.com/b', title: 'a2', published: '2026-11-18T02:00:00Z' },
    { tier: 'official', domain: 'rockstargames.com', link: 'https://news.google.com/rss/articles/x', title: 'o', aggregator: true },
    { tier: 'A', domain: 'eurogamer.net', link: 'https://www.eurogamer.net/a', title: 'e', published: '2026-11-18T00:00:00Z' },
  ];
  assert.deepEqual(pickForText(items, 2).map((i) => i.link), ['https://www.ign.com/b', 'https://www.eurogamer.net/a']);
  const para = 'Rockstar hat heute den zweiten Patch fuer GTA 6 veroeffentlicht. '.repeat(8);
  const html = `<html><body><nav>Menue</nav><article><p>${para}</p><p>Der Patch behebt Abstuerze in der ersten Mission und verbessert das Laden.</p></article></body></html>`;
  const fakeFetch = async (url) => (url.includes('eurogamer') ? new Response('nope', { status: 500 }) : new Response(html, { status: 200 }));
  const story = { items };
  const n = await addArticleTexts(story, { maxPages: 2, fetchImpl: fakeFetch });
  assert.equal(n, 1);
  assert.match(items[3].text, /zweiten Patch/);
  assert.ok(!/Menue/.test(items[3].text));
  assert.equal(items[5].text, undefined);
  assert.equal(await addArticleTexts(story, { maxPages: 0, fetchImpl: fakeFetch }), 0);
});
