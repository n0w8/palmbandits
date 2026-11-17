// "NORDWALD" im Palm-Bandits-Logo-Stil (schraeg, Anton, Sonnenuntergangs-Verlauf, Fahndungssterne)
// plus Nordwald-Baum-Emblem im Verlauf. Transparente PNGs fuer schwarze Shirts/Hoodies.
// Aufruf: node merch/logo-nordwald.mjs <ausgabe-ordner>
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SUNSET, div, fonts, img, svgUri } from '../pinterest/render.mjs';

const outDir = process.argv[2];
if (!outDir) { console.log('Aufruf: node merch/logo-nordwald.mjs <ausgabe-ordner>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

// userSpaceOnUse: sonst verschwindet der senkrechte Stamm (Linie ohne Breite hat keinen Verlauf)
const GRAD = '<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="256" y2="256"><stop offset="0" stop-color="#ffd23f"/><stop offset="0.35" stop-color="#ff8a1f"/><stop offset="0.7" stop-color="#ff2d87"/><stop offset="1" stop-color="#8b3dff"/></linearGradient>';
// Nordwald-Emblem (Baum aus Runen-Strichen im Kreis), Farbe als Verlauf
const emblem = (size) => img(svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}"><defs>${GRAD}</defs>
  <circle cx="128" cy="128" r="117" fill="none" stroke="url(#g)" stroke-width="9"/>
  <g stroke="url(#g)" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M128 42 L74 110 M128 42 L182 110"/><path d="M128 88 L58 168 M128 88 L198 168"/><path d="M128 142 L80 202 M128 142 L176 202"/><path d="M128 42 V214"/>
  </g></svg>`), size, size);
const star = (size, filled) => img(svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><polygon points="32,3 40.5,22.5 61.5,24.5 45.5,38.5 50.5,59.5 32,48.5 13.5,59.5 18.5,38.5 2.5,24.5 23.5,22.5" fill="${filled ? '#ffffff' : 'none'}" stroke="#ffffff" stroke-width="${filled ? 0 : 5}" stroke-linejoin="round"/></svg>`), size, size);
const stars = (size, gap, n = 3) => div({ gap, alignItems: 'center' }, [0, 1, 2, 3, 4].map((i) => star(size, i < n)));
const word = (t, size) => div({ fontFamily: 'Anton', fontSize: size, lineHeight: 0.98, letterSpacing: size * 0.01, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent', transform: 'skewX(-9deg)' }, t);

async function render(name, el, W, H) {
  const svg = await satori(el, { width: W, height: H, fonts: fonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
  writeFileSync(path.join(outDir, `${name}.png`), png);
  // Vorschau auf schwarzem Stoff
  const prev = div({ width: W, height: H, background: '#0b0b0d' }, img(`data:image/png;base64,${png.toString('base64')}`, W, H));
  const s2 = await satori(prev, { width: W, height: H, fonts: fonts() });
  writeFileSync(path.join(outDir, `${name}-vorschau.png`), new Resvg(s2, { fitTo: { mode: 'width', value: 900 } }).render().asPng());
  console.log(`${name}: ${W} x ${H}`);
}

// 1) Gestapelt wie "PALM / BANDITS": NORD / WALD, darunter Sterne + Emblem
await render('nordwald-logo-gestapelt', div({ width: 3000, height: 2500, flexDirection: 'column', alignItems: 'flex-start', padding: '60px 160px' },
  word('NORD', 1000), word('WALD', 1000),
  div({ marginTop: 40, width: 2680, justifyContent: 'space-between', alignItems: 'center' }, stars(200, 40), emblem(380))), 3000, 2500);

// 2) Brustlogo quer: Emblem + NORDWALD + Sterne (klein vorne auf der Brust)
await render('nordwald-logo-quer', div({ width: 3000, height: 1000, alignItems: 'center', gap: 70, padding: '0 60px' },
  emblem(760),
  div({ flexDirection: 'column', gap: 30 }, word('NORDWALD', 520), stars(150, 30))), 3000, 1000);

// 3) Collection-Zeile: PALM BANDITS x NORDWALD
const line = (t, size) => div({ fontFamily: 'Anton', fontSize: size, lineHeight: 1, whiteSpace: 'nowrap', backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent', transform: 'skewX(-9deg)' }, t);
await render('collection-logo', div({ width: 3000, height: 1100, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 },
  div({ alignItems: 'center', gap: 50 }, line('PALM BANDITS', 250), div({ fontFamily: 'Anton', fontSize: 200, color: '#ffffff' }, '×'), line('NORDWALD', 250)),
  div({ alignItems: 'center', gap: 60, marginTop: 30 }, stars(140, 28), emblem(220))), 3000, 1100);
