"""Writes the construct artwork: lumen.svg, vellum.svg and their avatar cuts.

The drawings are hand-placed shapes. This script only repeats geometry that
is tedious by hand (runes around a ring, gear teeth, compass points, the
quill's barbs, Lumen's crackle) and writes readable SVG.

No shape names a colour. Each carries f-* (fill) and s-* (stroke) classes
that construct-art.css maps to the --construct-* paint roles. Elements with
the class "fine" are detail that drops out at small sizes.

Run from anywhere:  python3 outputs/theme-redesign/artwork/src/draw.py
"""

from __future__ import annotations

import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent
CSS = (OUT / "construct-art.css").read_text()


def n(value: float) -> str:
    """A compact number."""
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text == "-0" else text


def pts(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{n(x)} {n(y)}" for x, y in points)


def polar(cx: float, cy: float, r: float, deg: float) -> tuple[float, float]:
    a = math.radians(deg - 90)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def star(cx, cy, r_out, r_in, points, rot=0.0) -> str:
    out = []
    for i in range(points * 2):
        r = r_out if i % 2 == 0 else r_in
        out.append(polar(cx, cy, r, rot + i * 180 / points))
    return "M" + " L".join(f"{n(x)} {n(y)}" for x, y in out) + "Z"


def gear(cx, cy, r_root, r_tip, teeth) -> str:
    """A gear outline with flat-topped teeth."""
    step = 360 / teeth
    out = []
    for i in range(teeth):
        a = i * step
        out += [
            polar(cx, cy, r_root, a - step * 0.30),
            polar(cx, cy, r_tip, a - step * 0.18),
            polar(cx, cy, r_tip, a + step * 0.18),
            polar(cx, cy, r_root, a + step * 0.30),
        ]
    return "M" + " L".join(f"{n(x)} {n(y)}" for x, y in out) + "Z"


def svg(view: int, title: str, body: str, desc: str, box: str | None = None) -> str:
    box = box or f"0 0 {view} {view}"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" class="construct-art" '
        f'viewBox="{box}" role="img" aria-labelledby="title desc">\n'
        f"<title id=\"title\">{title}</title>\n<desc id=\"desc\">{desc}</desc>\n"
        f"<style>\n{CSS}</style>\n{body}</svg>\n"
    )


# ---------------------------------------------------------------- Lumen ----

# Stroke runes in a 6 x 10 box centred on the origin.
RUNES = [
    "M0 -5V5M0 -2l3 -3M0 1l3 -3",
    "M-2 5V-5L2 -1V5",
    "M-2 -5V5M-2 -2l3 2 -3 2",
    "M-2 -5V5M2 -5V5M-2 -1l4 2",
    "M0 -5V5M-3 -2l3 3 3 -3",
    "M-3 -5L3 5M3 -5L-3 5",
    "M0 -5V5M-3 -5l3 3 3 -3",
    "M-2 5V-5l4 3 -4 3l4 4",
    "M0 -5L-3 0 0 5 3 0Z",
    "M-3 5V-5l3 4 3 -4V5",
    "M0 -5V5M-3 0h6",
    "M-3 -5l3 4 3 -4M0 -1V5",
]


def lumen_rays() -> tuple[str, str]:
    """A manuscript sun's rays: straight tapering rays alternate with
    crackling bolts. Returns (straight ray outlines, bolt centre lines)."""
    straight, bolts = [], []
    for i in range(8):
        a = i * 45
        p0 = polar(128, 128, 36, a - 7)
        p1 = polar(128, 128, 62 if i % 2 == 0 else 54, a)
        p2 = polar(128, 128, 36, a + 7)
        straight.append(f"M{n(p0[0])} {n(p0[1])}L{n(p1[0])} {n(p1[1])} {n(p2[0])} {n(p2[1])}Z")
        b = a + 22.5
        zig = [(37, 0), (44, 5), (48, -4), (55, 4), (60, -1)]
        line = [polar(128, 128, r, b + d) for r, d in zig]
        bolts.append("M" + " L".join(f"{n(x)} {n(y)}" for x, y in line))
    return " ".join(straight), " ".join(bolts)


def tilted_ring(rx, ry, rot, half) -> str:
    """Half of a tilted ring; 'back' is the far half, 'front' the near half."""
    if half == "back":
        d = f"M{-rx} 0A{rx} {ry} 0 0 1 {rx} 0"
    else:
        d = f"M{rx} 0A{rx} {ry} 0 0 1 {-rx} 0"
    dots = []
    # Studs along the near half only, for depth.
    if half == "front":
        for t in (0.2, 0.4, 0.6, 0.8):
            a = math.pi * t
            dots.append(
                f'<circle class="f-core fine" cx="{n(rx * math.cos(a))}" '
                f'cy="{n(ry * math.sin(a))}" r="1.3"/>'
            )
    return (
        f'<g transform="translate(128 128) rotate({rot})">'
        f'<path class="f-none s-ink" stroke-width="8.6" d="{d}"/>'
        f'<path class="f-none s-metal" stroke-width="5.6" d="{d}"/>'
        f'<path class="f-none s-light fine" stroke-width="1.2" opacity=".8" d="{d}"/>'
        + "".join(dots)
        + "</g>\n"
    )


