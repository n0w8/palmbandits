// Rueckenmotiv der Nordwald Collection (Mike 18.11.2026: "die 5 sterne hinten oben. dann das nordwald logo auch",
// danach: "nordwald will ich mit dem logo haben" = sein NORDWALD-Logo aus "Grand Theft Auto/12_Logo/NORDWALD Logo.png").
// Oben 5 Fahndungssterne im Verlauf, darunter das Logo in Weiss (Kontur durchsichtig, wirkt auf schwarzem Stoff gleich).
// Das Logo vorher hochrechnen: merch/nordwald/logo/nordwald-gta-logo-weiss.png (siehe STAND.md 18.11.2026).
// Aufruf: node merch/ruecken-nordwald.mjs <logo-weiss.png> <ausgabe.png> [--preview vorschau.png]
import { readFileSync, writeFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { div, fonts, img, stars } from '../pinterest/render.mjs';
import { argValue } from '../lib/util.mjs';

const [, , logoFile, out] = process.argv;
if (!logoFile || !out) { console.log('Aufruf: node merch/ruecken-nordwald.mjs <logo-weiss.png> <ausgabe.png> [--preview vorschau.png]'); process.exit(1); }

const logo = readFileSync(logoFile);
const lw = logo.readUInt32BE(16);
const lh = logo.readUInt32BE(20);
const W = 3000;
const logoW = 2800;
const logoH = Math.round((lh / lw) * logoW);
const H = 330 + 140 + logoH + 80;

const el = div({ width: W, height: H, flexDirection: 'column', alignItems: 'center', paddingTop: 20 },
  stars(5, 330, 70),
  div({ marginTop: 140 }, img(`data:image/png;base64,${logo.toString('base64')}`, logoW, logoH)));

const svg = await satori(el, { width: W, height: H, fonts: fonts() });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
writeFileSync(out, png);
console.log(`${out}: ${W} x ${H}`);

const prev = argValue('preview');
if (prev) {
  const bg = div({ width: W, height: H, background: '#0b0b0d' }, img(`data:image/png;base64,${png.toString('base64')}`, W, H));
  const s2 = await satori(bg, { width: W, height: H, fonts: fonts() });
  writeFileSync(prev, new Resvg(s2, { fitTo: { mode: 'width', value: 900 } }).render().asPng());
}
