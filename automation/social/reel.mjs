// Reels / Shorts / TikToks (9:16, 1080 x 1920, ca. 13 s) aus Cheats, News und Guides der Seite.
// Hintergrund: eigenes KI-Foto aus src/assets/pool mit langsamer Kamerafahrt. Text-Tafeln im Look der Website
// (gleiche Bausteine wie die Pinterest-Pins). Ton: Mikes eigener Song (public/audio/song.mp3), keine Fremdmusik.
// Keine Rockstar-Logos, keine offiziellen Bilder.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { BRAND, ROOT_DIR, noLongDashes, siteUrl, truncate } from '../lib/util.mjs';
import { pickCheat } from '../lib/cheat-of-day.mjs';
import { GAME_NAMES, GAME_TAGS } from '../pinterest/content.mjs';
import { C, SUNSET, SUNSET_V, buttonIcon, chip, div, fitText, fonts, gradientBar, parseSequence, stars } from '../pinterest/render.mjs';

export const RW = 1080;
export const RH = 1920;
export const FPS = 30;
export const DURATION = 13;
// Text bleibt in der sicheren Zone (oben Profilzeile, unten Caption und Buttons der Apps)
const PADX = 72;
const TOP = 250;
const BOTTOM = 480;
const INNER = RW - PADX * 2;
// Tafeln: [Start, Ende] in Sekunden, mit kurzer Ueberblendung
export const SLIDES = { hook: [0, 3.1], body: [2.9, 9.7], cta: [9.5, DURATION] };

const PHOTOS = {
  cheat: ['17-crt-retro', '20-controller', '19-glitch-city', '08-cash'],
  vehicle: ['12-garage', '14-retro-80s', '13-desert-highway', '15-90s-street'],
  news: ['23-launch-night', '01-neon-avenue', '00-sunset-skyline', '06-heli-searchlight', '05-police-chase', '07-marina'],
  guide: ['21-map-pins', '13-desert-highway', '02-overseas-bridge', '03-swamp-gator', '04-beach-sunset', '15-90s-street'],
};
const BASE_TAGS = ['gta', 'gaming', 'gamer', 'palmbandits'];
const VEHICLE = /spawn|fahrzeug|auto|wagen|panzer|jet|heli|flugzeug|motorrad|bike|boot|car|comet|limo/i;
// Kurze, vollstaendige Anleitung statt abgeschnittener Langtexte
const HOW = { pc: 'Im Spiel einfach eintippen, ohne Enter.', phone: 'Handy raus, Nummer wählen, anrufen.' };
const KIND_TAGS = { cheat: ['gtacheats', 'cheats'], news: ['gtanews', 'gamingnews'], guide: ['gtatipps', 'gtaguide'] };

