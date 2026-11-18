# Druckdatei für schwarze Shirts/Hoodies aus einem fotorealistischen Figuren-Render auf Schwarz (PALM BANDITS, ab 18.11.2026).
# Schwarz wird durchsichtig (der Stoff ist schwarz). Anders als make_print.py ist der halbdurchsichtige Bereich bewusst schmal
# (Standard: unter 24 durchsichtig, ab 56 deckend), damit dunkle Kleidung keinen großen grauen Schleier bildet
# (Lehre aus dem Hasen: große halbtransparente Flächen können im Digitaldruck als körniger Film erscheinen).
# Danach: Rand 1 % immer durchsichtig, Mini-Reste unter Alpha 8 weg, auf den Inhalt zuschneiden (+40 px), auf Zielbreite skalieren.
# Aufruf: python -I druck-figur.py <eingang.png> <ausgang.png> [--lo=24] [--hi=56] [--breite=2300]
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
opt = {a.split('=')[0][2:]: a.split('=')[1] for a in sys.argv[3:] if a.startswith('--') and '=' in a}
lo = float(opt.get('lo', 24)); hi = float(opt.get('hi', 56)); breite = int(opt.get('breite', 2300))

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
L = a.max(axis=2)
alpha = np.clip((L - lo) / (hi - lo), 0.0, 1.0) * 255.0
alpha[alpha < 8] = 0
m = max(4, int(0.01 * alpha.shape[0]))
alpha[:m, :] = 0; alpha[-m:, :] = 0; alpha[:, :m] = 0; alpha[:, -m:] = 0
rgb = a.copy()
rgb[alpha == 0] = 0
out = np.dstack([rgb, alpha]).astype(np.uint8)

ys, xs = np.where(out[..., 3] > 0)
pad = 40
y0, y1 = max(0, ys.min() - pad), min(out.shape[0], ys.max() + pad + 1)
x0, x1 = max(0, xs.min() - pad), min(out.shape[1], xs.max() + pad + 1)
img = Image.fromarray(out[y0:y1, x0:x1], 'RGBA')
if img.width > breite:
    img = img.resize((breite, round(img.height * breite / img.width)), Image.LANCZOS)
img.save(dst, optimize=True)

al = np.asarray(img)[..., 3]
semi = ((al > 0) & (al < 230)).sum()
vis = (al > 0).sum()
print(f'{dst}: {img.width} x {img.height}, deckend+halb {vis} px, davon halbtransparent {semi} ({100 * semi / max(vis, 1):.1f} %)')
