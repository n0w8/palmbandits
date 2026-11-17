// Erzeugt das Standard-Vorschaubild der Seite (public/og-default.png, 1200 x 630)
// fuer Google, WhatsApp, Discord, X. Aufruf: node pinterest/og.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { AUTOMATION_DIR, ROOT_DIR, BRAND } from '../lib/util.mjs';
import { wallpaperSvg } from './wallpaper.mjs';

const W = 1200;
const H = 630;
const FONT_DIR = path.join(AUTOMATION_DIR, 'node_modules', '@fontsource');
const f = (pkg, file, name, weight) => ({
  name, weight, style: 'normal',
  data: readFileSync(path.join(FONT_DIR, pkg, 'files', `${file}-latin-${weight}-normal.woff`)),
});
const fonts = [f('anton', 'anton', 'Anton', 400), f('barlow-condensed', 'barlow-condensed', 'Barlow Condensed', 700)];

const div = (style, ...children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children } });
const bg = `data:image/svg+xml;base64,${Buffer.from(wallpaperSvg(3, W, H)).toString('base64')}`;
const SUNSET = 'linear-gradient(90deg, #ffd23f, #ff8a1f, #ff2d87, #8b3dff)';

const tree = div(
  { width: W, height: H, position: 'relative', background: '#07060b' },
  { type: 'img', props: { src: bg, width: W, height: H, style: { position: 'absolute', left: 0, top: 0, width: W, height: H } } },
  div({ position: 'absolute', left: 0, top: 0, width: W, height: H, background: 'linear-gradient(90deg, rgba(7,6,11,.92) 0%, rgba(7,6,11,.55) 55%, rgba(7,6,11,0) 100%)' }),
  div(
    { position: 'absolute', left: 70, top: 0, height: H, flexDirection: 'column', justifyContent: 'center' },
    div({ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 30, letterSpacing: 4, color: '#ffd23f', textTransform: 'uppercase' }, 'Die deutsche GTA-Community'),
    div({ fontFamily: 'Anton', fontSize: 128, lineHeight: 1, marginTop: 10, backgroundImage: SUNSET, backgroundClip: 'text', color: 'transparent' }, BRAND.toUpperCase()),
    div({ fontFamily: 'Anton', fontSize: 58, lineHeight: 1.05, color: '#f4f1fa', marginTop: 14, textTransform: 'uppercase' }, 'GTA 6 News, Guides & Cheats'),
    div({ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 30, letterSpacing: 3, color: '#19e3c8', marginTop: 22, textTransform: 'uppercase' }, 'Schneller als die Cops'),
  ),
);

const svg = await satori(tree, { width: W, height: H, fonts });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
const out = path.join(ROOT_DIR, 'public', 'og-default.png');
writeFileSync(out, png);
console.log(`OG-Bild geschrieben: ${out} (${Math.round(png.length / 1024)} KB)`);