const dayNo = (date) => Math.floor(date.getTime() / 86_400_000);
const isoDay = (date) => date.toISOString().slice(0, 10);
const gameName = (g) => GAME_NAMES[g] ?? 'GTA';
const domain = () => siteUrl().replace(/^https?:\/\//, '');

export function hashtags(kind, game) {
  // #gta6 nur bei GTA 6, Online und allgemeinen Themen, sonst die Tags des jeweiligen Teils
  const six = ['gta-6', 'gta-online', 'allgemein', undefined].includes(game) ? ['gta6'] : [];
  const tags = [...new Set([...BASE_TAGS.slice(0, 1), ...six, ...(GAME_TAGS[game] ?? []).slice(0, 2), ...KIND_TAGS[kind], ...BASE_TAGS.slice(1)])];
  return tags.slice(0, 10).map((t) => `#${t}`).join(' ');
}

function photoFor(kind, day) {
  const list = PHOTOS[kind];
  return path.join(ROOT_DIR, 'src', 'assets', 'pool', `${list[day % list.length]}.jpg`);
}

const toDate = (v) => (v instanceof Date ? v : new Date(v));
// Allgemeine Zwischenueberschriften taugen nicht als Punkt im Reel
const GENERIC_POINT = /^(die |das )?(kurzfassung|kurz gesagt|überblick|ueberblick|fazit|einleitung|zusammenfassung|faq|häufige fragen.*)$/i;

// ---------- Plaene: was kommt heute ----------
function cheatPlan(c, date) {
  const game = gameName(c.game);
  const lines = [
    c.pc && `PC: ${c.pc}`,
    c.playstation && `PlayStation: ${c.playstation}`,
    c.xbox && `Xbox: ${c.xbox}`,
    c.phone && `Handy: ${c.phone}`,
  ].filter(Boolean);
  const caption = [
    `🧾 Cheat des Tages: ${c.effect} (${game})`,
    '',
    ...lines,
    c.note ? `\nAchtung: ${c.note}` : null,
    '',
    `Alle ${game} Cheats mit Kopier-Button: Link in Bio 👉 ${domain()}`,
    'Cheats nur im Story-Modus. Spielstand vorher sichern.',
    '',
    hashtags('cheat', c.game),
  ].filter((x) => x !== null).join('\n');
  return {
    id: `${isoDay(date)}-cheat-${c.game}-${c.id}`,
    kind: 'cheat',
    photo: photoFor(VEHICLE.test(c.effect) ? 'vehicle' : 'cheat', dayNo(date)),
    hook: { label: `Cheat des Tages · ${game}`, title: c.effect, kicker: 'Kanntest du den schon?' },
    body: { code: c.pc ?? null, phone: c.phone ?? null, playstation: c.playstation, xbox: c.xbox, note: c.note, howTo: c.pc ? HOW.pc : c.phone ? HOW.phone : null },
    cta: { line: `Alle ${game} Cheats mit Kopier-Button` },
    url: `${siteUrl()}/cheats/${c.game}/#${c.id}`,
    caption: noLongDashes(caption),
  };
}

function newsPlan(n, date) {
  const d = n.data;
  const game = gameName(d.game);
  const caption = [
    `${d.breaking ? '🚨 BREAKING: ' : '📰 '}${d.title}`,
    '',
    truncate(d.description ?? '', 400),
    d.rumor ? '\nAchtung: Gerücht, nicht offiziell bestätigt.' : null,
    '',
    `Ganze Meldung mit Quellen: Link in Bio 👉 ${domain()}`,
    'News rund um die Uhr auch in unserem Discord.',
    '',
    hashtags('news', d.game),
  ].filter((x) => x !== null).join('\n');
  return {
    id: `${isoDay(date)}-news-${n.slug}`,
    kind: 'news',
    photo: photoFor('news', dayNo(date)),
    hook: { label: d.breaking ? 'Breaking News' : `News · ${game}`, title: d.title, kicker: d.rumor ? 'Gerücht' : 'Bestätigt' },
    body: { text: d.description ?? '', rumor: !!d.rumor, hype: d.hype ?? 3 },
    cta: { line: 'Ganze Meldung mit Quellen' },
    url: `${siteUrl()}/news/${n.slug}/`,
    caption: noLongDashes(caption),
  };
}

function guidePlan(g, date) {
  const d = g.data;
  const game = gameName(d.game);
  const clean = (t) => String(t).replace(/^\s*(schritt\s*)?\d+[.):]\s*/i, '').trim();
  const points = [...g.h2, ...g.list].map(clean).filter((t) => t && !GENERIC_POINT.test(t)).slice(0, 3);
  const caption = [
    `🧭 ${d.title}`,
    '',
    truncate(d.description ?? '', 300),
    '',
    ...points.map((p, i) => `${i + 1}. ${p}`),
    '',
    `Kompletter Guide: Link in Bio 👉 ${domain()}`,
    '',
    hashtags('guide', d.game),
  ].join('\n');
  return {
    id: `${isoDay(date)}-guide-${g.slug}`,
    kind: 'guide',
    photo: photoFor('guide', dayNo(date)),
    hook: { label: `Guide · ${game}`, title: d.title, kicker: 'Speichern für später' },
    body: { points },
    cta: { line: 'Kompletter Guide mit allen Schritten' },
    url: `${siteUrl()}/guides/${g.slug}/`,
    caption: noLongDashes(caption),
  };
}

// Pro Tag: Cheat des Tages, neueste News (nur wenn juenger als 36 Stunden), ein Guide im Wechsel
export function planReels(content, date = new Date()) {
  const plans = [];
  const cheat = pickCheat(content.cheats, date);
  if (cheat) plans.push(cheatPlan(cheat, date));
  const fresh = content.news
    .filter((n) => n.data.pubDate && date - toDate(n.data.pubDate) < 36 * 3600_000 && date - toDate(n.data.pubDate) >= 0)
    .sort((a, b) => toDate(b.data.pubDate) - toDate(a.data.pubDate));
  if (fresh[0]) plans.push(newsPlan(fresh[0], date));
  const guides = [...content.guides].sort((a, b) => a.slug.localeCompare(b.slug));
  if (guides.length) plans.push(guidePlan(guides[dayNo(date) % guides.length], date));
  return plans;
}

// ---------- Tafeln (transparente PNGs ueber dem Video) ----------
const frame = (...children) => div({ width: RW, height: RH, flexDirection: 'column', justifyContent: 'center', padding: `${TOP}px ${PADX}px ${BOTTOM}px`, color: C.text, fontFamily: 'Barlow' }, ...children);
const panel = (style, ...children) => div({ flexDirection: 'column', width: INNER, padding: '40px 44px', borderRadius: 36, background: 'rgba(7,6,11,0.78)', border: '2px solid rgba(244,241,250,0.16)', ...style }, ...children);
const PANEL_W = INNER - 88;
const label = (text) => div({ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 36, letterSpacing: 4, color: C.muted }, text);

