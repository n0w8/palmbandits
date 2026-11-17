// Instagram-Reels ueber die Meta Graph API (Instagram mit Facebook-Login), wie in Mikes Instagram-Automation.
// Video wird direkt hochgeladen (Resumable Upload), es braucht keinen oeffentlichen Video-Link.
// Schluessel nur aus der Umgebung (IG_ACCESS_TOKEN), er geht nur im Authorization-Header raus und wird nie ausgegeben.
import { readFileSync, statSync } from 'node:fs';
import { env } from '../lib/util.mjs';

const version = () => env('IG_GRAPH_VERSION', 'v26.0');
const base = () => `https://graph.facebook.com/${version()}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function igConfig() {
  const userId = env('IG_USER_ID');
  const token = env('IG_ACCESS_TOKEN');
  return userId && token ? { userId, token } : null;
}

async function call(method, route, params, token) {
  const url = new URL(route.startsWith('http') ? route : `${base()}/${route}`);
  const opts = { method, headers: { Authorization: `OAuth ${token}` } };
  const set = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null);
  if (method === 'GET') for (const [k, v] of set) url.searchParams.set(k, String(v));
  else opts.body = new URLSearchParams(set.map(([k, v]) => [k, String(v)]));
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(60_000) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok || data.error) throw new Error(`Instagram ${res.status}: ${data.error?.message ?? data.raw ?? 'unbekannter Fehler'}`);
  return data;
}

export async function publishReel({ userId, token }, { video, caption, log = console.log }) {
  const container = await call('POST', `${userId}/media`, { media_type: 'REELS', caption, share_to_feed: true, thumb_offset: 1500, upload_type: 'resumable' }, token);
  const size = statSync(video).size;
  const uri = container.uri || `https://rupload.facebook.com/ig-api-upload/${version()}/${container.id}`;
  const up = await fetch(uri, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(size) },
    body: readFileSync(video),
    signal: AbortSignal.timeout(300_000),
  });
  if (!up.ok) throw new Error(`Instagram-Upload fehlgeschlagen (${up.status}): ${(await up.text()).slice(0, 200)}`);
  // warten, bis Instagram das Video verarbeitet hat
  const until = Date.now() + 10 * 60_000;
  for (;;) {
    const s = await call('GET', container.id, { fields: 'status_code,status' }, token);
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram-Verarbeitung: ${s.status_code} ${s.status ?? ''}`);
    if (Date.now() > until) throw new Error('Instagram: Video nach 10 Minuten nicht fertig verarbeitet.');
    await sleep(5000);
  }
  const pub = await call('POST', `${userId}/media_publish`, { creation_id: container.id }, token);
  const info = await call('GET', pub.id, { fields: 'permalink' }, token).catch(() => ({}));
  log(`Instagram: veroeffentlicht ${info.permalink ?? pub.id}`);
  return { id: pub.id, permalink: info.permalink };
}
