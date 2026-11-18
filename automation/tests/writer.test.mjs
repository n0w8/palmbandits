// Prueft den Claude-Aufruf ohne echte API: ein Fake-fetch faengt die Anfrage ab und liefert eine Antwort.
import test from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { prefilter, setClientForTests, writeArticle } from '../news-bot/writer.mjs';

function fakeClient(responder) {
  const calls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), headers: init.headers, body });
    const json = responder(body);
    return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  };
  return { client: new Anthropic({ apiKey: 'test-key', fetch, maxRetries: 0 }), calls };
}

const message = (model, obj) => ({
  id: 'msg_test', type: 'message', role: 'assistant', model,
  content: [{ type: 'text', text: JSON.stringify(obj) }],
  stop_reason: 'end_turn', stop_sequence: null, stop_details: null,
  usage: { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
});

const story = {
  id: 's1',
  items: [
    { title: 'GTA 6 gets second patch before launch', outlet: 'IGN', tier: 'A', lang: 'en', snippet: 'Rockstar pushed a patch.', link: 'https://ign.com/a', published: '2026-11-17T08:00:00Z' },
    { title: 'GTA 6: Zweites Update vor dem Release', outlet: 'GameStar', tier: 'A', lang: 'de', snippet: '', link: 'https://gamestar.de/b', published: '2026-11-17T08:10:00Z' },
  ],
};

test('Artikel-Anfrage: Modell, Fallback, Schema (DE + EN), Caching', async () => {
  const article = {
    skip: false, skip_reason: '', game: 'gta-6', rumor: false, hype: 3, breaking: false,
    de: { title: 'GTA 6: Zweites Update vor dem Release', slug: 'gta-6-zweites-update-vor-release', description: 'x'.repeat(130), tags: ['GTA 6', 'Update'], body: 'Text\n\n## Das ist bekannt\n\n- a' },
    en: { title: 'GTA 6 gets a second patch before launch', slug: 'gta-6-second-patch-before-launch', description: 'y'.repeat(130), tags: ['GTA 6', 'Patch'], body: 'Text\n\n## What we know\n\n- a' },
  };
  const { client, calls } = fakeClient((b) => message(b.model, article));
  setClientForTests(client);
  const res = await writeArticle(story, { color: 'green', reason: '2 A-Medien' }, ['Alte News'], new Date('2026-11-17T09:00:00Z'));
  assert.equal(res.ok, true);
  assert.equal(res.article.de.slug, 'gta-6-zweites-update-vor-release');
  assert.equal(res.article.en.slug, 'gta-6-second-patch-before-launch');
  const req = calls[0];
  assert.match(req.url, /\/v1\/messages/);
  assert.equal(req.body.model, 'claude-sonnet-5-5');
  assert.equal(req.body.fallbacks, 'default');
  assert.equal(req.body.output_config.format.type, 'json_schema');
  // Ein Aufruf liefert beide Sprachen: Schema hat de und en mit denselben Feldern
  const props = req.body.output_config.format.schema.properties;
  for (const lang of ['de', 'en']) {
    for (const f of ['title', 'slug', 'description', 'tags', 'body']) assert.ok(props[lang].properties[f], `${lang}.${f} fehlt im Schema`);
  }
  for (const f of ['game', 'rumor', 'hype', 'breaking']) assert.ok(props[f], `${f} fehlt im Schema`);
  assert.match(req.body.system[0].text, /Englische Fassung/);
  assert.match(req.body.messages[0].content, /auf Englisch \(en\)/);
  assert.ok(req.body.output_config.effort);
  assert.equal(req.body.system[0].cache_control.type, 'ephemeral');
  assert.equal(req.body.thinking, undefined);
  const beta = req.headers['anthropic-beta'] ?? req.headers.get?.('anthropic-beta');
  assert.match(String(beta), /server-side-fallback-2026-07-01/);
});

test('Ablehnung (refusal) wird sauber gemeldet', async () => {
  const { client } = fakeClient((b) => ({ ...message(b.model, {}), content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'general_harms', explanation: '' } }));
  setClientForTests(client);
  const res = await writeArticle(story, { color: 'yellow', reason: 'test' }, [], new Date());
  assert.equal(res.ok, false);
  assert.equal(res.retry, false);
});

test('Vorfilter (Haiku) liefert Gruppen und Relevanz', async () => {
  const { client, calls } = fakeClient((b) => message(b.model, { groups: [['s1', 's2']], results: [{ id: 's1', relevant: true, duplicate_of: '', reason: 'News' }] }));
  setClientForTests(client);
  const res = await prefilter([story, { ...story, id: 's2' }], []);
  assert.equal(calls[0].body.model, 'claude-haiku-5-5');
  assert.equal(calls[0].body.fallbacks, undefined);
  assert.deepEqual(res.groups, [['s1', 's2']]);
  assert.equal(res.map.get('s1').relevant, true);
});

test('Vorfilter: bekannte offene Storys gehen als Kontext mit (nur zum Zusammenfassen)', async () => {
  const { client, calls } = fakeClient((b) => message(b.model, { groups: [['s1', 'k1']], results: [{ id: 's1', relevant: true, duplicate_of: '', reason: 'News' }] }));
  setClientForTests(client);
  const known = [{ id: 'k1', items: [{ title: 'GTA 6 gets second patch before launch', outlet: 'IGN' }] }];
  const res = await prefilter([story], ['Alte News'], known);
  const content = calls[0].body.messages[0].content;
  assert.match(content, /Bekannte offene Storys[^\n]*\n\[\{"id":"k1"/);
  assert.match(content, /Neue Storys:\n\[\{"id":"s1"/);
  assert.match(calls[0].body.system, /Bekannte offene Storys/);
  assert.deepEqual(res.groups, [['s1', 'k1']]);
});

test('Artikel-Anfrage: nachgeladener Artikeltext geht als artikeltext mit, starke Quellen zuerst', async () => {
  const empty = { title: '', slug: '', description: '', tags: [], body: '' };
  const { client, calls } = fakeClient((b) => message(b.model, { skip: true, skip_reason: 'test', game: 'gta-6', rumor: false, hype: 1, breaking: false, de: empty, en: empty }));
  setClientForTests(client);
  const s = { id: 's9', items: [
    { title: 'B-Meldung', outlet: 'Dexerto', tier: 'B', lang: 'en', snippet: '', link: 'https://dexerto.com/x', published: '2026-11-18T08:00:00Z' },
    ...Array.from({ length: 10 }, (_, i) => ({ title: `A-Meldung ${i}`, outlet: `A${i}`, tier: 'A', lang: 'en', snippet: '', link: `https://a${i}.com/x`, published: '2026-11-18T08:00:00Z' })),
  ] };
  s.items[10].text = 'Volltext aus dem Originalartikel mit allen Fakten.';
  await writeArticle(s, { color: 'green', reason: 'test' }, [], new Date('2026-11-18T09:00:00Z'));
  const content = calls[0].body.messages[0].content;
  assert.match(content, /"artikeltext": "Volltext aus dem Originalartikel/);
  assert.ok(!content.includes('B-Meldung')); // nur die 10 staerksten Quellen
  assert.match(calls[0].body.system[0].text, /artikeltext/);
});