async function bigTitle(text, { maxLines = 4, max = 150, min = 64, gradient = true } = {}) {
  const { size, lines } = await fitText(text.toUpperCase(), { maxLines, max, min, maxWidth: PANEL_W });
  const lineStyle = gradient ? { backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' } : { color: C.text };
  return div({ fontFamily: 'Anton', fontSize: size, lineHeight: 1.1, letterSpacing: 0.5, flexDirection: 'column' }, lines.map((l) => div(lineStyle, l)));
}

function keys(seq, platform) {
  const tokens = parseSequence(seq, platform).slice(0, 16);
  const size = tokens.length > 10 ? 58 : 66;
  return div({ flexWrap: 'wrap', gap: 12, width: PANEL_W },
    tokens.map((t) => div({
      height: size, minWidth: size, padding: '0 14px', borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      border: '2px solid rgba(244,241,250,0.22)', background: 'rgba(244,241,250,0.08)',
      fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 34, color: C.text,
    }, t.icon ? buttonIcon(t.icon, 34) : t.text)));
}

async function hookSlide(p) {
  return frame(panel({ gap: 0 },
    div({ flexWrap: 'wrap', gap: 12 }, chip(p.hook.label, { size: 36 })),
    div({ marginTop: 30 }, await bigTitle(p.hook.title, { maxLines: 4, max: 160 })),
    div({ marginTop: 30, alignItems: 'center', justifyContent: 'space-between', width: PANEL_W },
      div({ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 40, letterSpacing: 2, color: C.yellow }, p.hook.kicker.toUpperCase()),
      stars(5, 44, 6))));
}

async function cheatBody(p) {
  const b = p.body;
  const parts = [];
  // Ohne PC-Code (z. B. GTA IV) kommt die Handynummer gross in den Code-Kasten
  const main = b.code ?? b.phone;
  const mainLabel = b.code ? 'PC-CODE' : 'HANDY-NUMMER';
  if (main) {
    const fit = await fitText(String(main).toUpperCase(), { maxLines: 1, max: 140, min: 40, step: 2, maxWidth: PANEL_W - 70, spacing: 4 });
    parts.push(div({ flexDirection: 'column', gap: 6 }, label(mainLabel),
      div({ padding: 5, borderRadius: 26, backgroundImage: SUNSET, width: PANEL_W },
        div({ width: PANEL_W - 10, borderRadius: 22, background: '#100d18', padding: '14px 30px' },
          div({ fontFamily: 'Anton', fontSize: fit.size, letterSpacing: 4, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' }, fit.lines[0])))));
  }
  if (b.playstation) parts.push(div({ flexDirection: 'column', gap: 10 }, label('PLAYSTATION'), keys(b.playstation, 'playstation')));
  if (b.xbox && parts.length < 3) parts.push(div({ flexDirection: 'column', gap: 10 }, label('XBOX'), keys(b.xbox, 'xbox')));
  if (b.phone && b.code && parts.length < 3) parts.push(div({ alignItems: 'center', gap: 18 }, label('HANDY'), div({ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 50, color: C.teal }, b.phone)));
  if (b.note) parts.push(div({ fontFamily: 'Barlow', fontWeight: 700, fontSize: 36, lineHeight: 1.3, color: C.yellow }, truncate(`Achtung: ${b.note}`, 80)));
  parts.unshift(div({ fontFamily: 'Anton', fontSize: 64, lineHeight: 1.1, color: C.text }, truncate(p.hook.title.toUpperCase(), 34)));
  if (b.howTo) parts.push(div({ fontFamily: 'Barlow', fontWeight: 600, fontSize: 38, lineHeight: 1.3, color: 'rgba(244,241,250,0.9)' }, `So geht's: ${b.howTo}`));
  return frame(panel({ gap: 30 }, ...parts));
}

async function newsBody(p) {
  return frame(panel({ gap: 0 },
    div({ gap: 12, alignItems: 'center' },
      p.body.rumor ? chip('Gerücht', { color: C.orange, bg: 'rgba(255,138,31,0.10)', size: 36 }) : chip('Bestätigt', { size: 36 }),
      div({ marginLeft: 10, alignItems: 'center', gap: 14 }, label('HYPE'), stars(p.body.hype, 38, 6))),
    div({ marginTop: 28 }, gradientBar(260)),
    div({ marginTop: 30, fontFamily: 'Barlow', fontWeight: 500, fontSize: 46, lineHeight: 1.35, color: 'rgba(244,241,250,0.92)', width: PANEL_W }, truncate(p.body.text, 190))));
}

async function guideBody(p) {
  return frame(panel({ gap: 26 },
    label('DAS WICHTIGSTE'),
    ...p.body.points.map((t, i) => div({ alignItems: 'center', gap: 24 },
      div({ width: 74, height: 74, flexShrink: 0, borderRadius: 18, backgroundImage: SUNSET_V, alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', fontSize: 44, color: C.bg }, String(i + 1)),
      div({ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 48, lineHeight: 1.1, color: C.text, width: PANEL_W - 100 }, truncate(t, 52))))));
}

async function ctaSlide(p) {
  return frame(panel({ alignItems: 'center', gap: 0 },
    div({ fontFamily: 'Anton', fontSize: 120, letterSpacing: 3, lineHeight: 1.05, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' }, BRAND.toUpperCase()),
    div({ marginTop: 18 }, stars(5, 50, 8)),
    div({ marginTop: 34, fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 46, textAlign: 'center', color: C.text, justifyContent: 'center', width: PANEL_W }, p.cta.line),
    div({ marginTop: 30, width: PANEL_W, justifyContent: 'center', alignItems: 'center', borderRadius: 999, padding: '24px 30px', backgroundImage: SUNSET, color: C.bg, fontFamily: 'Anton', fontSize: 64, letterSpacing: 2 }, domain().toUpperCase()),
    div({ marginTop: 26, fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 38, letterSpacing: 3, color: C.teal }, 'LINK IN BIO · DISCORD-CREW BEITRETEN')));
}

const BODIES = { cheat: cheatBody, news: newsBody, guide: guideBody };

async function png(el) {
  const svg = await satori(el, { width: RW, height: RH, fonts: fonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: RW }, font: { loadSystemFonts: false } }).render().asPng();
}

export async function renderSlides(plan, dir) {
  mkdirSync(dir, { recursive: true });
  const files = {};
  for (const [name, el] of [['hook', await hookSlide(plan)], ['body', await BODIES[plan.kind](plan)], ['cta', await ctaSlide(plan)]]) {
    files[name] = path.join(dir, `${name}.png`);
    writeFileSync(files[name], await png(el));
  }
  return files;
}

// ---------- Video bauen (ffmpeg) ----------
export function ffmpegArgs({ photo, slides, audio, out }) {
  const frames = DURATION * FPS;
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', photo];
  for (const k of ['hook', 'body', 'cta']) args.push('-loop', '1', '-t', String(DURATION), '-i', slides[k]);
  if (audio) args.push('-t', String(DURATION), '-i', audio);
  else args.push('-f', 'lavfi', '-t', String(DURATION), '-i', 'anullsrc=r=44100:cl=stereo');
  const fade = 0.35;
  const parts = [
    // Foto auf Hochformat zuschneiden, langsam heranzoomen, abdunkeln
    `[0:v]scale=-2:${RH * 2},crop=${RW * 2}:${RH * 2},zoompan=z='1+0.12*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${RW}x${RH}:fps=${FPS},eq=brightness=-0.16:saturation=1.15,vignette=PI/4,format=yuv420p[bg]`,
  ];
  ['hook', 'body', 'cta'].forEach((k, i) => {
    const [s, e] = SLIDES[k];
    const outFade = k === 'cta' ? '' : `,fade=t=out:st=${(e - fade).toFixed(2)}:d=${fade}:alpha=1`;
    parts.push(`[${i + 1}:v]format=rgba,fade=t=in:st=${s.toFixed(2)}:d=${fade}:alpha=1${outFade}[s${i}]`);
  });
  parts.push('[bg][s0]overlay=0:0[v0]', '[v0][s1]overlay=0:0[v1]', '[v1][s2]overlay=0:0,format=yuv420p[v]');
  parts.push(`[4:a]afade=t=in:st=0:d=0.4,afade=t=out:st=${DURATION - 1.2}:d=1.2[a]`);
  args.push('-filter_complex', parts.join(';'), '-map', '[v]', '-map', '[a]', '-t', String(DURATION),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', String(FPS), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', out);
  return args;
}

export async function renderReel(plan, outDir) {
  const dir = path.join(outDir, plan.id);
  const slides = await renderSlides(plan, dir);
  const song = path.join(ROOT_DIR, 'public', 'audio', 'song.mp3');
  const video = path.join(dir, 'reel.mp4');
  execFileSync('ffmpeg', ffmpegArgs({ photo: plan.photo, slides, audio: existsSync(song) ? song : null, out: video }), { stdio: 'pipe' });
  // Titelbild fuer Instagram/YouTube: Moment, in dem der Haken voll sichtbar ist
  const cover = path.join(dir, 'cover.jpg');
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '1.5', '-i', video, '-frames:v', '1', '-q:v', '3', cover], { stdio: 'pipe' });
  writeFileSync(path.join(dir, 'caption.txt'), plan.caption + '\n');
  writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({ ...plan, photo: path.basename(plan.photo) }, null, 2) + '\n');
  return { dir, video, cover };
}
