// Schlanker Discord-REST-Client (API v10) mit Rate-Limit-Behandlung. Keine Abhaengigkeiten.
// Der Bot-Token kommt nur aus der Umgebung (DISCORD_BOT_TOKEN) und wird nie ausgegeben.
import { env } from '../lib/util.mjs';

const BASE = 'https://discord.com/api/v10';

export function botToken() {
  const t = env('DISCORD_BOT_TOKEN');
  if (!t) throw new Error('DISCORD_BOT_TOKEN fehlt (in automation/.env oder als GitHub-Secret eintragen).');
  return t;
}

export async function api(method, route, body, { token = botToken(), reason, tries = 5 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const res = await fetch(BASE + route, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://github.com, 1.0) WantedSetup',
        ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const wait = Math.ceil((data.retry_after ?? 2) * 1000) + 250;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(`${method} ${route} -> HTTP ${res.status}: ${JSON.stringify(data?.errors ?? data?.message ?? data).slice(0, 600)}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    // sanft drosseln, wenn das Kontingent fast leer ist
    if (res.headers.get('x-ratelimit-remaining') === '0') {
      const after = parseFloat(res.headers.get('x-ratelimit-reset-after') ?? '1');
      await new Promise((r) => setTimeout(r, after * 1000 + 100));
    }
    return data;
  }
  throw new Error(`${method} ${route}: zu viele Rate-Limits`);
}

// Webhook-Aufruf (ohne Bot-Token, URL ist selbst das Geheimnis)
export async function postWebhook(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
  return true;
}

// Nachricht mit Datei-Anhang senden (multipart). files: [{ name, data, type }]
export async function apiUpload(route, payload, files, { token = botToken(), tries = 5 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const fd = new FormData();
    fd.append('payload_json', JSON.stringify({ ...payload, attachments: files.map((f, i) => ({ id: i, filename: f.name })) }));
    files.forEach((f, i) => fd.append(`files[${i}]`, new Blob([f.data], { type: f.type ?? 'application/octet-stream' }), f.name));
    const res = await fetch(BASE + route, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'User-Agent': 'DiscordBot (https://github.com, 1.0) WantedSetup' },
      body: fd,
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, Math.ceil((data.retry_after ?? 2) * 1000) + 250));
      continue;
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(`POST ${route} (Datei) -> HTTP ${res.status}: ${JSON.stringify(data?.errors ?? data?.message ?? data).slice(0, 600)}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }
  throw new Error(`POST ${route}: zu viele Rate-Limits`);
}

// Discord-Snowflake erzeugen (fuer neue Onboarding-Prompts/Optionen)
let seq = 0n;
export function snowflake() {
  seq = (seq + 1n) % 4096n;
  return (((BigInt(Date.now()) - 1420070400000n) << 22n) | seq).toString();
}

// Berechtigungs-Bits
export const P = {
  CREATE_INVITE: 1n << 0n,
  KICK: 1n << 1n,
  BAN: 1n << 2n,
  ADMIN: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  STREAM: 1n << 9n,
  VIEW: 1n << 10n,
  SEND: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED: 1n << 14n,
  ATTACH: 1n << 15n,
  HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  EXTERNAL_EMOJIS: 1n << 18n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE: 1n << 22n,
  MOVE: 1n << 24n,
  VAD: 1n << 25n,
  CHANGE_NICK: 1n << 26n,
  MANAGE_NICKS: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  SLASH: 1n << 31n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_THREADS: 1n << 35n,
  THREAD_SEND: 1n << 38n,
  TIMEOUT: 1n << 40n,
  VOICE_MSG: 1n << 46n,
  POLLS: 1n << 49n,
};
export const bits = (...xs) => xs.reduce((a, b) => a | b, 0n).toString();
