# Druckdatei für schwarze Shirts/Hoodies aus einem fotorealistischen Figuren-Render auf Schwarz (PALM BANDITS, ab 18.11.2026).
# Schwarz wird durchsichtig (der Stoff ist schwarz). Stand nach Bild-QA vom 18.11.2026:
# - Alpha aus leicht geglätteter Helligkeit (hellster Kanal, Gauß --blur Render-px), die Farben bleiben scharf.
# - Schmale Rampe --lo/--hi (Standard 22/28): dunkle Kleidung wird geschlossen deckend gedruckt, nur fast Schwarzes fällt weg.
#   (30/44 hatte in dunkler Kleidung einen körnigen, gesprenkelten Film erzeugt: bis 34 % halbtransparent, tausende Inseln.)
# - Unten weich ausblenden über --fade Render-px (Figuren, die an den unteren Bildrand stoßen, sonst harte Kante).
# - Nach dem Skalieren: Inseln unter --minpx Druck-px entfernen, Löcher unter --minpx füllen.
# - Rand 1 % immer durchsichtig, auf den Inhalt zuschneiden (+40 px), auf --breite skalieren.
# Restrisiko laut QA: große dunkle deckende Flächen können mit Weißunterdruck grauer wirken als der Stoff. Falls ja:
# lo und hi gemeinsam anheben (z. B. 28/34), Rampe schmal lassen.
# Aufruf: python -I druck-figur.py <eingang.png> <ausgang.png> [--lo=22] [--hi=28] [--blur=3] [--fade=250] [--minpx=60] [--breite=2200]
import sys
import numpy as np
import cv2
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
opt = {a.split('=')[0][2:]: a.split('=')[1] for a in sys.argv[3:] if a.startswith('--') and '=' in a}
lo = float(opt.get('lo', 22)); hi = float(opt.get('hi', 28)); blur = float(opt.get('blur', 3))
fade = int(opt.get('fade', 250)); minpx = int(opt.get('minpx', 60)); breite = int(opt.get('breite', 2200))

a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
L = a.max(axis=2)
Ls = cv2.GaussianBlur(L, (0, 0), blur) if blur > 0 else L
alpha = np.clip((Ls - lo) / (hi - lo), 0.0, 1.0) * 255.0
alpha[alpha < 8] = 0
H0 = alpha.shape[0]
m = max(4, int(0.01 * H0))
alpha[:m, :] = 0; alpha[-m:, :] = 0; alpha[:, :m] = 0; alpha[:, -m:] = 0
if fade > 0:
    end = H0 - m
    ys = np.arange(H0, dtype=np.float32)[:, None]
    ramp = np.clip((end - ys) / float(fade), 0.0, 1.0)
    alpha = alpha * ramp

ys, xs = np.where(alpha > 0)
pad = 40
y0, y1 = max(0, ys.min() - pad), min(H0, ys.max() + pad + 1)
x0, x1 = max(0, xs.min() - pad), min(alpha.shape[1], xs.max() + pad + 1)
rgb = a[y0:y1, x0:x1]; al = alpha[y0:y1, x0:x1]
W = min(breite, x1 - x0); H = round((y1 - y0) * W / (x1 - x0))
rgb = np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32)
al = np.asarray(Image.fromarray(al.astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32)
al[al < 8] = 0

if minpx > 0:
    vis = (al > 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(vis, 8)
    kill = np.zeros(n, bool); kill[1:] = st[1:, 4] < minpx
    al[kill[lab]] = 0
    inv = (al == 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 8)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
    fill = np.zeros(n, bool)
    for i in range(1, n):
        if st[i, 4] < minpx and i not in border:
            fill[i] = True
    fm = fill[lab]
    if fm.any():
        k = np.ones((5, 5), np.float32)
        keep = (~fm).astype(np.float32)
        wa = cv2.filter2D(keep * al, -1, k); wn = cv2.filter2D(keep, -1, k)
        al[fm] = (wa / np.maximum(wn, 1e-3))[fm]
        vis2 = keep * (al > 0)
        for c in range(3):
            wc = cv2.filter2D(vis2 * rgb[..., c], -1, k); wcn = cv2.filter2D(vis2, -1, k)
            rgb[..., c][fm] = (wc / np.maximum(wcn, 1e-3))[fm]

rgb[al == 0] = 0
out = np.dstack([rgb, al]).clip(0, 255).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(dst, optimize=True)

A = out[..., 3]; v = A > 0; semi = (A > 0) & (A < 230)
n, lab, st, _ = cv2.connectedComponentsWithStats(v.astype(np.uint8), 8)
islands = int((st[1:, 4] < 30).sum())
print(f'{dst}: {W} x {H}, halbtransparent {100 * semi.sum() / max(v.sum(), 1):.1f} %, Inseln<30px {islands}')
