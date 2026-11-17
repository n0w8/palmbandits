// Eigene, abstrakte Wallpaper-Kunst als SVG: Sonnenuntergang, Palmen, Neon-Skyline.
// Komplett aus Formen erzeugt, keine fremden Bilder. Gleicher Seed = gleiches Bild.

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 100000) / 100000;
  };
}

const PALETTES = [
  { name: 'Sunset Pink', sky: ['#07060b', '#1d0b38', '#5b1f8f', '#ff2d87', '#ff8a1f'], sun: ['#ffd23f', '#ff8a1f', '#ff2d87'], grid: '#19e3c8', windows: ['#19e3c8', '#ff2d87', '#ffd23f'] },
  { name: 'Teal Dusk', sky: ['#07060b', '#0b1a3a', '#173d73', '#19a3c8', '#ffd23f'], sun: ['#fff1a8', '#ffd23f', '#ff8a1f'], grid: '#ff2d87', windows: ['#ffd23f', '#19e3c8', '#ff8a1f'] },
  { name: 'Purple Haze', sky: ['#07060b', '#220a33', '#8b3dff', '#ff2d87', '#ffd23f'], sun: ['#ffe27a', '#ffd23f', '#ff8a1f'], grid: '#8b3dff', windows: ['#ff2d87', '#8b3dff', '#19e3c8'] },
  { name: 'Miami Night', sky: ['#07060b', '#120a2a', '#3a1466', '#c4237d', '#ff8a1f'], sun: ['#ffd23f', '#ff2d87', '#8b3dff'], grid: '#19e3c8', windows: ['#19e3c8', '#ffd23f', '#ff2d87'] },
];

export function wallpaperName(seed) {
  return PALETTES[(seed - 1) % PALETTES.length].name;
}

