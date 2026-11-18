"""Sample the Ivory Vellum texture's light and dark areas.

Reads apps/web/public/textures/ivory-vellum.webp without changing it and
prints luminance percentiles of single pixels and of 8 px blocks (about one
glyph stem at body size), with the RGB of the lightest and darkest blocks.
Usage: python3 sample_texture.py PATH_TO_WEBP
"""
import sys
from PIL import Image

def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(rgb):
    r, g, b = rgb
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

img = Image.open(sys.argv[1]).convert("RGB")
w, h = img.size
px = img.load()
print(f"size {w}x{h}")
pix = sorted((lum(px[x, y]), px[x, y]) for y in range(0, h, 2) for x in range(0, w, 2))
def pct(arr, p):
    return arr[min(len(arr) - 1, int(len(arr) * p))]
for p in (0, 0.001, 0.01, 0.05, 0.5, 0.95, 0.99, 0.999, 1):
    L, c = pct(pix, p)
    print(f"pixel p{p*100:g}: L={L:.4f} rgb{c}")
B = 8
small = img.resize((w // B, h // B), Image.BOX)
sp = small.load()
blocks = sorted((lum(sp[x, y]), sp[x, y]) for y in range(small.size[1]) for x in range(small.size[0]))
for p in (0, 0.01, 0.5, 0.99, 1):
    L, c = pct(blocks, p)
    print(f"block{B} p{p*100:g}: L={L:.4f} rgb{c}")
mean = img.resize((1, 1), Image.BOX).getpixel((0, 0))
print("mean rgb", mean, f"L={lum(mean):.4f}")
