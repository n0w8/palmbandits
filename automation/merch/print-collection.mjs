// Druckdateien fuer die Nordwald x Palm Bandits Collection: Motiv (Hintergrund schon durchsichtig,
// siehe merch/nordwald/make_print.py) + Figurenname + "PALM BANDITS x NORDWALD" in der Website-Schrift.
// Transparentes PNG fuer schwarze Shirts und Hoodies (Spreadshirt: mind. 200 dpi auf der Druckflaeche).
// Aufruf: node merch/print-collection.mjs <motiv-alpha.png> <NAME> <ausgang.png> [--preview vorschau.jpg]
import { readFileSync, writeFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { C, SUNSET, div, fonts, img, stars } from '../pinterest/render.mjs';
import { argValue } from '../lib/util.mjs';

const [, , src, name, out] = process.argv;
if (!src || !name || !out) { console.log('Aufruf: node merch/print-collection.mjs <motiv-alpha.png> <NAME> <ausgang.png>'); process.exit(1); }

const buf = readFileSync(src);
const w0 = buf.readUInt32BE(16);
const h0 = buf.readUInt32BE(20);
const W = 3000;
const artW = 2700;
const artH = Math.round((h0 / w0) * artW);
const H = artH + 830 + 230;

const el = div({ width: W, height: H, flexDirection: 'column', alignItems: 'center' },
  // einheitlich 5 Sterne ueber jedem Motiv (die KI-Sterne schneidet make_print.py --ohne-sterne ab)
  div({ marginBottom: 50 }, stars(5, 180, 44)),
  img(`data:image/png;base64,${buf.toString('base64')}`, artW, artH),
  div({ marginTop: 110, fontFamily: 'Anton', fontSize: 360, lineHeight: 1, letterSpacing: 18, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' }, name.toUpperCase()),
  div({ marginTop: 50, fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 120, letterSpacing: 36, color: C.text }, 'PALM BANDITS × NORDWALD'));

const svg = await satori(el, { width: W, height: H, fonts: fonts() });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
writeFileSync(out, png);
console.log(`${out}: ${W} x ${H}`);

// Vorschau auf schwarzem Stoff (nur zum Ansehen)
const prev = argValue('preview');
if (prev) {
  const bg = div({ width: W, height: H, background: '#0b0b0d' }, img(`data:image/png;base64,${png.toString('base64')}`, W, H));
  const s2 = await satori(bg, { width: W, height: H, fonts: fonts() });
  writeFileSync(prev, new Resvg(s2, { fitTo: { mode: 'width', value: 900 } }).render().asPng());
}
