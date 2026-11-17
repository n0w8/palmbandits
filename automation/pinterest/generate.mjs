// Pin-Generator: baut die Warteschlange aus Guides, News und GTA-Fakten und rendert die Bilder.
// Aufruf:
//   node pinterest/generate.mjs              Warteschlange aktualisieren (automation/data/pin-queue.json)
//   node pinterest/generate.mjs --render     zusaetzlich alle Bilder nach pinterest/out/ rendern
//   node pinterest/generate.mjs --render-next 5   nur die naechsten 5 rendern
//   node pinterest/generate.mjs --samples    je Pin-Typ ein Beispiel nach pinterest/samples/
//   --fixtures                               Testdaten aus automation/fixtures statt der echten Seite
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AUTOMATION_DIR, argValue, hasFlag, loadDotEnv, readJson, writeJson } from '../lib/util.mjs';
import { loadContent } from './content.mjs';
import { OUT_DIR, QUEUE_FILE, buildPins, buildQueue, loadPosted, validatePin } from './pins.mjs';
import { renderPin } from './render.mjs';

loadDotEnv();

export async function renderToFile(pin, file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const png = await renderPin(pin.design);
  writeFileSync(file, png);
  return png.length;
}

export function pinImageFile(pin) {
  return path.join(OUT_DIR, `${pin.id}.png`);
}

async function main() {
  const fixtures = hasFlag('fixtures');
  const nowIso = new Date().toISOString();

  if (hasFlag('samples')) {
    // Beispiele: echte Inhalte, wo vorhanden, sonst Testdaten
    const real = buildPins(loadContent(false));
    const fake = buildPins(loadContent(true), new Date('2026-11-17T12:00:00+01:00'));
    const dir = path.join(AUTOMATION_DIR, 'pinterest', 'samples');
    const want = argValue('types', 'guide,fact,tips,news,wallpaper').split(',');
    for (const type of want) {
      const pin = (fixtures ? null : real.find((p) => p.type === type)) ?? fake.find((p) => p.type === type);
      if (!pin) { console.log(`Kein Beispiel fuer ${type}`); continue; }
      const t0 = Date.now();
      const bytes = await renderToFile(pin, path.join(dir, `sample-${type}.png`));
      console.log(`sample-${type}.png  ${(bytes / 1024).toFixed(0)} KB  ${Date.now() - t0} ms  (${pin.id})`);
    }
    return;
  }

  const content = loadContent(fixtures);
  const pins = buildPins(content);
  let bad = 0;
  for (const p of pins) {
    const problems = validatePin(p);
    if (problems.length) { bad++; console.warn(`  Problem bei ${p.id}: ${problems.join(', ')}`); }
  }
  const queueFile = fixtures ? path.join(OUT_DIR, 'pin-queue.fixtures.json') : QUEUE_FILE;
  const posted = loadPosted();
  const existing = readJson(queueFile, { pins: [] }).pins;
  const queue = buildQueue(pins, posted, existing, nowIso);
  const byType = queue.reduce((m, p) => ({ ...m, [p.type]: (m[p.type] ?? 0) + 1 }), {});
  console.log(`Inhalte: ${content.guides.length} Guides, ${content.news.length} News, ${content.facts.length} Fakten${fixtures ? ' (Testdaten)' : ''}`);
  console.log(`Warteschlange: ${queue.length} Pins (${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join(', ')}), schon gepostet: ${posted.entries.length}${bad ? `, ${bad} mit Problemen` : ''}`);
  if (!hasFlag('dry-run')) writeJson(queueFile, { updated: nowIso, pins: queue });

  const renderAll = hasFlag('render');
  const next = parseInt(argValue('render-next', '0'), 10);
  if (renderAll || next > 0) {
    const list = renderAll ? queue : queue.slice(0, next);
    const t0 = Date.now();
    for (const p of list) {
      const file = pinImageFile(p);
      if (existsSync(file) && !hasFlag('force')) continue;
      await renderToFile(p, file);
    }
    console.log(`${list.length} Bilder in ${OUT_DIR} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('pinterest/generate.mjs');
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
