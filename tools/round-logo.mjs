// Utility script: round the master logo to match the inner rounded rectangle,
// then regenerate the public/icons PNG set + favicon.ico.
//
// Requires Python 3 with Pillow (PIL). We shell out because the repo has no
// Node image dependency, and this script is only ever run manually.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const py = `
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = ${JSON.stringify(root)}
SRC = os.path.join(ROOT, 'images', 'logo.png')
OUT_LOGO = os.path.join(ROOT, 'images', 'logo.png')
ICONS_DIR = os.path.join(ROOT, 'public', 'icons')

img = Image.open(SRC).convert('RGBA')
W, H = img.size
px = img.load()

def bright(p):
    return max(p[0], p[1], p[2])

THR = 150

def scan_edge_h(y, reverse=False):
    rng = range(W - 1, -1, -1) if reverse else range(W)
    for x in rng:
        if bright(px[x, y]) > THR:
            return x
    return None

def scan_edge_v(x, reverse=False):
    rng = range(H - 1, -1, -1) if reverse else range(H)
    for y in rng:
        if bright(px[x, y]) > THR:
            return y
    return None

# Probe multiple straight edges (away from the corners) and take the extremes.
ys = [H // 4, H // 2, 3 * H // 4]
xs = [W // 4, W // 2, 3 * W // 4]

left = min(scan_edge_h(y) for y in ys)
right = max(scan_edge_h(y, reverse=True) for y in ys)
top = min(scan_edge_v(x) for x in xs)
bottom = max(scan_edge_v(x, reverse=True) for x in xs)

print(f'outline bbox: L={left} R={right} T={top} B={bottom}')

# Estimate the corner radius from a point on the top-left arc.
# Find the first lit pixel along the top-left diagonal.
def find_arc_point():
    for d in range(1, min(W, H)):
        p = px[left + d, top + d]
        if bright(p) < 80:
            continue
        return left + d, top + d
    return None

# Use a horizontal probe near the top edge to nail down the arc.
# At y = top + 50 (well inside the arc), find the leftmost lit x.
probe_y = top + 50
for x in range(W):
    if bright(px[x, probe_y]) > THR:
        arc_x = x
        break
# Center of the TL arc is at (left + r, top + r). A point (arc_x, probe_y) on
# the arc satisfies (arc_x - (left + r))^2 + (probe_y - (top + r))^2 = r^2.
# Solve for r.
a = arc_x - left
b = probe_y - top
# r^2 = (a - r)^2 + (b - r)^2
# r^2 - 2(a+b)r + (a^2 + b^2) = 0
import math
A = 1
B = -2 * (a + b)
C = a * a + b * b
disc = B * B - 4 * A * C
r1 = (-B - math.sqrt(disc)) / 2
r2 = (-B + math.sqrt(disc)) / 2
# The valid radius is the one larger than both a and b.
radius = r2 if r2 > max(a, b) else r1
radius = int(round(radius))
print(f'estimated corner radius: {radius}px')

# Build a rounded-rectangle alpha mask at the outline bounds.
mask = Image.new('L', (W, H), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    [left, top, right, bottom], radius=radius, fill=255
)
# Feather the edge by 1px so resampled icons don't get a hard jagged border.
mask = mask.filter(ImageFilter.GaussianBlur(radius=0.6))

rounded = Image.new('RGBA', (W, H), (0, 0, 0, 0))
rounded.paste(img, (0, 0), mask)

# Crop tightly to the outline.
cropped = rounded.crop((left, top, right + 1, bottom + 1))
cw, ch = cropped.size
# Pad to a square canvas so downstream icons stay square.
side = max(cw, ch)
square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
square.paste(cropped, ((side - cw) // 2, (side - ch) // 2))

# Overwrite the master logo with the rounded version.
square.save(OUT_LOGO, 'PNG', optimize=True)
print(f'wrote {OUT_LOGO} ({side}x{side})')

# Regenerate the Chrome extension icon set.
os.makedirs(ICONS_DIR, exist_ok=True)
sizes = [16, 32, 48, 128]
for s in sizes:
    resized = square.resize((s, s), Image.LANCZOS)
    path = os.path.join(ICONS_DIR, f'icon-{s}.png')
    resized.save(path, 'PNG', optimize=True)
    print(f'wrote {path}')

# Multi-resolution favicon.ico (16/32/48).
ico_path = os.path.join(ICONS_DIR, 'favicon.ico')
square.save(
    ico_path,
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)],
)
print(f'wrote {ico_path}')
`;

const result = spawnSync('python3', ['-c', py], {
  stdio: 'inherit',
  cwd: root,
});
process.exit(result.status ?? 1);