function palm(bx, by, height, lean, r, fill) {
  const cx = bx + lean;
  const cy = by - height;
  const qx = bx + lean * 0.15;
  const qy = by - height * 0.55;
  const tb = 20; const tm = 15; const tc = 9;
  const trunk = `M${bx - tb},${by} Q${qx - tm},${qy} ${cx - tc},${cy} L${cx + tc},${cy} Q${qx + tm},${qy} ${bx + tb},${by} Z`;
  // Wedel: gebogene Mittelrippe (Linie) mit herabhaengenden Fiederblaettern (kurze Linien)
  let spines = '';
  let leaflets = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (-178 + (176 / (n - 1)) * i + (r() - 0.5) * 10) * (Math.PI / 180);
    const len = height * (0.34 + r() * 0.12);
    const tx = cx + Math.cos(a) * len;
    const ty = cy + Math.sin(a) * len * 0.45 + len * 0.38;
    const mx = (cx + tx) / 2;
    const my = (cy + ty) / 2 - len * 0.3;
    spines += ` M${cx},${cy} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
    for (let t = 0.12; t < 0.98; t += 0.075) {
      const px = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx + t * t * tx;
      const py = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * my + t * t * ty;
      // Tangente der Kurve
      const dx = 2 * (1 - t) * (mx - cx) + 2 * t * (tx - mx);
      const dy = 2 * (1 - t) * (my - cy) + 2 * t * (ty - my);
      const dl = Math.hypot(dx, dy) || 1;
      const fl = len * 0.23 * (1 - t * 0.7);
      for (const side of [-1, 1]) {
        let nx = (-dy / dl) * side + (dx / dl) * 0.35;
        let ny = (dx / dl) * side + (dy / dl) * 0.35 + 0.8; // Schwerkraft
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl; ny /= nl;
        leaflets += ` M${px.toFixed(1)},${py.toFixed(1)} l${(nx * fl).toFixed(1)},${(ny * fl).toFixed(1)}`;
      }
    }
  }
  const nuts = [0, 1, 2].map((k) => `<circle cx="${cx - 10 + k * 10}" cy="${cy + 12 + (k % 2) * 6}" r="9" fill="${fill}"/>`).join('');
  return `<path d="${trunk}" fill="${fill}"/><path d="${spines}" fill="none" stroke="${fill}" stroke-width="8" stroke-linecap="round"/><path d="${leaflets}" fill="none" stroke="${fill}" stroke-width="5" stroke-linecap="round"/>${nuts}`;
}

export function wallpaperSvg(seed = 1, W = 1000, H = 1500) {
  const r = rng(seed);
  const pal = PALETTES[(seed - 1) % PALETTES.length];
  const horizon = Math.round(H * (0.58 + r() * 0.05));
  const sunR = 230 + Math.round(r() * 80);
  const sunX = Math.round(W * (0.38 + r() * 0.24));
  const sunY = horizon - Math.round(sunR * 0.42);
  const ocean = seed % 2 === 0;
  const parts = [];

  parts.push(`<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    ${pal.sky.map((c, i) => `<stop offset="${[0, 0.28, 0.55, 0.82, 1][i]}" stop-color="${c}"/>`).join('')}
  </linearGradient>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
    ${pal.sun.map((c, i, a) => `<stop offset="${i / (a.length - 1)}" stop-color="${c}"/>`).join('')}
  </linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0b2e"/><stop offset="1" stop-color="#07060b"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${pal.sun[1]}" stop-opacity="0.55"/><stop offset="1" stop-color="${pal.sun[1]}" stop-opacity="0"/></radialGradient>
  <mask id="cut"><rect width="${W}" height="${H}" fill="white"/>${Array.from({ length: 7 }, (_, i) => {
    const y = sunY - sunR * 0.28 + i * (sunR * 0.13);
    return `<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${(4 + i * 3.2).toFixed(1)}" fill="black"/>`;
  }).join('')}</mask>
</defs>`);
  parts.push(`<rect width="${W}" height="${horizon}" fill="url(#sky)"/>`);
  // Sterne
  for (let i = 0; i < 90; i++) {
    const x = r() * W; const y = r() * horizon * 0.55;
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + r() * 1.8).toFixed(2)}" fill="#f4f1fa" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`);
  }
  // Sonne mit Streifen
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${sunR * 1.9}" fill="url(#glow)"/>`);
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="url(#sun)" mask="url(#cut)"/>`);
  // Skyline
  let x = -10;
  const sky = [];
  const win = [];
  while (x < W + 10) {
    const bw = 40 + Math.round(r() * 70);
    const near = Math.abs(x + bw / 2 - sunX) < sunR * 0.8;
    const bh = near ? 30 + Math.round(r() * 90) : 70 + Math.round(r() * 230);
    sky.push(`<rect x="${x}" y="${horizon - bh}" width="${bw}" height="${bh + 2}" fill="#0c0716"/>`);
    if (r() > 0.25) sky.push(`<rect x="${x + bw / 2 - 1}" y="${horizon - bh - 18 - r() * 30}" width="3" height="40" fill="#0c0716"/>`);
    for (let wy = horizon - bh + 12; wy < horizon - 10; wy += 16) {
      for (let wx = x + 8; wx < x + bw - 8; wx += 13) {
        if (r() > 0.78) win.push(`<rect x="${wx}" y="${wy}" width="6" height="8" fill="${pal.windows[Math.floor(r() * 3)]}" opacity="${(0.45 + r() * 0.5).toFixed(2)}"/>`);
      }
    }
    x += bw + Math.round(r() * 6);
  }
  parts.push(sky.join(''), win.join(''));
  // Boden: Neon-Gitter oder Meer mit Spiegelung
  parts.push(`<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#ground)"/>`);
  parts.push(`<rect y="${horizon - 2}" width="${W}" height="4" fill="${pal.sun[1]}" opacity="0.9"/>`);
  if (ocean) {
    for (let i = 0; i < 26; i++) {
      const y = horizon + 10 + i * i * 1.1 + i * 10;
      if (y > H) break;
      const half = (sunR * 0.9) * (1 - i / 34) + r() * 30;
      parts.push(`<rect x="${(sunX - half).toFixed(1)}" y="${y.toFixed(1)}" width="${(half * 2).toFixed(1)}" height="${(3 + i * 0.5).toFixed(1)}" rx="2" fill="${pal.sun[i % 2 ? 2 : 1]}" opacity="${(0.75 - i * 0.025).toFixed(2)}"/>`);
    }
  } else {
    const vx = W / 2;
    for (let i = -14; i <= 14; i++) {
      parts.push(`<line x1="${vx + i * 18}" y1="${horizon}" x2="${vx + i * 150}" y2="${H}" stroke="${pal.grid}" stroke-width="2" opacity="0.55"/>`);
    }
    for (let i = 1; i < 16; i++) {
      const y = horizon + Math.pow(i, 2.05) * 2.6;
      if (y > H) break;
      parts.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="${pal.grid}" stroke-width="${(1.5 + i * 0.12).toFixed(2)}" opacity="${(0.25 + i * 0.03).toFixed(2)}"/>`);
    }
  }
  // Palmen als Silhouetten
  const left = r() > 0.15;
  const right = r() > 0.15 || !left;
  if (left) parts.push(palm(70 + r() * 60, H + 40, 900 + r() * 160, 110 + r() * 60, r, '#05040a'));
  if (left && r() > 0.5) parts.push(palm(230 + r() * 60, H + 40, 640 + r() * 120, 50 + r() * 40, r, '#05040a'));
  if (right) parts.push(palm(W - 70 - r() * 60, H + 40, 860 + r() * 180, -(100 + r() * 70), r, '#05040a'));
  // dunkler Verlauf unten fuer den Schriftzug
  parts.push(`<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07060b" stop-opacity="0"/><stop offset="1" stop-color="#07060b" stop-opacity="0.95"/></linearGradient></defs><rect y="${H - 260}" width="${W}" height="260" fill="url(#fade)"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('\n')}</svg>`;
}