def lumen() -> str:
    rng = random.Random(7)
    b = []
    b.append(
        "<defs>\n"
        '<radialGradient id="lumen-sky" cx="50%" cy="50%" r="72%">'
        '<stop offset="0.45" class="st-ground"/>'
        '<stop offset="1" class="st-ground-edge"/></radialGradient>\n'
        '<radialGradient id="lumen-halo" cx="50%" cy="50%" r="50%">'
        '<stop offset="0" class="st-glow" stop-opacity=".7"/>'
        '<stop offset=".45" class="st-glow" stop-opacity=".3"/>'
        '<stop offset="1" class="st-glow" stop-opacity="0"/></radialGradient>\n'
        '<radialGradient id="lumen-orb" cx="44%" cy="40%" r="62%">'
        '<stop offset="0" class="st-core"/>'
        '<stop offset=".5" class="st-core"/>'
        '<stop offset=".9" class="st-glow"/></radialGradient>\n'
        "</defs>\n"
    )
    b.append('<rect width="256" height="256" fill="url(#lumen-sky)"/>\n')

    # Motes of light in the backdrop.
    motes = []
    for _ in range(26):
        while True:
            x, y = rng.uniform(8, 248), rng.uniform(8, 248)
            d = math.hypot(x - 128, y - 128)
            if d > 112 or 44 < d < 80:
                break
        r = rng.choice([0.9, 1.2, 1.6, 2.2, 3])
        op = rng.choice([0.35, 0.5, 0.7])
        motes.append(f'<circle cx="{n(x)}" cy="{n(y)}" r="{r}" opacity="{op}"/>')
    b.append('<g class="f-glow fine">' + "".join(motes) + "</g>\n")

    b.append('<circle cx="128" cy="128" r="86" fill="url(#lumen-halo)"/>\n')

    # Orbit trails just outside the rune ring: the ring is turning.
    trails = []
    for start, sweep in ((-58, 34), (62, 26), (148, 30), (232, 22)):
        x0, y0 = polar(128, 128, 112, start)
        x1, y1 = polar(128, 128, 112, start + sweep)
        trails.append(f"M{n(x0)} {n(y0)}A112 112 0 0 1 {n(x1)} {n(y1)}")
    b.append(
        f'<path class="f-none s-glow fine" stroke-width="1.6" opacity=".55" '
        f'stroke-dasharray="10 4 3 4" d="{" ".join(trails)}"/>\n'
    )

    # The ring of runes: a brass band with incised runes and four jewels.
    b.append(
        '<g class="rune-ring">\n'
        '<circle class="f-none s-ink" cx="128" cy="128" r="96" stroke-width="19"/>\n'
        '<circle class="f-none s-metal" cx="128" cy="128" r="96" stroke-width="16"/>\n'
        '<path class="f-none s-shade" stroke-width="16" opacity=".55" '
        'd="M224 128A96 96 0 0 1 32 128"/>\n'
        '<path class="f-none s-light" stroke-width="2.4" opacity=".9" '
        'd="M45 82A97 97 0 0 1 174 43"/>\n'
        '<circle class="f-none s-ink fine" cx="128" cy="128" r="91" stroke-width=".7"/>\n'
        '<circle class="f-none s-ink fine" cx="128" cy="128" r="101" stroke-width=".7"/>\n'
    )
    runes = []
    slots = 28
    for i in range(slots):
        angle = i * 360 / slots
        if any(abs(((angle - j) + 180) % 360 - 180) < 9 for j in (0, 90, 180, 270)):
            continue
        glyph = RUNES[i % len(RUNES)]
        runes.append(
            f'<path transform="rotate({n(angle)} 128 128) translate(128 32) scale(.82)" d="{glyph}"/>'
        )
    b.append(
        '<g class="f-none s-ink" stroke-width="1.5">' + "".join(runes) + "</g>\n"
    )
    # Ticks at the ring's inner edge, between runes.
    ticks = []
    for i in range(slots):
        angle = (i + 0.5) * 360 / slots
        x0, y0 = polar(128, 128, 88, angle)
        x1, y1 = polar(128, 128, 91, angle)
        ticks.append(f"M{n(x0)} {n(y0)}L{n(x1)} {n(y1)}")
    b.append(
        f'<path class="f-none s-ink fine" stroke-width=".8" d="{" ".join(ticks)}"/>\n'
    )
    jewels = []
    for angle in (0, 90, 180, 270):
        big = angle == 0
        h, w = (13, 8) if big else (10, 6.5)
        jewels.append(
            f'<g transform="rotate({angle} 128 128)">'
            f'<path class="f-accent s-ink" stroke-width="1.6" '
            f'd="M128 {32 - h}L{128 + w} 32 128 {32 + h} {128 - w} 32Z"/>'
            f'<path class="f-core" d="M128 {32 - h * 0.45}L{128 + w * 0.4} 32 '
            f'128 {32 + h * 0.45} {128 - w * 0.4} 32Z"/></g>'
        )
    b.append("".join(jewels) + "\n</g>\n")

    # Gyroscope rings, far halves behind the light.
    gyros = ((78, 25, -28), (78, 25, 36))
    for rx, ry, rot in gyros:
        b.append(tilted_ring(rx, ry, rot, "back"))

    # Rays and crackle. Outlines and a dark under-stroke keep them legible
    # on pale vellum as well as on dark leather.
    straight, bolts = lumen_rays()
    b.append(
        f'<path class="f-glow s-shade" stroke-width="1.2" d="{straight}"/>\n'
        f'<path class="f-none s-shade" stroke-width="3.8" opacity=".6" d="{bolts}"/>\n'
        f'<path class="f-none s-glow" stroke-width="2.4" d="{bolts}"/>\n'
        f'<path class="f-none s-core" stroke-width=".8" d="{bolts}"/>\n'
    )

    # The mote itself.
    b.append(
        '<circle class="f-none s-glow" cx="128" cy="128" r="38" stroke-width="3" opacity=".5"/>\n'
        '<circle cx="128" cy="128" r="34" fill="url(#lumen-orb)"/>\n'
        '<circle class="f-none s-shade" cx="128" cy="128" r="34" stroke-width="1.4"/>\n'
        '<path class="f-none s-core" stroke-width="2" opacity=".9" d="M106 116A24 24 0 0 1 120 104"/>\n'
    )
    # A cheerful face: wide eyes with glints, a lifted smile.
    b.append(
        '<g class="face">'
        '<ellipse class="f-ink" cx="117" cy="125" rx="4.2" ry="5.8"/>'
        '<ellipse class="f-ink" cx="139" cy="125" rx="4.2" ry="5.8"/>'
        '<circle class="f-core" cx="118.6" cy="122.6" r="1.6"/>'
        '<circle class="f-core" cx="140.6" cy="122.6" r="1.6"/>'
        '<path class="f-none s-ink" stroke-width="2.8" d="M117 137.5Q128 147 139 137.5"/>'
        '<ellipse class="f-accent fine" cx="108" cy="135" rx="3.6" ry="2.2" opacity=".35"/>'
        '<ellipse class="f-accent fine" cx="148" cy="135" rx="3.6" ry="2.2" opacity=".35"/>'
        "</g>\n"
    )

    # Near halves of the gyroscope rings, over the light.
    for rx, ry, rot in gyros:
        b.append(tilted_ring(rx, ry, rot, "front"))

    # Sparks thrown off the mote.
    sparks = [
        (176, 70, 6, "f-core s-glow"),
        (74, 186, 5, "f-core s-glow"),
        (184, 176, 4, "f-accent s-ink"),
        (66, 80, 3.5, "f-accent s-ink"),
        (160, 52, 3, "f-core s-glow"),
    ]
    for x, y, r, cls in sparks:
        b.append(
            f'<path class="{cls}" stroke-width=".9" d="{star(x, y, r, r * 0.28, 4, 45 if r < 4 else 0)}"/>\n'
        )
    return svg(
        256,
        "Lumen",
        "".join(b),
        "A small smiling mote of golden light, crackling with sparks, "
        "inside a brass ring of runes and two crossing gyroscope rings.",
    )


