// Rendert Pinterest-Pins (1000 x 1500 PNG) mit satori + resvg im Look der Website.
// Keine Rockstar- oder GTA-Logos, keine offiziellen Bilder: nur Schrift, Formen und eigene Grafik.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { AUTOMATION_DIR, truncate, BRAND } from '../lib/util.mjs';
import { wallpaperSvg } from './wallpaper.mjs';

export const W = 1000;
export const H = 1500;
const PAD = 64;
const INNER = W - PAD * 2;

export const C = {
  bg: '#07060b',
  yellow: '#ffd23f',
  orange: '#ff8a1f',
  pink: '#ff2d87',
  purple: '#8b3dff',
  teal: '#19e3c8',
  text: '#f4f1fa',
  muted: '#a49fb3',
  line: 'rgba(244,241,250,0.14)',
};
export const SUNSET = `linear-gradient(90deg, ${C.yellow}, ${C.orange}, ${C.pink}, ${C.purple})`;
const SUNSET_V = `linear-gradient(180deg, ${C.yellow}, ${C.orange} 35%, ${C.pink} 70%, ${C.purple})`;

// ---------- Schriften ----------
const FONT_DIR = path.join(AUTOMATION_DIR, 'node_modules', '@fontsource');
function font(pkg, file, name, weight) {
  return ['latin', 'latin-ext'].map((subset) => ({
    name, weight, style: 'normal',
    data: readFileSync(path.join(FONT_DIR, pkg, 'files', `${file}-${subset}-${weight}-normal.woff`)),
  }));
}
let FONTS;
function fonts() {
  FONTS ??= [
    ...font('anton', 'anton', 'Anton', 400),
    ...font('barlow', 'barlow', 'Barlow', 500),
    ...font('barlow', 'barlow', 'Barlow', 700),
    ...font('barlow-condensed', 'barlow-condensed', 'Barlow Condensed', 600),
    ...font('barlow-condensed', 'barlow-condensed', 'Barlow Condensed', 700),
    ...font('barlow-condensed', 'barlow-condensed', 'Barlow Condensed', 800),
  ];
  return FONTS;
}

// ---------- Element-Helfer (satori ohne JSX) ----------
function h(type, style, ...children) {
  const kids = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false && c !== '');
  const props = { style: type === 'div' ? { display: 'flex', boxSizing: 'border-box', ...style } : style };
  if (kids.length) props.children = kids.length === 1 ? kids[0] : kids;
  return { type, props };
}
const div = (style, ...children) => h('div', style, ...children);
function img(src, width, height, style = {}) {
  return { type: 'img', props: { src, width, height, style: { width, height, ...style } } };
}
const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// ---------- Textmessung (fuer automatische Schriftgroesse) ----------
const widthCache = new Map();
async function charWidth(ch, family, weight) {
  const key = `${family}|${weight}|${ch}`;
  if (widthCache.has(key)) return widthCache.get(key);
  let w;
  if (ch === ' ') {
    w = (await measureRaw(`H${' '.repeat(10)}H`, family, weight) - await measureRaw('HH', family, weight)) / 10;
  } else {
    w = await measureRaw(ch.repeat(10), family, weight) / 10;
  }
  widthCache.set(key, w);
  return w;
}
// Rendert Text bei 100 px und liest die groesste x-Koordinate der Glyphen-Pfade
async function measureRaw(text, family, weight) {
  const svg = await satori(div({ fontFamily: family, fontWeight: weight, fontSize: 100, color: '#fff', whiteSpace: 'pre' }, text), { width: 4000, height: 160, fonts: fonts() });
  let max = 0;
  for (const m of svg.matchAll(/ d="([^"]+)"/g)) {
    const nums = m[1].match(/-?\d*\.?\d+(e-?\d+)?/g) ?? [];
    for (let i = 0; i < nums.length; i += 2) max = Math.max(max, parseFloat(nums[i]));
  }
  return max;
}
export async function textWidth(text, { family = 'Anton', weight = 400, size = 100, spacing = 0 } = {}) {
  let w = 0;
  for (const ch of text) w += await charWidth(ch, family, weight);
  return (w * size) / 100 + spacing * text.length;
}
async function wrapLines(text, opts, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (!cur || await textWidth(test, opts) <= maxWidth) cur = test;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  let widest = 0;
  for (const l of lines) widest = Math.max(widest, await textWidth(l, opts));
  return { lines, widest };
}
// Groesste Schriftgroesse, bei der der Text in maxLines Zeilen passt
export async function fitText(text, { family = 'Anton', weight = 400, maxWidth = INNER, maxLines = 4, min = 60, max = 170, step = 4, spacing = 0 } = {}) {
  for (let size = max; size >= min; size -= step) {
    const { lines, widest } = await wrapLines(text, { family, weight, size, spacing }, maxWidth * 0.97);
    if (lines.length <= maxLines && widest <= maxWidth * 0.97) return { size, lines };
  }
  const { lines } = await wrapLines(text, { family, weight, size: min, spacing }, maxWidth * 0.97);
  return { size: min, lines: lines.slice(0, maxLines), clipped: lines.length > maxLines };
}

