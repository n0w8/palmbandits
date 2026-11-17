// Tailwind/Pinterest-Bulk-Export: CSV fuer einen Tag (Standard: morgen) im selben Format wie die bisherigen
// bisherige Bulk-CSVs (Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords).
// Aufruf: node pinterest/export-csv.mjs [--date 2026-11-18] [--count 20] [--media-base https://...] [--no-mark]
//         node pinterest/export-csv.mjs --undo 2026-11-18   (Export zuruecknehmen, Pins kommen wieder in die Warteschlange)
// Die Bilder landen in pinterest/export/<Tag>/ und muessen unter <media-base>/<Tag>/<id>.png oeffentlich erreichbar sein
// (der Workflow legt sie dafuer auf den Branch "pin-media", siehe README).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  AUTOMATION_DIR, argValue, berlinDate, berlinLocalToDate, env, envInt, hasFlag, hasLongDash, loadDotEnv, readJson, setOutput, siteUrl, writeJson,
} from '../lib/util.mjs';
import { HARD_DAY_LIMIT, QUEUE_FILE, baseUrl, loadPosted, savePosted, selectPins } from './pins.mjs';
import { renderToFile } from './generate.mjs';

loadDotEnv();

const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

function slots(day, count) {
  // gleichmaessig zwischen 06:30 und 22:30 deutscher Zeit, als UTC wie in den bisherigen CSVs
  const start = berlinLocalToDate(day, '06:30').getTime();
  const end = berlinLocalToDate(day, '22:30').getTime();
  const step = count > 1 ? (end - start) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => new Date(start + i * step).toISOString().slice(0, 16) + ':00');
}

function main() {
  const posted = loadPosted();
  const undo = argValue('undo');
  if (undo) {
    const before = posted.entries.length;
    posted.entries = posted.entries.filter((e) => !(e.via === 'csv' && e.day === undo));
    savePosted(posted);
    console.log(`${before - posted.entries.length} CSV-Pins vom ${undo} zurueckgenommen. Jetzt "node pinterest/generate.mjs" ausfuehren.`);
    return;
  }
  const day = argValue('date') || berlinDate(new Date(Date.now() + 86_400_000));
  const count = Math.min(parseInt(argValue('count', String(envInt('PINS_PER_DAY', 20))), 10), HARD_DAY_LIMIT);
  const repo = env('GITHUB_REPOSITORY');
  const mediaBase = (argValue('media-base') || env('PIN_MEDIA_BASE_URL') || (repo ? `https://raw.githubusercontent.com/${repo}/pin-media` : `${siteUrl()}/pins`)).replace(/\/+$/, '');
  const queueData = readJson(QUEUE_FILE, { pins: [] });
  const boards = readJson(path.join(AUTOMATION_DIR, 'pinterest', 'boards.json'), {});
  const picked = selectPins(queueData.pins, posted, { count, day, dayLimit: count });
  if (!picked.length) {
    console.log('Warteschlange leer, keine CSV erstellt. Erst "node pinterest/generate.mjs" ausfuehren.');
    return;
  }
  const dir = path.join(AUTOMATION_DIR, 'pinterest', 'export', day);
  mkdirSync(dir, { recursive: true });
  const times = slots(day, picked.length);
  const rows = [['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'].join(',')];
  const seenLinks = new Set();
  return (async () => {
    for (const [i, pin] of picked.entries()) {
      if (hasLongDash(pin.title + pin.description)) throw new Error(`langer Strich in ${pin.id}`);
      if (seenLinks.has(pin.link)) throw new Error(`doppelter Link in der CSV: ${pin.link}`);
      seenLinks.add(pin.link);
      await renderToFile(pin, path.join(dir, `${pin.id}.png`));
      const keywords = (pin.description.match(/#(\w+)/g) ?? []).map((h) => h.slice(1)).join(', ');
      const boardName = boards[pin.board]?.name ?? pin.board;
      rows.push([q(pin.title.slice(0, 100)), q(`${mediaBase}/${day}/${pin.id}.png`), q(boardName), q(''), q(pin.description), q(pin.link), q(times[i]), q(keywords)].join(','));
    }
    const csvFile = path.join(dir, `pinterest-bulk-${day}.csv`);
    // ohne BOM (ein BOM vor "Title" kann die Spaltenerkennung stoeren), Zeilenende CRLF wie bisher
    writeFileSync(csvFile, rows.join('\r\n') + '\r\n', 'utf8');
    console.log(`${picked.length} Pins fuer ${day} -> ${path.relative(AUTOMATION_DIR, csvFile)} (Bilder: ${mediaBase}/${day}/)`);
    if (!hasFlag('no-mark')) {
      for (const [i, pin] of picked.entries()) {
        posted.entries.push({ id: pin.id, type: pin.type, title: pin.title, board: pin.board, link: pin.link, baseUrl: baseUrl(pin.link), via: 'csv', scheduledFor: times[i], day });
      }
      savePosted(posted);
      const ids = new Set(picked.map((p) => p.id));
      queueData.pins = queueData.pins.filter((p) => !ids.has(p.id));
      writeJson(QUEUE_FILE, queueData);
    }
    setOutput('date', day);
    setOutput('dir', path.relative(path.resolve(AUTOMATION_DIR, '..'), dir).replace(/\\/g, '/'));
  })();
}

Promise.resolve(main()).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
