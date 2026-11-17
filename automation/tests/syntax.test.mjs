// Faengt Tippfehler ab, die die Bots beim Start abstuerzen lassen wuerden (z. B. doppelte Kommas in Imports).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['lib', 'news-bot', 'pinterest', 'discord', 'guide-radar'];
const files = dirs.flatMap((d) => {
  try { return readdirSync(path.join(root, d)).filter((f) => f.endsWith('.mjs')).map((f) => path.join(root, d, f)); } catch { return []; }
});

test('alle Bot-Skripte sind syntaktisch gueltig', () => {
  assert.ok(files.length > 10);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${path.relative(root, f)}: ${r.stderr}`);
  }
});