// ---------- Grafische Bausteine ----------
function starSvg(fill, size = 64, stroke = null) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 30 : 13;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(32 + r * Math.cos(a)).toFixed(2)},${(33 + r * Math.sin(a)).toFixed(2)}`);
  }
  const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.yellow}"/><stop offset="0.5" stop-color="${C.orange}"/><stop offset="1" stop-color="${C.pink}"/></linearGradient></defs>`;
  const f = fill === 'grad' ? 'url(#g)' : fill;
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${defs}<polygon points="${pts.join(' ')}" fill="${f}" ${stroke ? `stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"` : ''}/></svg>`);
}

// 5-Sterne-Fahndungslevel
function stars(level = 5, size = 46, gap = 8) {
  return div({ gap, alignItems: 'center' },
    [0, 1, 2, 3, 4].map((i) => img(i < level ? starSvg('grad', size) : starSvg('none', size, 'rgba(244,241,250,0.35)'), size, size)));
}

function wordmark(size = 54) {
  return div({ alignItems: 'center', gap: 14 },
    div({ fontFamily: 'Anton', fontSize: size, letterSpacing: 2, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent', lineHeight: 1 }, BRAND.toUpperCase()));
}

function chip(text, { color = C.teal, bg = 'rgba(25,227,200,0.10)', size = 30 } = {}) {
  return div({
    fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: size, letterSpacing: 3, color,
    border: `3px solid ${color}`, background: bg, borderRadius: 999, padding: '6px 22px', lineHeight: 1.1,
  }, text.toUpperCase());
}

function gradientBar(width = 260, height = 12) {
  return div({ width, height, borderRadius: height, backgroundImage: SUNSET });
}

function background(children, { glowTop = 'rgba(255,45,135,0.30)', glowBottom = 'rgba(139,61,255,0.30)' } = {}) {
  return div({
    width: W, height: H, position: 'relative', flexDirection: 'column', background: C.bg,
    backgroundImage: `radial-gradient(circle at 88% 6%, ${glowTop}, transparent 42%), radial-gradient(circle at 6% 96%, ${glowBottom}, transparent 48%)`,
    color: C.text, fontFamily: 'Barlow',
  },
  // Scanlines
  div({ position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 2px, transparent 2px, transparent 6px)' }),
  // Sonnenuntergangs-Kante oben
  div({ position: 'absolute', left: 0, top: 0, width: W, height: 10, backgroundImage: SUNSET }),
  div({ position: 'absolute', left: 0, top: 0, width: W, height: H, flexDirection: 'column', padding: `${PAD}px ${PAD}px 48px` }, children));
}

function header(level = 5) {
  return div({ justifyContent: 'space-between', alignItems: 'center', width: INNER }, wordmark(), stars(level));
}

function cta(text) {
  return div({
    width: INNER, justifyContent: 'center', alignItems: 'center', borderRadius: 22, padding: '26px 30px',
    backgroundImage: SUNSET, color: C.bg, fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 44, letterSpacing: 1.5,
  }, text.toUpperCase());
}

function footer(domain) {
  return div({ flexDirection: 'column', width: INNER, gap: 18, marginTop: 'auto' },
    div({ justifyContent: 'space-between', alignItems: 'center', width: INNER, fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: 24, color: C.muted, letterSpacing: 1 },
      div({}, domain.toUpperCase()), div({}, 'FAN-SEITE, NICHT OFFIZIELL VON ROCKSTAR')));
}

async function headline(text, { maxLines = 4, max = 168, min = 64, width = INNER, color = C.text, gradient = false } = {}) {
  const upper = text.toUpperCase();
  const { size, lines } = await fitText(upper, { maxLines, max, min, maxWidth: width });
  const style = { fontFamily: 'Anton', fontSize: size, lineHeight: 1.12, letterSpacing: 0.5, flexDirection: 'column' };
  const lineStyle = gradient ? { backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' } : { color };
  return div(style, lines.map((l) => div({ ...lineStyle }, l)));
}

// ---------- Tasten fuer Konsolen-Cheats ----------
function buttonIcon(kind, size = 40) {
  const s = '#f4f1fa';
  const shapes = {
    kreis: `<circle cx="20" cy="20" r="12" fill="none" stroke="${s}" stroke-width="4"/>`,
    dreieck: `<polygon points="20,7 33,31 7,31" fill="none" stroke="${s}" stroke-width="4" stroke-linejoin="round"/>`,
    quadrat: `<rect x="8" y="8" width="24" height="24" fill="none" stroke="${s}" stroke-width="4"/>`,
    kreuz: `<path d="M9 9 L31 31 M31 9 L9 31" stroke="${s}" stroke-width="4" stroke-linecap="round"/>`,
    oben: `<path d="M20 7 L32 22 H24 V33 H16 V22 H8 Z" fill="${s}"/>`,
  };
  const rot = { unten: 180, links: 270, rechts: 90 }[kind];
  const inner = rot !== undefined ? `<g transform="rotate(${rot} 20 20)">${shapes.oben}</g>` : shapes[kind];
  return img(svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${inner}</svg>`), size, size);
}
const BUTTON_WORDS = {
  kreis: 'kreis', circle: 'kreis', o: 'kreis', dreieck: 'dreieck', triangle: 'dreieck', quadrat: 'quadrat', square: 'quadrat',
  x: 'kreuz', kreuz: 'kreuz', cross: 'kreuz', links: 'links', left: 'links', '←': 'links', rechts: 'rechts', right: 'rechts', '→': 'rechts',
  oben: 'oben', up: 'oben', '↑': 'oben', unten: 'unten', down: 'unten', '↓': 'unten',
};
export function parseSequence(seq, platform) {
  return String(seq).split(/\s*,\s*|\s+(?=[←→↑↓])/).map((t) => t.trim()).filter(Boolean).map((t) => {
    const k = t.toLowerCase();
    // Bei Xbox ist "X" eine Taste mit Buchstaben, kein PlayStation-Kreuz
    if (platform === 'xbox' && ['x', 'kreuz'].includes(k)) return { text: 'X' };
    if (BUTTON_WORDS[k]) return { icon: BUTTON_WORDS[k] };
    return { text: t.toUpperCase() };
  });
}
function keycaps(tokens, { size = 64 } = {}) {
  return div({ flexWrap: 'wrap', gap: 12, width: INNER },
    tokens.map((t) => div({
      height: size, minWidth: size, padding: '0 14px', borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      border: `2px solid ${C.line}`, background: 'rgba(244,241,250,0.06)',
      fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 34, color: C.text,
    }, t.icon ? buttonIcon(t.icon, 34) : t.text)));
}

