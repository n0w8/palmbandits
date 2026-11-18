// Rückendruck "PALM BANDITS" unter dem Kragen (Mike 18.11.2026: "hinten unter dem kragen die 5 sterne oder noch besser 'PALM BANDITS'").
// Schriftzug wie auf der Website (Anton, Sonnenuntergangs-Verlauf gelb → orange → pink → lila), optional mit 5 kleinen Sternen darunter.
// Aufruf: node merch/ruecken-schriftzug.mjs <ausgabe.png> [--breite 3000] [--sterne] [--preview vorschau.png]
// Bei Spreadshirt etwa 22 bis 25 cm breit setzen, horizontal zentriert, ganz oben im Rücken-Druckbereich.
import { writeFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { div, fonts, img, stars, textWidth, SUNSET } from '../pinterest/render.mjs';
import { argValue, hasFlag } from '../lib/util.mjs';

const [, , out] = process.argv;
if (!out) { console.log('Aufruf: node merch/ruecken-schriftzug.mjs <ausgabe.png> [--breite 3000] [--sterne] [--preview vorschau.png]'); process.exit(1); }

const W = Number(argValue('breite') ?? 3000);
const TEXT = 'PALM BANDITS';
const spacing = 0.04; // Buchstabenabstand relativ zur Schriftgröße
const pad = Math.round(W * 0.015);
// Schriftgröße so wählen, dass der Schriftzug die Breite füllt
const w100 = await textWidth(TEXT, { size: 100, spacing: 100 * spacing });
const size = Math.floor(((W - 2 * pad) / w100) * 100);
const withStars = hasFlag('sterne');
const starSize = Math.round(size * 0.32);
const H = Math.round(size * 1.12) + 2 * pad + (withStars ? Math.round(starSize * 1.5) : 0);

const word = div({ fontFamily: 'Anton', fontSize: size, letterSpacing: size * spacing, lineHeight: 1.1, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' }, TEXT);
const el = div({ width: W, height: H, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  word,
  withStars ? div({ marginTop: Math.round(starSize * 0.3) }, stars(5, starSize, Math.round(starSize * 0.35))) : null);

const svg = await satori(el, { width: W, height: H, fonts: fonts() });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
writeFileSync(out, png);
console.log(`${out}: ${W} x ${H} (Schrift ${size} px${withStars ? ', mit Sternen' : ''})`);

const prev = argValue('preview');
if (prev) {
  const bg = div({ width: W, height: H, background: '#0b0b0d' }, img(`data:image/png;base64,${png.toString('base64')}`, W, H));
  const s2 = await satori(bg, { width: W, height: H, fonts: fonts() });
  writeFileSync(prev, new Resvg(s2, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
}
