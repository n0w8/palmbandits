// Prueft die Claude-Aufrufe des Guide-Radars ohne echte API: ein Fake-fetch faengt die Anfragen ab.
import test from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { buildGuidePrompt, precheckTopic, setClientForTests, writeGuide } from '../guide-radar/writer.mjs';

function fakeClient(responder) {
  const calls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), headers: init.headers, body });
    return new Response(JSON.stringify(responder(body)), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  };
  return { client: new Anthropic({ apiKey: 'test-key', fetch, maxRetries: 0 }), calls };
}

const message = (model, obj, extra = {}) => ({
  id: 'msg_test', type: 'message', role: 'assistant', model,
  content: [{ type: 'text', text: JSON.stringify(obj) }],
  stop_reason: 'end_turn', stop_sequence: null, stop_details: null,
  usage: { input_tokens: 3000, output_tokens: 1500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  ...extra,
});

const items = [
  { title: 'GTA 6: Where to find the hidden UFO', outlet: 'IGN', tier: 'A', type: 'outlet', lang: 'en', text: 'The UFO hovers above the mountain at night.', link: 'https://ign.com/ufo', published: '2026-11-20T08:00:00Z' },
  { title: 'Found the UFO!', outlet: 'Reddit r/GTA6', tier: 'rumor', type: 'reddit', lang: 'en', text: 'Seen it at 3am in-game.', link: 'https://reddit.com/r/GTA6/x', published: '2026-11-20T09:00:00Z' },
];
const assessment = { reason: '2 unabhaengige Quellen (IGN, Reddit r/GTA6)', communityOnly: false, independent: 2 };

test('Vorpruefung: Haiku, strukturierte Ausgabe, kein Fallback-Parameter', async () => {
  const { client, calls } = fakeClient((b) => message(b.model, { actionable: true, game: 'gta-6', category: 'easter-eggs', keyword: 'gta 6 ufo fundort', online_exploit: false, reason: 'konkreter Fundort genannt' }));
  setClientForTests(client);
  const res = await precheckTopic({ id: 't1' }, items, { game: 'gta-6', category: 'easter-eggs' });
  assert.equal(res.ok, true);
  assert.equal(res.result.keyword, 'gta 6 ufo fundort');
  const req = calls[0].body;
  assert.equal(req.model, 'claude-haiku-5-5');
  assert.equal(req.fallbacks, undefined);
  assert.equal(req.output_config.format.type, 'json_schema');
  assert.equal(req.output_config.effort, 'low');
  assert.match(req.messages[0].content, /hidden UFO/);
});

test('Guide-Anfrage: Sonnet, Fallback, Schema (DE + EN), Caching, Quellen nummeriert', async () => {
  const guide = {
    skip: false, skip_reason: '', game: 'gta-6', category: 'easter-eggs', difficulty: 'leicht',
    de: { title: 'GTA 6 UFO: Fundort des versteckten Easter Eggs', slug: 'gta-6-ufo-fundort', description: 'x'.repeat(130), tags: ['GTA 6', 'UFO'], faq: [], body: 'Einstieg.\n\n**Stand: 20. November 2026.**\n\n## Wo\n\nText' },
    en: { title: 'GTA 6 UFO location: where to find the hidden easter egg', slug: 'gta-6-ufo-location', description: 'y'.repeat(130), tags: ['GTA 6', 'UFO'], faq: [], body: 'Intro.\n\n**Last updated: November 20, 2026.**\n\n## Where\n\nText' },
    belege: [{ fakt: 'UFO nachts ueber dem Berg', quellen: [1] }],
  };
  const { client, calls } = fakeClient((b) => message(b.model, guide));
  setClientForTests(client);
  const now = new Date('2026-11-20T10:00:00Z');
  const res = await writeGuide({ items, assessment, precheck: null, existingGuides: [{ title: 'GTA 6 Launch-Checkliste', slug: 'gta-6-launch-checkliste', en: 'gta-6-launch-checklist' }], allowedLinks: ['/guides/', '/spiele/gta-6/'], allowedLinksEn: ['/en/guides/', '/en/games/gta-6/'], now });
  assert.equal(res.ok, true);
  assert.equal(res.guide.de.slug, 'gta-6-ufo-fundort');
  assert.equal(res.guide.en.slug, 'gta-6-ufo-location');
  const req = calls[0];
  assert.equal(req.body.model, 'claude-sonnet-5-5');
  assert.equal(req.body.fallbacks, 'default');
  assert.equal(req.body.output_config.format.type, 'json_schema');
  const props = req.body.output_config.format.schema.properties;
  for (const lang of ['de', 'en']) {
    for (const f of ['title', 'slug', 'description', 'tags', 'faq', 'body']) assert.ok(props[lang].properties[f], `${lang}.${f} fehlt im Schema`);
  }
  for (const f of ['game', 'category', 'difficulty', 'belege']) assert.ok(props[f], `${f} fehlt im Schema`);
  assert.ok(req.body.max_tokens >= 20000, 'genug Platz fuer zwei Sprachen');
  assert.ok(req.body.output_config.effort);
  assert.equal(req.body.system[0].cache_control.type, 'ephemeral');
  assert.match(req.body.system[0].text, /NUR Fakten|Nur Fakten aus den Quellen/);
  assert.match(req.body.system[0].text, /Englische Fassung/);
  assert.equal(req.body.thinking, undefined);
  const beta = req.headers['anthropic-beta'] ?? req.headers.get?.('anthropic-beta');
  assert.match(String(beta), /server-side-fallback-2026-07-01/);
  const user = req.body.messages[0].content;
  assert.match(user, /"nr": 1/);
  assert.match(user, /\/guides\/gta-6-launch-checkliste\/ \| englisch: \/en\/guides\/gta-6-launch-checklist\//);
  assert.match(user, /Erlaubte interne Links \(englischer Text\):\n\/en\/guides\/, \/en\/games\/gta-6\//);
  assert.match(user, /ist am 19\. November 2026 .*erschienen/);
});

test('Guide-Anfrage: Ablehnung wird sauber gemeldet, Exploit-Hinweis landet im Prompt', async () => {
  const { client } = fakeClient((b) => ({ ...message(b.model, {}), content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'general_harms', explanation: '' } }));
  setClientForTests(client);
  const res = await writeGuide({ items, assessment, precheck: null, existingGuides: [], allowedLinks: [], now: new Date() });
  assert.equal(res.ok, false);
  assert.equal(res.retry, false);
  const prompt = buildGuidePrompt({ items, assessment, precheck: { keyword: 'gta online money glitch', game: 'gta-online', category: 'glitches', online_exploit: true }, existingGuides: [], allowedLinks: [], now: new Date('2026-11-17T10:00:00Z') });
  assert.match(prompt, /Keine Anleitung/);
  assert.match(prompt, /erscheint am 19\. November 2026/);
});