def lumen_avatar() -> str:
    b = []
    b.append(
        "<defs>\n"
        '<radialGradient id="lumen-avatar-halo" cx="50%" cy="50%" r="50%">'
        '<stop offset="0" class="st-glow" stop-opacity=".75"/>'
        '<stop offset="1" class="st-glow" stop-opacity="0"/></radialGradient>\n'
        '<radialGradient id="lumen-avatar-orb" cx="44%" cy="40%" r="62%">'
        '<stop offset="0" class="st-core"/>'
        '<stop offset=".45" class="st-core"/>'
        '<stop offset=".92" class="st-glow"/></radialGradient>\n'
        "</defs>\n"
        '<rect class="f-ground" width="64" height="66"/>\n'
        '<circle cx="32" cy="32" r="27" fill="url(#lumen-avatar-halo)"/>\n'
        # The ring, simplified: a band with four jewels.
        '<circle class="f-none s-ink" cx="32" cy="32" r="26" stroke-width="6.6"/>\n'
        '<circle class="f-none s-metal" cx="32" cy="32" r="26" stroke-width="4.4"/>\n'
        '<path class="f-none s-shade" stroke-width="4.4" opacity=".55" d="M58 32A26 26 0 0 1 6 32"/>\n'
    )
    for angle in (0, 90, 180, 270):
        b.append(
            f'<path class="f-accent s-ink" stroke-width="1.1" transform="rotate({angle} 32 32)" '
            'd="M32 1.5L35.4 6 32 10.5 28.6 6Z"/>\n'
        )
    rays = []
    for i in range(8):
        x0, y0 = polar(32, 32, 18.5, i * 45 + 22.5)
        x1, y1 = polar(32, 32, 22, i * 45 + 22.5)
        rays.append(f"M{n(x0)} {n(y0)}L{n(x1)} {n(y1)}")
    d = " ".join(rays)
    b.append(
        f'<path class="f-none s-shade" stroke-width="3.2" opacity=".6" d="{d}"/>\n'
        f'<path class="f-none s-glow" stroke-width="2" d="{d}"/>\n'
        '<circle cx="32" cy="32" r="17" fill="url(#lumen-avatar-orb)"/>\n'
        '<circle class="f-none s-shade" cx="32" cy="32" r="17" stroke-width="1.1"/>\n'
        '<ellipse class="f-ink" cx="26.6" cy="30" rx="2.7" ry="3.6"/>\n'
        '<ellipse class="f-ink" cx="37.4" cy="30" rx="2.7" ry="3.6"/>\n'
        '<path class="f-none s-ink" stroke-width="2.1" d="M26 37Q32 42 38 37"/>\n'
    )
    return svg(
        64,
        "Lumen",
        "".join(b),
        "Lumen's smiling mote of light inside its ring, simplified for small sizes.",
    )


