// Rückendruck "5 Sterne am Kragen" (Mike 18.11.2026: "am rücken oben beim kragen immer die 5 sterne").
// Gilt ab jetzt für alle PALM-BANDITS-Motive: vorne das Motiv, hinten oben unter dem Kragen die 5 Fahndungssterne im Verlauf.
// Gleiche Sterne wie im Nordwald-Rückenmotiv (automation/pinterest/render.mjs, stars()).
// Aufruf: node merch/ruecken-sterne.mjs <ausgabe.png> [--breite 3000] [--preview vorschau.png]
// Bei Spreadshirt etwa 22 bis 25 cm breit setzen, horizontal zentriert, oben im Rücken-Druckbereich.
import { writeFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { div, fonts, img, stars } from '../pinterest/render.mjs';
import { argValue } from '../lib/util.mjs';

const [, , out] = process.argv;
if (!out) { console.log('Aufruf: node merch/ruecken-sterne.mjs <ausgabe.png> [--breite 3000] [--preview vorschau.png]'); process.exit(1); }

const W = Number(argValue('breite') ?? 3000);
// 5 Sterne + 4 Abstände: Abstand = 0,2 x Sterngröße, kleiner Rand ringsum
const pad = Math.round(W * 0.01);
const size = Math.floor((W - 2 * pad) / (5 + 4 * 0.2));
const gap = Math.floor(size * 0.2);
const H = size + 2 * pad;

const el = div({ width: W, height: H, alignItems: 'center', justifyContent: 'center' }, stars(5, size, gap));
const svg = await satori(el, { width: W, height: H, fonts: fonts() });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
writeFileSync(out, png);
console.log(`${out}: ${W} x ${H} (Stern ${size} px, Abstand ${gap} px)`);

const prev = argValue('preview');
if (prev) {
  const bg = div({ width: W, height: H, background: '#0b0b0d' }, img(`data:image/png;base64,${png.toString('base64')}`, W, H));
  const s2 = await satori(bg, { width: W, height: H, fonts: fonts() });
  writeFileSync(prev, new Resvg(s2, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
}
