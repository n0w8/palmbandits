// Gemeinsame Helfer fuer News-Bot und Pinterest-Bot.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUTOMATION_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_DIR = path.resolve(AUTOMATION_DIR, '..');
// Name und Domain kommen aus der Website-Konfiguration (src/config.ts), damit es nur EINE Quelle gibt
const CONFIG_TS = (() => { try { return readFileSync(path.join(ROOT_DIR, 'src', 'config.ts'), 'utf8'); } catch { return ''; } })();
export const BRAND = process.env.BRAND || CONFIG_TS.match(/name:\s*'([^']+)'/)?.[1] || 'Palm Bandits';
const SITE_FROM_CONFIG = CONFIG_TS.match(/url:\s*'([^']+)'/)?.[1] || 'https://palmbandits.com';
export const DATA_DIR = process.env.WANTED_DATA_DIR || path.join(AUTOMATION_DIR, 'data');

// Lokale .env in automation/ (nur fuer Tests auf dem eigenen PC, wird nie committet).
export function loadDotEnv() {
  const file = path.join(AUTOMATION_DIR, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function env(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

export function envInt(name, fallback) {
  const v = parseInt(env(name, ''), 10);
  return Number.isFinite(v) ? v : fallback;
}

export function siteUrl() {
  return env('SITE_URL', SITE_FROM_CONFIG).replace(/\/+$/, '');
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

export function argValue(name, fallback = undefined) {
  const pre = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pre));
  if (hit) return hit.slice(pre.length);
  const i = process.argv.indexOf(`--${name}`);
  if (i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return fallback;
}

export function sha1(s, len = 16) {
  return createHash('sha1').update(String(s)).digest('hex').slice(0, len);
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch {
    return fallback;
  }
}

// Stabil formatiert (2 Leerzeichen, Zeilenumbruch am Ende), damit Git-Diffs klein bleiben.
export function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------- Zeit (immer deutsche Zeit, Europe/Berlin) ----------
const pad = (n) => String(n).padStart(2, '0');

function berlinParts(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
}

// 2026-11-17T09:30:00+01:00
export function berlinIso(date = new Date()) {
  const d = new Date(Math.floor(date.getTime() / 1000) * 1000);
  const p = berlinParts(d);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const off = Math.round((asUtc - d.getTime()) / 60000);
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

export function berlinDate(date = new Date()) {
  return berlinIso(date).slice(0, 10);
}

export function berlinHour(date = new Date()) {
  return parseInt(berlinParts(date).hour, 10);
}

export function germanDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

// Berliner Ortszeit (YYYY-MM-DD, HH:MM) -> Date (UTC)
export function berlinLocalToDate(day, hhmm) {
  const guess = new Date(`${day}T${hhmm}:00Z`);
  const iso = berlinIso(guess);
  const off = iso.slice(19); // +01:00
  return new Date(`${day}T${hhmm}:00${off}`);
}

// ---------- Text ----------
const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };

export function deUmlaut(s) {
  return String(s).replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c]);
}

// amp: Wort fuer "&" ("und" fuer deutsche, "and" fuer englische Slugs)
export function slugify(s, maxLen = 64, amp = 'und') {
  let slug = deUmlaut(String(s))
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ` ${amp} `)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length > maxLen) {
    slug = slug.slice(0, maxLen);
    const cut = slug.lastIndexOf('-');
    if (cut > 20) slug = slug.slice(0, cut);
  }
  return slug.replace(/-+$/g, '');
}

// Hausregel: keine langen Striche in Texten.
export function noLongDashes(s) {
  return String(s)
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s+[–—]\s+/g, ', ')
    .replace(/[–—]/g, '-');
}

export function hasLongDash(s) {
  return /[–—]/.test(String(s));
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '-', mdash: '-', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };

export function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function stripHtml(s) {
  return decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function truncate(s, max, ellipsis = '…') {
  s = String(s ?? '').trim();
  if (s.length <= max) return s;
  let cut = s.slice(0, max - ellipsis.length);
  const sp = cut.lastIndexOf(' ');
  if (sp > max * 0.6) cut = cut.slice(0, sp);
  return cut.replace(/[\s,.;:!?-]+$/, '') + ellipsis;
}

// YAML-Frontmatter schreiben. JSON-Strings sind gueltige YAML-Strings in doppelten Anfuehrungszeichen.
export function toFrontmatter(obj) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) { lines.push(`${key}: []`); continue; }
      lines.push(`${key}:`);
      for (const v of value) {
        if (v && typeof v === 'object') {
          const entries = Object.entries(v);
          entries.forEach(([k, val], i) => lines.push(`${i === 0 ? '  - ' : '    '}${k}: ${JSON.stringify(val)}`));
        } else {
          lines.push(`  - ${JSON.stringify(v)}`);
        }
      }
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (value instanceof Date) {
      lines.push(`${key}: ${berlinIso(value)}`);
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(value)) {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(String(value))}`);
    }
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

// GitHub-Actions-Ausgaben (fuer spaetere Workflow-Schritte)
export function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, `${name}=${String(value).replace(/\r?\n/g, ' ')}\n`);
}

export function summary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) appendFileSync(file, markdown + '\n');
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
