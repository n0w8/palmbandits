// Pinterest-Poster: postet die naechsten Pins aus der Warteschlange ueber die Pinterest API v5.
// Aufruf: node pinterest/post.mjs [--dry-run] [--list-boards]
// Ohne PINTEREST_ACCESS_TOKEN (und ohne Refresh-Daten) laeuft er als Probelauf.
// Regeln: max. PINS_PER_DAY (Standard 20, hart max. 25) pro Tag, max. 3 Pins pro Ziel-URL und Tag,
// nur zwischen 06:00 und 23:59 Uhr deutscher Zeit.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AUTOMATION_DIR, berlinDate, berlinHour, env, envInt, hasFlag, loadDotEnv, readJson, setOutput, summary, writeJson } from '../lib/util.mjs';
import { HARD_DAY_LIMIT, QUEUE_FILE, baseUrl, loadPosted, savePosted, selectPins } from './pins.mjs';
import { pinImageFile, renderToFile } from './generate.mjs';

loadDotEnv();

const API = env('PINTEREST_API_BASE', 'https://api.pinterest.com/v5').replace(/\/+$/, '');
const APP_ID = env('PINTEREST_APP_ID');
const APP_SECRET = env('PINTEREST_APP_SECRET');
const REFRESH = env('PINTEREST_REFRESH_TOKEN');
const CAN_REFRESH = Boolean(APP_ID && APP_SECRET && REFRESH);
const DRY = hasFlag('dry-run') || (!env('PINTEREST_ACCESS_TOKEN') && !CAN_REFRESH);
const PINS_PER_RUN = envInt('PINS_PER_RUN', 1);
const PINS_PER_DAY = Math.min(envInt('PINS_PER_DAY', 20), HARD_DAY_LIMIT);
const FIRST_HOUR = envInt('POST_FIRST_HOUR', 6);
const LAST_HOUR = envInt('POST_LAST_HOUR', 23); // letzter Lauf startet in dieser Stunde

let accessToken = env('PINTEREST_ACCESS_TOKEN');
let refreshed = false;

