// Einfache Shirt-Vorschau (vorne Brustlogo, hinten Motiv) zum Abstimmen mit Mike. Kein Ersatz fuer die Spreadshirt-Mockups.
// Aufruf: node merch/mockup.mjs <brustlogo.png> <ruecken.png> <ausgabe.png> [Titel]
import { readFileSync, writeFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { C, div, fonts, img, svgUri } from '../pinterest/render.mjs';

const [, , front, back, out, title = ''] = process.argv;
const dims = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const uri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const fb = readFileSync(front);
const bb = readFileSync(back);
const SHIRT = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" width="600" height="640"><path d="M190 20 Q300 70 410 20 L580 110 L530 250 L470 225 L470 620 L130 620 L130 225 L70 250 L20 110 Z" fill="#141317" stroke="#2a2830" stroke-width="3"/><path d="M190 20 Q300 95 410 20" fill="none" stroke="#2a2830" stroke-width="6"/></svg>');

function shirt(label, art, artW, top, left) {
  const [w, h] = dims(art);
  const artH = Math.round((h / w) * artW);
  return div({ flexDirection: 'column', alignItems: 'center', gap: 14 },
    div({ width: 600, height: 640, position: 'relative' },
      img(SHIRT, 600, 640, { position: 'absolute', left: 0, top: 0 }),
      img(uri(art), artW, artH, { position: 'absolute', left, top })),
    div({ fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 30, letterSpacing: 4, color: C.muted }, label));
}

const W = 1400;
const H = 820;
const el = div({ width: W, height: H, background: '#2b2a31', flexDirection: 'column', alignItems: 'center', padding: '30px 40px' },
  div({ fontFamily: 'Anton', fontSize: 44, color: C.text, marginBottom: 20 }, title),
  div({ gap: 80 },
    shirt('VORNE', fb, 150, 150, 330), // links auf der Brust (vom Betrachter rechts)
    shirt('HINTEN', bb, 300, 120, 150)));
const svg = await satori(el, { width: W, height: H, fonts: fonts() });
writeFileSync(out, new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
console.log(out);
