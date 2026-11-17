// Reels: Planung, Captions und ffmpeg-Aufruf (ohne Rendern und ohne Netz)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../pinterest/content.mjs';
import { DURATION, SLIDES, ffmpegArgs, hashtags, planReels } from '../social/reel.mjs';

const content = loadContent(true); // Testdaten in automation/fixtures

const FACTS = ['a', 'b', 'c'].map((id, i) => ({ id, game: i ? 'gta-5' : 'gta-san-andreas', hook: `Hook ${id}`, fact: `Fakt ${id}.`, source: { name: `Quelle ${id}`, url: `https://example.org/${id}` } }));

test('Reel-Plan: zwei Fakten, frische News und Guide, stabile IDs, keine Cheats', () => {
  const date = new Date('2026-11-17T12:00:00Z');
  const plans = planReels(content, date, FACTS);
  const slots = plans.map((p) => p.slot ?? p.kind);
  assert.deepEqual(slots.filter((s) => s.startsWith('fact')), ['fact', 'fact2']);
  assert.ok(slots.includes('guide'));
  assert.equal(plans.some((p) => p.kind === 'cheat'), false);
  for (const p of plans) {
    assert.match(p.id, /^2026-11-17-(fact|news|guide)-/);
    assert.ok(p.photo.endsWith('.jpg'));
    assert.ok(p.hook.title.length > 0);
    assert.ok(p.url.startsWith('http'));
  }
  // gleicher Tag = gleiche Plaene
  assert.deepEqual(planReels(content, date, FACTS).map((p) => p.id), plans.map((p) => p.id));
});

test('Alte News kommen nicht ins Reel', () => {
  const later = new Date('2027-03-01T12:00:00Z');
  assert.equal(planReels(content, later).some((p) => p.kind === 'news'), false);
});

test('Captions: kein langer Strich, Link-Hinweis, hoechstens 10 Hashtags, unter 2200 Zeichen', () => {
  for (const p of planReels(content, new Date('2026-11-17T12:00:00Z'), FACTS)) {
    assert.doesNotMatch(p.caption, /[–—]/);
    assert.doesNotMatch(p.caption, /cheat/i);
    assert.match(p.caption, /Link in Bio/);
    assert.ok((p.caption.match(/#\w+/g) ?? []).length <= 10);
    assert.ok(p.caption.length < 2200);
  }
  assert.match(hashtags('fact', 'gta-5'), /#gtafacts/);
});

test('Guide-Punkte ohne doppelte Nummern und ohne "Kurzfassung"', () => {
  const g = planReels(content, new Date('2026-11-17T12:00:00Z')).find((p) => p.kind === 'guide');
  for (const t of g.body.points) {
    assert.doesNotMatch(t, /^\d+[.)]/);
    assert.doesNotMatch(t, /kurzfassung/i);
  }
});

test('ffmpeg: drei Tafeln, Ton, richtige Laenge, Tafeln ueberlappen fuer Ueberblendung', () => {
  const args = ffmpegArgs({ photo: 'bg.jpg', slides: { hook: 'h.png', body: 'b.png', cta: 'c.png' }, audio: 'song.mp3', out: 'out.mp4' });
  const fc = args[args.indexOf('-filter_complex') + 1];
  assert.match(fc, /zoompan/);
  assert.equal((fc.match(/overlay=0:0/g) ?? []).length, 3);
  assert.equal(args[args.indexOf('-t') + 1], String(DURATION));
  assert.ok(SLIDES.hook[1] > SLIDES.body[0] && SLIDES.body[1] > SLIDES.cta[0]);
  const silent = ffmpegArgs({ photo: 'bg.jpg', slides: { hook: 'h', body: 'b', cta: 'c' }, audio: null, out: 'o.mp4' });
  assert.ok(silent.includes('anullsrc=r=44100:cl=stereo'));
});

test('Fakten-Reel: zwei verschiedene pro Tag, der Reihe nach, Quelle in der Caption', () => {
  const day = (d) => planReels(content, new Date(d), FACTS).filter((p) => p.kind === 'fact').map((p) => p.id.split('-fact-')[1]);
  const d1 = day('2026-11-17T12:00:00Z');
  const d2 = day('2026-11-18T12:00:00Z');
  assert.equal(d1.length, 2);
  assert.notEqual(d1[0], d1[1]);
  assert.notDeepEqual(d1, d2);
  const f = planReels(content, new Date('2026-11-17T12:00:00Z'), FACTS).find((p) => p.kind === 'fact');
  assert.match(f.caption, /Quelle: Quelle [abc]/);
  assert.match(f.caption, /#gtafacts/);
  assert.equal(planReels(content, new Date('2026-11-17T12:00:00Z'), []).some((p) => p.kind === 'fact'), false);
});