async function refreshToken() {
  if (!CAN_REFRESH) return false;
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: REFRESH }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error(`Token-Erneuerung fehlgeschlagen: HTTP ${res.status} ${data.message ?? ''}`);
    return false;
  }
  accessToken = data.access_token;
  refreshed = true;
  // Tokens nie ins Log schreiben. Im Workflow maskieren und fuer das optionale Secret-Update ablegen.
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::add-mask::${data.access_token}`);
    if (data.refresh_token) console.log(`::add-mask::${data.refresh_token}`);
  }
  if (process.env.RUNNER_TEMP) {
    writeFileSync(path.join(process.env.RUNNER_TEMP, 'pinterest-access-token'), data.access_token);
    if (data.refresh_token) writeFileSync(path.join(process.env.RUNNER_TEMP, 'pinterest-refresh-token'), data.refresh_token);
  }
  const days = data.refresh_token_expires_in ? Math.round(data.refresh_token_expires_in / 86400) : null;
  console.log(`Zugangstoken erneuert${days ? `, Refresh-Token noch ${days} Tage gueltig` : ''}.`);
  return true;
}

async function api(method, urlPath, body) {
  const doFetch = () => fetch(`${API}${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  let res = await doFetch();
  if (res.status === 401 && !refreshed && await refreshToken()) res = await doFetch();
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function listBoards() {
  const { ok, status, data } = await api('GET', '/boards?page_size=100');
  if (!ok) return console.error(`Boards abrufen fehlgeschlagen: HTTP ${status} ${data.message ?? ''}`);
  for (const b of data.items ?? []) console.log(`${b.id}  ${b.name}`);
}

async function main() {
  if (!accessToken && CAN_REFRESH) await refreshToken();
  if (hasFlag('list-boards')) return listBoards();

  const now = new Date();
  const day = berlinDate(now);
  const hour = berlinHour(now);
  if (!hasFlag('ignore-hours') && (hour < FIRST_HOUR || hour > LAST_HOUR)) {
    console.log(`Ausserhalb der Postzeit (${FIRST_HOUR}:00 bis ${LAST_HOUR}:59 Uhr), nichts zu tun.`);
    return;
  }
  const posted = loadPosted();
  posted.failures ??= {};
  const queueData = readJson(QUEUE_FILE, { pins: [] });
  const queue = queueData.pins.filter((p) => (posted.failures[p.id] ?? 0) < 3);
  const today = posted.entries.filter((e) => e.day === day).length;
  const remaining = Math.max(0, PINS_PER_DAY - today);
  const runsLeft = Math.max(1, LAST_HOUR - hour + 1);
  // Aufholen, falls GitHub Laeufe ausgelassen hat: so verteilen, dass das Tagesziel erreicht wird (max. 3 pro Lauf)
  const perRun = Math.min(3, remaining, Math.max(PINS_PER_RUN, Math.ceil(remaining / runsLeft)));
  console.log(`Pinterest ${DRY ? '(PROBELAUF) ' : ''}${day} ${hour} Uhr: heute ${today}/${PINS_PER_DAY}, Warteschlange ${queue.length}, dieser Lauf ${perRun}`);
  if (perRun === 0) return;

  const boards = readJson(path.join(AUTOMATION_DIR, 'pinterest', 'boards.json'), {});
  const picked = selectPins(queue, posted, { count: perRun, day, dayLimit: PINS_PER_DAY });
  if (!picked.length) console.log('Nichts Passendes in der Warteschlange (leer oder alle Ziel-URLs heute schon 3x).');
  let done = 0;
  for (const pin of picked) {
    const boardId = boards[pin.board]?.id;
    const file = pinImageFile(pin);
    if (!existsSync(file)) await renderToFile(pin, file);
    if (DRY) {
      console.log(`  wuerde posten: [${pin.type}] ${pin.title}\n     Board: ${pin.board}${boardId ? ` (${boardId})` : ' (ID fehlt in boards.json)'}\n     Link: ${pin.link}\n     Bild: ${path.relative(AUTOMATION_DIR, file)}`);
      continue;
    }
    if (!boardId) {
      console.warn(`  uebersprungen ${pin.id}: keine Board-ID fuer "${pin.board}" in pinterest/boards.json`);
      continue;
    }
    const body = {
      board_id: boardId,
      title: pin.title,
      description: pin.description,
      link: pin.link,
      alt_text: pin.altText,
      media_source: { source_type: 'image_base64', content_type: 'image/png', data: readFileSync(file).toString('base64') },
    };
    const res = await api('POST', '/pins', body);
    if (res.ok) {
      done++;
      posted.entries.push({
        id: pin.id, type: pin.type, title: pin.title, board: pin.board, link: pin.link, baseUrl: baseUrl(pin.link),
        pinId: res.data.id ?? null, via: 'api', postedAt: new Date().toISOString(), day,
      });
      queueData.pins = queueData.pins.filter((q) => q.id !== pin.id);
      console.log(`  gepostet: [${pin.type}] ${pin.title} -> Pin ${res.data.id}`);
    } else if (res.status === 429) {
      console.warn('  Pinterest-Limit erreicht (429), Rest beim naechsten Lauf.');
      break;
    } else if (res.status === 401 || res.status === 403) {
      console.error(`  Kein Zugriff (HTTP ${res.status}): ${res.data.message ?? ''}. Token oder App-Zugang pruefen.`);
      process.exitCode = 1;
      break;
    } else {
      posted.failures[pin.id] = (posted.failures[pin.id] ?? 0) + 1;
      console.warn(`  Fehler bei ${pin.id}: HTTP ${res.status} ${res.data.message ?? ''} (Versuch ${posted.failures[pin.id]}/3)`);
    }
  }
  if (!DRY) {
    savePosted(posted);
    writeJson(QUEUE_FILE, queueData);
  }
  setOutput('posted', done);
  setOutput('token_refreshed', refreshed ? 'true' : 'false');
  summary(`### Pinterest\n\n${DRY ? 'Probelauf' : `${done} Pin(s) gepostet`}, heute insgesamt ${today + done}/${PINS_PER_DAY}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