# --------------------------------------------------------------- Vellum ----


def compass_rose(cx, cy, main, diag, w_main, w_diag, north_accent=True) -> str:
    """An eight-point rose: each point has a dark half and a pale half."""
    out = []
    for angle in (45, 135, 225, 315):
        out.append(
            f'<g transform="rotate({angle} {cx} {cy})">'
            f'<path class="f-ink" d="M{cx} {cy}L{cx} {cy - diag} {cx - w_diag} {cy - w_diag}Z"/>'
            f'<path class="f-paper s-ink" stroke-width=".6" d="M{cx} {cy}L{cx} {cy - diag} {cx + w_diag} {cy - w_diag}Z"/></g>'
        )
    for angle in (0, 90, 180, 270):
        dark = "f-accent" if (angle == 0 and north_accent) else "f-ink"
        out.append(
            f'<g transform="rotate({angle} {cx} {cy})">'
            f'<path class="{dark} s-ink" stroke-width=".6" d="M{cx} {cy}L{cx} {cy - main} {cx - w_main} {cy - w_main}Z"/>'
            f'<path class="f-paper s-ink" stroke-width=".6" d="M{cx} {cy}L{cx} {cy - main} {cx + w_main} {cy - w_main}Z"/></g>'
        )
    return "".join(out)


def quill(nib, tip, rng: random.Random) -> str:
    (x0, y0), (x1, y1) = nib, tip
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux  # left of the shaft, looking from the nib

    def at(t, side):
        # The shaft bows slightly; the vane swells and tapers.
        bow = math.sin(math.pi * t) * 3.5
        cx_, cy_ = x0 + dx * t + nx * bow, y0 + dy * t + ny * bow
        if t < 0.3:
            w = 0
        else:
            s = (t - 0.3) / 0.7
            w = math.sin(math.pi * min(s * 1.08, 1)) ** 0.65
        w *= 10.5 if side > 0 else 6.5
        return cx_ + nx * w * side, cy_ + ny * w * side

    ts = [0.3 + 0.7 * i / 24 for i in range(25)]
    left = [at(t, 1) for t in ts]
    right = [at(t, -1) for t in reversed(ts)]
    vane = "M" + " L".join(f"{n(x)} {n(y)}" for x, y in left + right) + "Z"
    shaft = "M" + " L".join(
        f"{n(x)} {n(y)}" for x, y in (at(t, 0) for t in [i / 20 for i in range(21)])
    )
    barbs = []
    for i in range(1, 16):
        t = 0.33 + 0.64 * i / 16
        sx, sy = at(t, 0)
        for side in (1, -1):
            ex, ey = at(min(t + 0.06, 1), side)
            barbs.append(f"M{n(sx)} {n(sy)}L{n(ex)} {n(ey)}")
    # A notch in the vane, as real feathers have.
    nt = 0.62
    notch_x, notch_y = at(nt, 1)
    in_x, in_y = at(nt + 0.02, 0.4)
    return (
        f'<path class="f-paper s-ink" stroke-width="1.3" d="{vane}"/>\n'
        f'<path class="f-none s-ink fine" stroke-width=".55" opacity=".7" d="{" ".join(barbs)}"/>\n'
        f'<path class="f-none s-ink" stroke-width="1.2" d="M{n(notch_x)} {n(notch_y)}L{n(in_x)} {n(in_y)}"/>\n'
        f'<path class="f-none s-ink" stroke-width="1.5" d="{shaft}"/>\n'
        f'<path class="f-none s-ink" stroke-width="2.6" d="M{n(x0)} {n(y0)}L{n(x0 + ux * 9)} {n(y0 + uy * 9)}"/>\n'
    )


