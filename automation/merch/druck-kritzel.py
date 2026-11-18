# Druckdatei für weiße Kritzel-/Strichmotive auf Schwarz (PALM BANDITS, 18.11.2026: "palme + maske", Variante G).
# Alle Linien werden reines Weiß, der Hintergrund durchsichtig. Die Deckkraft folgt der Helligkeit der Linie
# (weiche Kanten statt grauer Säume): unter --lo durchsichtig, ab --hi voll deckend, dazwischen weicher Verlauf.
# Danach: Inseln unter --minpx Pixeln entfernen (Rauschen), auf den Inhalt zuschneiden (+--pad), auf --breite skalieren.
# Aufruf: python -I druck-kritzel.py <eingang.png> <ausgang.png> [--lo=40] [--hi=150] [--minpx=40] [--pad=60] [--breite=3000]
import sys
import numpy as np
import cv2
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
opt = {a.split('=')[0][2:]: a.split('=')[1] for a in sys.argv[3:] if a.startswith('--') and '=' in a}
lo = float(opt.get('lo', 40)); hi = float(opt.get('hi', 150)); minpx = int(opt.get('minpx', 40))
pad = int(opt.get('pad', 60)); breite = int(opt.get('breite', 3000))

a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
L = a.mean(axis=2)
t = np.clip((L - lo) / (hi - lo), 0.0, 1.0)
alpha = (t * t * (3 - 2 * t)) * 255.0  # smoothstep
alpha[alpha < 6] = 0
m = max(4, int(0.01 * alpha.shape[0]))
alpha[:m, :] = 0; alpha[-m:, :] = 0; alpha[:, :m] = 0; alpha[:, -m:] = 0

vis = (alpha > 0).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(vis, 8)
kill = np.zeros(n, bool); kill[1:] = st[1:, 4] < minpx
removed = int(kill.sum())
alpha[kill[lab]] = 0

ys, xs = np.where(alpha > 0)
y0, y1 = max(0, ys.min() - pad), min(alpha.shape[0], ys.max() + pad + 1)
x0, x1 = max(0, xs.min() - pad), min(alpha.shape[1], xs.max() + pad + 1)
al = alpha[y0:y1, x0:x1]
out = np.zeros((al.shape[0], al.shape[1], 4), np.uint8)
out[..., :3] = 255
out[..., 3] = np.round(al).astype(np.uint8)
img = Image.fromarray(out, 'RGBA')
if img.width > breite:
    img = img.resize((breite, round(img.height * breite / img.width)), Image.LANCZOS)
    arr = np.asarray(img).copy(); arr[..., :3] = 255; img = Image.fromarray(arr, 'RGBA')
img.save(dst, optimize=True)
A = np.asarray(img)[..., 3]
print(f'{dst}: {img.width} x {img.height}, entfernte Inseln {removed}, deckend {100 * (A > 229).sum() / max((A > 0).sum(), 1):.1f} % der Linienpixel')