// ---------- Pin-Typen ----------
// Mittelteil fuellt den Platz zwischen Kopf und CTA und wird vertikal zentriert
const middle = (...children) => div({ flexDirection: 'column', flexGrow: 1, justifyContent: 'center', width: INNER, paddingBottom: 20 }, ...children);
const bottom = (p) => div({ flexDirection: 'column', gap: 22, width: INNER }, cta(p.cta), footer(p.domain));
const label = (text) => div({ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 30, letterSpacing: 4, color: C.muted }, text);

async function guidePin(p) {
  const bullets = p.bullets.slice(0, 5);
  const head = await headline(p.headline, { maxLines: bullets.length > 3 ? 3 : 4, max: 150, min: 70 });
  return background([
    header(p.stars ?? 4),
    middle(
      div({ gap: 14 }, chip(`Guide · ${p.gameName}`), p.difficulty ? chip(p.difficulty, { color: C.yellow, bg: 'rgba(255,210,63,0.08)' }) : null),
      div({ marginTop: 30 }, head),
      div({ marginTop: 26 }, gradientBar(300)),
      p.text ? div({ marginTop: 30, fontFamily: 'Barlow', fontWeight: 500, fontSize: 34, lineHeight: 1.35, color: 'rgba(244,241,250,0.82)', width: INNER }, truncate(p.text, bullets.length >= 4 ? 110 : 170)) : null,
      bullets.length ? div({ flexDirection: 'column', marginTop: 36, gap: 20, width: INNER },
        bullets.map((b, i) => div({ alignItems: 'center', gap: 22 },
          div({ width: 62, height: 62, flexShrink: 0, borderRadius: 16, backgroundImage: SUNSET_V, alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton', fontSize: 36, color: C.bg }, String(i + 1)),
          div({ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 42, lineHeight: 1.1, color: C.text, width: INNER - 84 }, truncate(b, 46))))) : null),
    bottom(p),
  ]);
}

async function tipsPin(p) {
  const items = p.bullets.slice(0, 7);
  const n = String(p.count ?? items.length);
  const head = await headline(p.headline, { maxLines: 3, max: 92, min: 56, width: INNER });
  return background([
    header(p.stars ?? 3),
    middle(
      div({ alignItems: 'flex-end', gap: 28 },
        div({ fontFamily: 'Anton', fontSize: 300, lineHeight: 0.95, backgroundImage: SUNSET_V, backgroundClip: 'text', color: 'transparent' }, n),
        div({ flexDirection: 'column', marginBottom: 30, gap: 14, alignItems: 'flex-start' },
          div({ fontFamily: 'Anton', fontSize: p.word && p.word.length > 8 ? 92 : 112, lineHeight: 1, color: C.text }, p.word ?? 'TIPPS'),
          chip(p.gameName, { size: 28 }))),
      div({ marginTop: 22 }, head),
      div({ flexDirection: 'column', marginTop: 30, width: INNER, borderTop: `2px solid ${C.line}` },
        items.map((b, i) => div({ alignItems: 'center', gap: 20, padding: '15px 0', borderBottom: `2px solid ${C.line}` },
          div({ fontFamily: 'Anton', fontSize: 38, width: 56, color: C.teal }, String(i + 1).padStart(2, '0')),
          div({ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 38, color: C.text, width: INNER - 76 }, truncate(b, 46)))))),
    bottom(p),
  ], { glowTop: 'rgba(25,227,200,0.20)', glowBottom: 'rgba(255,45,135,0.28)' });
}

async function cheatPin(p) {
  const code = p.code ? String(p.code) : null;
  const seq0 = p.sequence ? parseSequence(p.sequence, p.sequencePlatform) : [];
  const busy = (p.code ? 1 : 0) + (seq0.length ? 1 : 0) + (p.phone ? 1 : 0) + (p.howTo || p.note ? 1 : 0);
  const head = await headline(p.headline, { maxLines: busy >= 4 ? 2 : 3, max: busy >= 4 ? 100 : busy <= 2 ? 150 : 118, min: 56 });
  const codeFit = code ? await fitText(code.toUpperCase(), { maxLines: 1, max: busy <= 2 ? 210 : 170, min: 34, step: 2, maxWidth: INNER - 90, spacing: 4 }) : null;
  const seq = p.sequence ? parseSequence(p.sequence, p.sequencePlatform) : null;
  return background([
    header(5),
    middle(
      div({ gap: 14, flexWrap: 'wrap', width: INNER }, chip(`Cheat · ${p.gameName}`), p.category ? chip(p.category, { color: C.yellow, bg: 'rgba(255,210,63,0.08)' }) : null),
      div({ marginTop: 26 }, head),
      code ? div({ marginTop: 32, padding: 5, borderRadius: 30, backgroundImage: SUNSET, width: INNER },
        div({ flexDirection: 'column', width: INNER - 10, borderRadius: 26, background: '#100d18', padding: '22px 38px 26px' },
          label(p.codeLabel ?? 'PC-CODE'),
          div({ fontFamily: 'Anton', fontSize: codeFit.size, letterSpacing: 4, lineHeight: 1.12, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' }, codeFit.lines[0]))) : null,
      seq ? div({ flexDirection: 'column', marginTop: 32, gap: 14 }, label(p.sequenceLabel ?? 'KONSOLE'), keycaps(seq.slice(0, 16), { size: seq.length > 10 ? 56 : 64 })) : null,
      p.phone ? div({ marginTop: 28, alignItems: 'center', gap: 18 }, label('HANDY'),
        div({ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 44, color: C.teal }, p.phone)) : null,
      p.howTo || p.note ? div({ marginTop: 30, flexDirection: 'column', gap: 8, width: INNER, padding: '18px 24px', borderLeft: `6px solid ${C.teal}`, background: 'rgba(25,227,200,0.06)', borderRadius: 10 },
        p.howTo ? div({ fontFamily: 'Barlow', fontWeight: 500, fontSize: 30, lineHeight: 1.3, color: 'rgba(244,241,250,0.85)' }, truncate(`So geht's: ${p.howTo}`, 120)) : null,
        p.note ? div({ fontFamily: 'Barlow', fontWeight: 700, fontSize: 28, lineHeight: 1.3, color: C.yellow }, truncate(`Achtung: ${p.note}`, 90)) : null) : null),
    bottom(p),
  ], { glowTop: 'rgba(255,138,31,0.28)', glowBottom: 'rgba(139,61,255,0.32)' });
}

async function newsPin(p) {
  const head = await headline(p.headline, { maxLines: 5, max: 150, min: 64 });
  const badge = p.rumor
    ? chip('Gerücht', { color: C.orange, bg: 'rgba(255,138,31,0.10)' })
    : chip('Bestätigt', { color: C.teal });
  return background([
    header(p.hype ?? 3),
    middle(
      div({ gap: 14, alignItems: 'center' },
        p.breaking
          ? div({ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 32, letterSpacing: 4, color: C.bg, background: C.pink, borderRadius: 999, padding: '8px 24px' }, 'BREAKING')
          : chip('News', { color: C.pink, bg: 'rgba(255,45,135,0.10)' }),
        badge,
        div({ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 30, color: C.muted, marginLeft: 6 }, p.date)),
      div({ marginTop: 32 }, head),
      div({ marginTop: 28 }, gradientBar(300)),
      div({ marginTop: 32, fontFamily: 'Barlow', fontWeight: 500, fontSize: 40, lineHeight: 1.35, color: 'rgba(244,241,250,0.86)', width: INNER }, truncate(p.text, 170)),
      div({ marginTop: 38, alignItems: 'center', gap: 20 }, label('HYPE-LEVEL'), stars(p.hype ?? 3, 44, 8))),
    bottom(p),
  ]);
}

async function wallpaperPin(p) {
  return div({ width: W, height: H, position: 'relative', background: C.bg },
    img(svgUri(wallpaperSvg(p.seed ?? 1, W, H)), W, H, { position: 'absolute', left: 0, top: 0 }),
    div({ position: 'absolute', left: 0, bottom: 40, width: W, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 6 },
      div({ fontFamily: 'Anton', fontSize: 46, letterSpacing: 6, color: 'rgba(244,241,250,0.92)' }, BRAND.toUpperCase()),
      div({ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 24, letterSpacing: 4, color: 'rgba(244,241,250,0.65)' }, p.domain.toUpperCase())));
}

async function factPin(p) {
  const head = await headline(p.headline, { maxLines: 3, max: 140, min: 64, gradient: true });
  return background([
    header(5),
    middle(
      div({ gap: 14, alignItems: 'center', flexWrap: 'wrap', width: INNER },
        chip('GTA-Fakt', { color: C.yellow, bg: 'rgba(255,210,63,0.08)' }),
        chip(p.gameName, { size: 28 })),
      div({ marginTop: 30 }, head),
      div({ marginTop: 28 }, gradientBar(300)),
      div({ marginTop: 32, fontFamily: 'Barlow', fontWeight: 600, fontSize: 44, lineHeight: 1.35, color: 'rgba(244,241,250,0.92)', width: INNER }, truncate(p.text, 200)),
      div({ marginTop: 30, fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 28, letterSpacing: 1, color: C.muted }, truncate(`Quelle: ${p.source}`, 70))),
    bottom(p),
  ], { glowTop: 'rgba(255,210,63,0.24)', glowBottom: 'rgba(25,227,200,0.24)' });
}

const RENDERERS = { guide: guidePin, tips: tipsPin, cheat: cheatPin, news: newsPin, wallpaper: wallpaperPin, fact: factPin };

export async function renderPin(design) {
  const el = await RENDERERS[design.type](design);
  const svg = await satori(el, { width: W, height: H, fonts: fonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
}

// Bausteine auch fuer die Reels (social/reel.mjs), damit alles gleich aussieht
export { fonts, div, img, svgUri, stars, wordmark, chip, gradientBar, buttonIcon, label, SUNSET_V };