def vellum() -> str:
    rng = random.Random(11)
    b = []
    b.append(
        "<defs>\n"
        '<radialGradient id="vellum-sheet" cx="50%" cy="46%" r="74%">'
        '<stop offset=".5" class="st-ground"/>'
        '<stop offset="1" class="st-ground-edge"/></radialGradient>\n'
        '<radialGradient id="vellum-lens" cx="40%" cy="36%" r="70%">'
        '<stop offset="0" class="st-core"/>'
        '<stop offset=".45" class="st-core"/>'
        '<stop offset="1" class="st-glow"/></radialGradient>\n'
        '<clipPath id="vellum-torso-clip"><path d="M100 122Q100 116 107 116H149Q156 116 156 122L152 170Q151 180 141 180H115Q105 180 104 170Z"/></clipPath>\n'
        '<clipPath id="vellum-dome-clip"><path d="M88 104C88 70 104 44 128 44C152 44 168 70 168 104Z"/></clipPath>\n'
        "</defs>\n"
        '<rect width="256" height="256" fill="url(#vellum-sheet)"/>\n'
    )

    # Map margins: graticule, two coasts with water lining, a dotted route
    # and a small rose. All of it is fine detail.
    b.append(
        '<g class="fine">\n'
        '<path class="f-none s-ground-ink" stroke-width=".6" opacity=".45" stroke-dasharray="1 3" '
        'd="M0 64H256M0 192H256M64 0V256M192 0V256"/>\n'
        '<path class="f-none s-ground-ink" stroke-width="1.3" '
        'd="M0 182C14 178 24 190 38 186S58 196 62 210S56 230 70 240S78 252 80 256"/>\n'
        '<path class="f-none s-ground-ink" stroke-width=".7" opacity=".6" '
        'd="M0 189C14 185 22 197 34 193S52 203 55 216S50 236 63 245"/>\n'
        '<path class="f-none s-ground-ink" stroke-width=".6" opacity=".4" '
        'd="M0 196C12 193 20 204 30 200S46 210 49 222"/>\n'
        '<path class="f-none s-ground-ink" stroke-width="1.3" '
        'd="M256 30C240 36 234 22 220 26S204 16 200 0"/>\n'
        '<path class="f-none s-ground-ink" stroke-width=".7" opacity=".6" '
        'd="M256 38C238 44 230 30 216 33S198 22 193 0"/>\n'
        '<path class="f-none s-ground-ink" stroke-width="1.6" stroke-dasharray=".1 5" '
        'd="M78 236C104 226 126 244 150 232S196 214 226 200"/>\n'
        '<path class="f-none s-accent" stroke-width="2" d="M222 196l8 8m0 -8l-8 8"/>\n'
        f'<g opacity=".75">{compass_rose(222, 54, 15, 8, 3.6, 2.4, north_accent=True)}</g>\n'
        '<circle class="f-none s-ground-ink" cx="222" cy="54" r="11" stroke-width=".6"/>\n'
        '<path class="f-none s-ground-ink" stroke-width="1" d="M24 40l7 -9 7 9M34 40l8 -11 8 11M46 40l6 -7 6 7"/>\n'
        '<path class="f-none s-ground-ink" stroke-width=".6" opacity=".7" d="M33 33l2 5M35 35l1.6 4M44 32l2.4 6M46.4 34.6l2 4.6M54 35l1.6 4"/>\n'
        "</g>\n"
    )
    # Ground shadow under the feet.
    b.append(
        '<ellipse class="f-ground-ink" cx="128" cy="214" rx="42" ry="4.5" opacity=".35"/>\n'
    )

    # Legs and feet.
    b.append(
        '<g class="legs">'
        '<rect class="f-shade s-ink" stroke-width="1.6" x="108" y="176" width="12" height="28" rx="3"/>'
        '<rect class="f-shade s-ink" stroke-width="1.6" x="136" y="176" width="12" height="28" rx="3"/>'
        '<path class="f-none s-ink fine" stroke-width=".8" d="M108 184h12M108 196h12M136 184h12M136 196h12"/>'
        '<circle class="f-metal s-ink" stroke-width="1.3" cx="114" cy="190" r="4"/>'
        '<circle class="f-metal s-ink" stroke-width="1.3" cx="142" cy="190" r="4"/>'
        '<path class="f-metal s-ink" stroke-width="1.8" d="M99 213Q99 201 114 201Q127 201 127 213Z"/>'
        '<path class="f-metal s-ink" stroke-width="1.8" d="M129 213Q129 201 142 201Q157 201 157 213Z"/>'
        '<path class="f-none s-light" stroke-width="1.6" d="M104 208Q105 204 111 203.5M134 208Q135 204 140 203.5"/>'
        "</g>\n"
    )

    # Torso: a brass barrel, shaded on its right, with rivets.
    b.append(
        '<path class="f-metal" d="M100 122Q100 116 107 116H149Q156 116 156 122L152 170Q151 180 141 180H115Q105 180 104 170Z"/>\n'
        '<g clip-path="url(#vellum-torso-clip)">'
        '<path class="f-shade" opacity=".6" d="M141 110Q152 140 141 186H170V110Z"/>'
        f'<path class="f-none s-ink fine" stroke-width=".6" opacity=".45" d="{" ".join(f"M{x} 186L{x + 22} 110" for x in range(132, 176, 4))}"/>'
        '<path class="f-none s-light" stroke-width="3" opacity=".85" d="M108 126V164"/>'
        "</g>\n"
        '<path class="f-none s-ink" stroke-width="2" d="M100 122Q100 116 107 116H149Q156 116 156 122L152 170Q151 180 141 180H115Q105 180 104 170Z"/>\n'
        '<g class="f-ink fine"><circle cx="106" cy="122" r="1.3"/><circle cx="150" cy="122" r="1.3"/>'
        '<circle cx="109" cy="172" r="1.3"/><circle cx="147" cy="172" r="1.3"/></g>\n'
    )
    # Chest plate with the compass rose.
    ticks = []
    for i in range(32):
        a = i * 360 / 32
        r0 = 16.2 if i % 4 else 14.6
        x0, y0 = polar(128, 142, r0, a)
        x1, y1 = polar(128, 142, 18, a)
        ticks.append(f"M{n(x0)} {n(y0)}L{n(x1)} {n(y1)}")
    b.append(
        '<circle class="f-paper s-ink" stroke-width="1.8" cx="128" cy="142" r="19.5"/>\n'
        '<circle class="f-none s-shade" stroke-width="1.4" cx="128" cy="142" r="21.2"/>\n'
        f'<path class="f-none s-ink fine" stroke-width=".6" d="{" ".join(ticks)}"/>\n'
        + compass_rose(128, 142, 16, 10, 3.8, 2.7)
        + '<circle class="f-metal s-ink" stroke-width=".8" cx="128" cy="142" r="2.2"/>\n'
    )
    # Belt and buckle.
    b.append(
        '<rect class="f-shade s-ink" stroke-width="1.5" x="102" y="166" width="52" height="8.5" rx="2"/>\n'
        '<rect class="f-metal s-ink" stroke-width="1.4" x="122" y="164.5" width="12" height="11.5" rx="1.5"/>\n'
        '<rect class="f-none s-ink" stroke-width="1" x="125" y="167.5" width="6" height="5.5"/>\n'
    )

    # The rolled map, held at Vellum's left (the viewer's right).
    b.append(
        '<g transform="rotate(-62 178 150)">'
        '<rect class="f-paper s-ink" stroke-width="1.5" x="141" y="141" width="74" height="18" rx="3"/>'
        '<path class="f-none s-ink fine" stroke-width=".55" opacity=".55" d="M147 145.5H209M147 154.5H209"/>'
        '<path class="f-none s-ground-ink fine" stroke-width="1" stroke-dasharray=".1 3" d="M150 150H178"/>'
        '<ellipse class="f-paper s-ink" stroke-width="1.4" cx="215" cy="150" rx="4.2" ry="9"/>'
        '<path class="f-none s-ink" stroke-width=".9" d="M215 144.5C212.5 144.5 212.5 155 215 155C217 155 217 147.5 215 147.5C213.6 147.5 213.6 152 215 152"/>'
        '<rect class="f-accent s-ink" stroke-width="1" x="194" y="140" width="5.5" height="20" rx="1"/>'
        '<path class="f-accent s-ink" stroke-width="1" d="M196.5 160L193 168 196.5 166 199 169 198.5 160Z"/>'
        "</g>\n"
    )

    # Shoulder gears, one with a tiny ticking cog.
    b.append(
        f'<path class="f-shade s-ink" stroke-width="1.4" d="{gear(101, 124, 8.6, 11.2, 10)}"/>\n'
        f'<path class="f-shade s-ink" stroke-width="1.4" d="{gear(155, 124, 8.6, 11.2, 10)}"/>\n'
        f'<path class="f-metal s-ink" stroke-width="1.1" d="{gear(165.5, 111, 4.4, 6.2, 8)}"/>\n'
        '<circle class="f-metal s-ink" stroke-width="1.2" cx="101" cy="124" r="3.6"/>\n'
        '<circle class="f-metal s-ink" stroke-width="1.2" cx="155" cy="124" r="3.6"/>\n'
        '<g class="f-ink"><circle cx="101" cy="124" r="1.1"/><circle cx="155" cy="124" r="1.1"/><circle cx="165.5" cy="111" r="1.2"/></g>\n'
    )

    # Arms: brass tubes with jointed elbows.
    def limb(points):
        d = "M" + " L".join(f"{x} {y}" for x, y in points)
        return (
            f'<path class="f-none s-ink" stroke-width="10.5" d="{d}"/>'
            f'<path class="f-none s-metal" stroke-width="7.5" d="{d}"/>'
        )

    b.append(
        limb([(101, 128), (86, 150), (80, 130)])
        + limb([(155, 128), (172, 140), (170, 158)])
        + '<circle class="f-shade s-ink" stroke-width="1.3" cx="86" cy="150" r="4.6"/>'
        + '<circle class="f-shade s-ink" stroke-width="1.3" cx="172" cy="140" r="4.6"/>'
        + '<g class="f-ink"><circle cx="86" cy="150" r="1.1"/><circle cx="172" cy="140" r="1.1"/></g>\n'
    )

    # The quill, raised in Vellum's right hand (the viewer's left).
    b.append(quill((88, 142), (48, 60), rng))
    # An ink drop at the nib.
    b.append('<path class="f-ink" d="M89.5 147.5q2 3.5 0 5.2q-2 -1.7 0 -5.2Z"/>\n')

    # Hands, with ink-stained fingertips.
    b.append(
        '<circle class="f-metal s-ink" stroke-width="1.6" cx="81" cy="127" r="6.8"/>\n'
        '<path class="f-none s-ink" stroke-width="1" d="M75.5 124.5h7M75.5 128.5h7"/>\n'
        '<g class="f-ink"><circle cx="75.2" cy="124.5" r="1.7"/><circle cx="75.2" cy="128.5" r="1.7"/></g>\n'
        '<circle class="f-metal s-ink" stroke-width="1.6" cx="169" cy="160" r="6.8"/>\n'
        '<path class="f-none s-ink" stroke-width="1" d="M168 155.5v7M172 155.5v7"/>\n'
        '<g class="f-ink"><circle cx="168" cy="155" r="1.6"/><circle cx="172" cy="155" r="1.6"/></g>\n'
    )

    # Neck, then the head: a brass dome with a finial, ear cogs, lens eyes
    # under calm half-lids, and a small smile.
    b.append(
        '<rect class="f-shade s-ink" stroke-width="1.5" x="117" y="108" width="22" height="9"/>\n'
        '<path class="f-none s-ink fine" stroke-width=".8" d="M117 111.5h22M117 114.5h22"/>\n'
        '<rect class="f-shade s-ink" stroke-width="1.4" x="124.8" y="31" width="6.4" height="14" rx="1"/>\n'
        '<ellipse class="f-shade s-ink" stroke-width="1.4" cx="128" cy="46" rx="11" ry="3.4"/>\n'
        '<circle class="f-metal s-ink" stroke-width="1.6" cx="128" cy="29" r="5.6"/>\n'
        '<path class="f-none s-light" stroke-width="1.4" d="M125 27.5a3.4 3.4 0 0 1 2.6 -2.2"/>\n'
        '<path class="f-metal" d="M88 104C88 70 104 44 128 44C152 44 168 70 168 104Z"/>\n'
        '<g clip-path="url(#vellum-dome-clip)">'
        '<path class="f-shade" opacity=".55" d="M146 40C160 58 162 82 158 108H176V40Z"/>'
        f'<path class="f-none s-ink fine" stroke-width=".6" opacity=".4" d="{" ".join(f"M{x} 108L{x + 28} 40" for x in range(140, 184, 4))}"/>'
        '<path class="f-none s-light" stroke-width="3.6" opacity=".9" d="M97 84C97 70 105 58 117 52"/>'
        "</g>\n"
        '<path class="f-none s-ink" stroke-width="2" d="M88 104C88 70 104 44 128 44C152 44 168 70 168 104Z"/>\n'
        f'<path class="f-shade s-ink" stroke-width="1.3" d="{gear(88.5, 84, 5, 7.2, 8)}"/>\n'
        f'<path class="f-shade s-ink" stroke-width="1.3" d="{gear(167.5, 84, 5, 7.2, 8)}"/>\n'
        '<g class="f-ink"><circle cx="88.5" cy="84" r="1.6"/><circle cx="167.5" cy="84" r="1.6"/></g>\n'
        '<rect class="f-shade s-ink" stroke-width="1.8" x="84" y="100" width="88" height="10" rx="5"/>\n'
        '<g class="f-light fine"><circle cx="96" cy="105" r="1.4"/><circle cx="112" cy="105" r="1.4"/>'
        '<circle cx="128" cy="105" r="1.4"/><circle cx="144" cy="105" r="1.4"/><circle cx="160" cy="105" r="1.4"/></g>\n'
    )
    for cx in (112, 144):
        b.append(
            f'<circle class="f-shade s-ink" stroke-width="1.8" cx="{cx}" cy="76" r="12.6"/>'
            f'<circle cx="{cx}" cy="76" r="9.4" fill="url(#vellum-lens)"/>'
            f'<circle class="f-none s-ink" stroke-width="1.2" cx="{cx}" cy="76" r="9.4"/>'
            f'<circle class="f-ink" cx="{cx + 0.8}" cy="77.6" r="3.7"/>'
            f'<circle class="f-core" cx="{cx - 3.2}" cy="73.4" r="1.7"/>'
            # A calm half-lid over the top of each lens.
            f'<path class="f-metal s-ink" stroke-width="1.2" d="M{cx - 9.4} 76A9.4 9.4 0 0 1 {cx + 9.4} 76Q{cx} 71.6 {cx - 9.4} 76Z"/>'
            f'<path class="f-none s-light fine" stroke-width="1" d="M{cx - 6} 71.6Q{cx} 68.4 {cx + 5} 70.8"/>\n'
        )
    b.append(
        '<path class="f-none s-ink" stroke-width="2.2" d="M124 76H132"/>\n'
        '<path class="f-none s-ink" stroke-width="2.3" d="M120 92.5Q128 98.5 136 92.5"/>\n'
    )
    return svg(
        256,
        "Vellum",
        "".join(b),
        "A small brass clockwork cartographer with a domed head, round lens "
        "eyes under calm lids and a small smile. It holds a raised quill and "
        "a rolled map tied with a ribbon. A compass rose is set in its chest, "
        "and cogs turn at its shoulders. Faint coastlines and a dotted route "
        "fill the margins.",
    )


