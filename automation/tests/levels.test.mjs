// Fahndungslevel und Guide-Helfer: reine Logik, ohne Netz und ohne Discord.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { COOLDOWN_MS, STAR_ROLES, applyMessages, helperHandles, matchesHandle, planStars, snowflakeTime, starFor } from '../discord/levels.mjs';

test('Stern-Schwellen sind aufsteigend und beginnen bei 1', () => {
  assert.equal(STAR_ROLES.length, 6);
  assert.equal(STAR_ROLES[0].key, 'lvl1');
  assert.equal(STAR_ROLES[0].xp, 1);
  for (let i = 1; i < STAR_ROLES.length; i++) assert.ok(STAR_ROLES[i].xp > STAR_ROLES[i - 1].xp);
});

test('Punkte: hoechstens 1 pro Minute, unabhaengig von der Reihenfolge', () => {
  const users = {};
  const t0 = 1_800_000_000_000;
  const msgs = [
    { author: 'a', ts: t0 + 30_000 }, // innerhalb der Minute: zaehlt nicht
    { author: 'a', ts: t0 },
    { author: 'a', ts: t0 + COOLDOWN_MS }, // genau eine Minute spaeter: zaehlt
    { author: 'b', ts: t0 + 1 },
  ];
  assert.equal(applyMessages(users, msgs), 3);
  assert.equal(users.a.xp, 2);
  assert.equal(users.b.xp, 1);
  // naechster Lauf: alte Zeit wird beruecksichtigt
  assert.equal(applyMessages(users, [{ author: 'a', ts: t0 + COOLDOWN_MS + 10 }]), 0);
});

test('Stern fuer Punktestand', () => {
  assert.equal(starFor(0), null);
  assert.equal(starFor(1).key, 'lvl1');
  assert.equal(starFor(STAR_ROLES[1].xp - 1).key, 'lvl1');
  assert.equal(starFor(STAR_ROLES[1].xp).key, 'lvl2');
  assert.equal(starFor(1e9).key, 'lvl6');
});

test('Rollenplan: aufsteigen, nur ein Stern, nie absteigen', () => {
  // neu: erster Stern, kein Aufstieg zu melden (lvl1 wird in daily.mjs nicht gemeldet, levelUp ist aber gesetzt)
  assert.deepEqual(planStars(1, []), { target: 'lvl1', add: 'lvl1', remove: [], levelUp: 'lvl1' });
  // Aufstieg: neuen Stern dazu, alten weg
  const up = planStars(STAR_ROLES[2].xp, ['lvl1']);
  assert.equal(up.add, 'lvl3');
  assert.deepEqual(up.remove, ['lvl1']);
  assert.equal(up.levelUp, 'lvl3');
  // nichts zu tun
  assert.deepEqual(planStars(5, ['lvl1']), { target: 'lvl1', add: null, remove: [], levelUp: null });
  // von Hand hoeher vergeben (oder Punkte verloren): bleibt, kein Abstieg, keine Meldung
  assert.deepEqual(planStars(3, ['lvl4']), { target: 'lvl4', add: null, remove: [], levelUp: null });
  // doppelte Sterne aufraeumen
  assert.deepEqual(planStars(0, ['lvl2', 'lvl5']).remove, ['lvl2']);
  // keine Punkte, kein Stern: nichts
  assert.deepEqual(planStars(0, []), { target: null, add: null, remove: [], levelUp: null });
});

test('Snowflake-Zeit', () => {
  // Discord-Epoche 2015-01-01
  assert.equal(snowflakeTime('0'), 1420070400000);
  assert.equal(new Date(snowflakeTime('1572118079893143605')).getUTCFullYear(), 2026);
});

test('Guide-Helfer aus Artikeln (Name oder ID, auch in Unterordnern)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pb-helpers-'));
  try {
    mkdirSync(path.join(dir, 'en', 'guides'), { recursive: true });
    writeFileSync(path.join(dir, 'a.md'), '---\ntitle: "A"\nhelpers:\n  - name: "Vice Viper"\n    discord: "@ViceViper"\n  - name: "Ohne Discord"\n---\nText');
    writeFileSync(path.join(dir, 'en', 'guides', 'b.md'), '---\ntitle: "B"\nhelpers:\n  - name: "Num"\n    discord: "123456789012345678"\n---\nText');
    writeFileSync(path.join(dir, 'c.md'), '---\ntitle: "C"\n---\nKein Helfer');
    const h = helperHandles(dir);
    assert.deepEqual([...h].sort(), ['123456789012345678', 'viceviper']);
    assert.equal(matchesHandle({ user: { id: '1', username: 'viceviper' } }, h), true);
    assert.equal(matchesHandle({ user: { id: '123456789012345678', username: 'x' } }, h), true);
    assert.equal(matchesHandle({ user: { id: '2', username: 'someone' } }, h), false);
    assert.equal(helperHandles(path.join(dir, 'gibt-es-nicht')).size, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
