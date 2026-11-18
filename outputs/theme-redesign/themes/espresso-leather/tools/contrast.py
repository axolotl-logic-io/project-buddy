# WCAG contrast of the Espresso Leather tokens against the sampled leather
# texture and every surface that THEME-INTERFACE.md names.
#
# Run from the repository root:
#   python3 outputs/theme-redesign/themes/espresso-leather/tools/contrast.py
# Add --all to print every pair, not only the failures. contrast-results.txt
# holds the output of a run with --all.
#
# The script reads the colours from tokens.css, so it stays in step with
# them. tools/sample-texture.mjs gave the texture samples below.

import re
import sys
from pathlib import Path

TOKENS = Path(__file__).resolve().parent.parent / "tokens.css"

# Samples of apps/web/public/textures/espresso-leather.webp.
TEXTURE = {
    "texture darkest": (20, 6, 0),
    "texture median": (40, 25, 18),
    "texture 99.9%": (59, 44, 36),
    "texture brightest": (78, 63, 56),
}


def read_tokens():
    text = TOKENS.read_text()
    raw = dict(re.findall(r"(--[\w-]+):\s*([^;]+);", text))
    colours = {}

    def resolve(name, depth=0):
        if name not in raw:  # a font or other token defined elsewhere
            return None
        value = raw[name].strip()
        if m := re.fullmatch(r"rgb\((\d+) (\d+) (\d+)\)", value):
            return tuple(int(v) for v in m.groups())
        if m := re.fullmatch(r"var\((--[\w-]+)\)", value):
            return resolve(m.group(1), depth + 1)
        return None

    for name in raw:
        if (rgb := resolve(name)) is not None:
            colours[name[2:]] = rgb
    return colours


def mix(top, bottom, amount):
    """top at amount (0 to 1) over bottom, in sRGB."""
    return tuple(round(t * amount + b * (1 - amount)) for t, b in zip(top, bottom))


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = rgb
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(a, b):
    hi, lo = sorted([luminance(a), luminance(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)


C = read_tokens()
C.update(TEXTURE)
# The ring track is line at 35 % over the ring disc.
C["ring-track"] = mix(C["line"], C["ring-disc"], 0.35)

TEXT = ["foreground", "muted", "primary", "accent", "danger", "rubric", "label-ink"]
GROUNDS = ["texture darkest", "texture median", "texture 99.9%", "texture brightest",
           "background", "surface", "field"]
SIDE = ["navigation-surface", "trail-surface", "sidebar-surface", "secondary-surface"]
BOUNDARY = ["line", "rule-ink", "frame-ink", "focus", "ornament-ink", "ornament-accent-ink"]
CODE = ["code-comment", "code-keyword", "code-string", "code-function", "code-constant",
        "foreground"]

pairs = [
    *[(t, g, 4.5) for t in TEXT for g in GROUNDS],
    *[(t, g, 4.5) for t in ["foreground", "muted", "primary", "label-ink"] for g in SIDE],
    *[(b, g, 3) for b in BOUNDARY for g in GROUNDS],
    *[(c, "code-surface", 4.5) for c in CODE],
    ("header-paper", "header-ink", 4.5),
    ("header-gold", "header-ink", 3),
    ("header-line", "header-ink", 3),
    ("focus", "header-ink", 3),
    ("on-action", "action-fill", 4.5),
    ("action-ink", "action-paper", 4.5),
    ("on-primary", "primary", 4.5),
    ("on-accent", "accent", 4.5),
    ("on-danger", "danger", 4.5),
    ("ring-arc", "ring-disc", 3),
    ("ring-ink", "ring-disc", 4.5),
    ("ring-arc", "ring-track", 1.5),
]

failures = 0
lowest = {}
for a, b, need in pairs:
    value = ratio(C[a], C[b])
    ok = value >= need
    failures += not ok
    if not ok or "--all" in sys.argv:
        print(f"{a:20} on {b:20} {value:5.2f}  needs {need}  {'ok' if ok else 'FAIL'}")
    key = (a, need)
    if key not in lowest or value < lowest[key][0]:
        lowest[key] = (value, b)

print("\nLowest ratio for each ink:")
for (a, need), (value, b) in sorted(lowest.items()):
    print(f"  {a:20} {value:5.2f} on {b:20} (needs {need})")
print(f"\n{len(pairs)} pairs, {failures} below the bar")