def vellum_avatar() -> str:
    b = []
    b.append(
        "<defs>\n"
        '<radialGradient id="vellum-avatar-lens" cx="40%" cy="36%" r="70%">'
        '<stop offset="0" class="st-core"/>'
        '<stop offset=".45" class="st-core"/>'
        '<stop offset="1" class="st-glow"/></radialGradient>\n'
        '<clipPath id="vellum-avatar-dome"><path d="M12 42C12 23 20 13 32 13C44 13 52 23 52 42Z"/></clipPath>\n'
        "</defs>\n"
        '<rect class="f-ground" width="64" height="66"/>\n'
        # Shoulders and the top of the compass rose.
        '<path class="f-metal s-ink" stroke-width="1.6" d="M7 66Q8 52 20 50H44Q56 52 57 66Z"/>\n'
        '<path class="f-shade" opacity=".55" d="M45 51Q53 54 55 66H48Q48 57 45 51Z"/>\n'
        '<circle class="f-paper s-ink" stroke-width="1.3" cx="32" cy="62" r="8.5"/>\n'
        + compass_rose(32, 62, 7.2, 4.4, 2, 1.4)
        + '<rect class="f-shade s-ink" stroke-width="1.3" x="26" y="45" width="12" height="6"/>\n'
        '<rect class="f-shade s-ink" stroke-width="1.3" x="30" y="9" width="4" height="5" rx=".8"/>\n'
        '<circle class="f-metal s-ink" stroke-width="1.3" cx="32" cy="9.6" r="2.8"/>\n'
        '<path class="f-metal" d="M12 42C12 23 20 13 32 13C44 13 52 23 52 42Z"/>\n'
        '<g clip-path="url(#vellum-avatar-dome)">'
        '<path class="f-shade" opacity=".55" d="M41 11C48 20 50 30 48 44H56V11Z"/>'
        '<path class="f-none s-light" stroke-width="2.2" opacity=".9" d="M16.5 31C16.5 24 20 19 25 16.5"/>'
        "</g>\n"
        '<path class="f-none s-ink" stroke-width="1.7" d="M12 42C12 23 20 13 32 13C44 13 52 23 52 42Z"/>\n'
        '<rect class="f-shade s-ink" stroke-width="1.5" x="9" y="39.5" width="46" height="6.5" rx="3.25"/>\n'
    )
    for cx in (24, 40):
        b.append(
            f'<circle class="f-shade s-ink" stroke-width="1.4" cx="{cx}" cy="28" r="7.2"/>'
            f'<circle cx="{cx}" cy="28" r="5.3" fill="url(#vellum-avatar-lens)"/>'
            f'<circle class="f-ink" cx="{cx + 0.5}" cy="29" r="2.3"/>'
            f'<path class="f-metal s-ink" stroke-width="1" d="M{cx - 5.3} 28A5.3 5.3 0 0 1 {cx + 5.3} 28Q{cx} 25.4 {cx - 5.3} 28Z"/>\n'
        )
    b.append('<path class="f-none s-ink" stroke-width="1.8" d="M27.5 36.4Q32 39.6 36.5 36.4"/>\n')
    return svg(
        64,
        "Vellum",
        "".join(b),
        "Vellum's brass head and lens eyes, simplified for small sizes.",
        # A closer cut than the drawing's 64 x 64 board, so the head fills
        # the circle.
        box="6 6 52 52",
    )


def main() -> None:
    files = {
        "lumen.svg": lumen(),
        "lumen-avatar.svg": lumen_avatar(),
        "vellum.svg": vellum(),
        "vellum-avatar.svg": vellum_avatar(),
    }
    for name, text in files.items():
        (OUT / name).write_text(text)
        print(f"{name}: {len(text.encode())} bytes")


if __name__ == "__main__":
    main()
