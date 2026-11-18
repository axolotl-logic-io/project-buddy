"""Writes the Soot & Brass ornament sprite.

Every shape is hand-placed geometry, written as SVG paths. Python only does
the trigonometry for marks set around a ring (the chapter marks and ticks),
so the dial's twelve divisions stay exact. No icon set or generated image is
used.

Each symbol is a mask, as system/THEME-INTERFACE.md requires: every element
is drawn in black with its own fill and stroke, and only opacity counts. The
component paints the mask with --ornament-ink, and elements marked
data-ink="accent" with --ornament-accent-ink.

Usage: python3 draw_ornaments.py OUT.svg
"""

import math
import sys

S = 'fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"'
F = 'fill="#000"'


def n(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def pt(cx, cy, r, deg):
    """A point on a ring; 0 degrees is twelve o'clock, clockwise."""
    a = math.radians(deg)
    return cx + r * math.sin(a), cy - r * math.cos(a)


def lozenge(cx, cy, w, h):
    return f"M{n(cx)} {n(cy - h)}L{n(cx + w)} {n(cy)}L{n(cx)} {n(cy + h)}L{n(cx - w)} {n(cy)}Z"


def rot(points, cx, cy, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in points]


def chapter_mark(cx, cy, r_apex, half, rise, leg, deg):
    """The dial's pointed chapter mark: a gable whose apex sits on r_apex,
    pointing outward, with two short legs inward (timer-dial.tsx:
    m198 32 12-12 12 12 m-24 0v8 m24-8v8)."""
    top = cy - r_apex
    pts = [(cx - half, top + rise + leg), (cx - half, top + rise), (cx, top), (cx + half, top + rise), (cx + half, top + rise + leg)]
    p = rot(pts, cx, cy, deg)
    return "M" + "L".join(f"{n(x)} {n(y)}" for x, y in p)


def lozenge_on_ring(cx, cy, r, w, h, deg):
    pts = [(cx, cy - r - h), (cx + w, cy - r), (cx, cy - r + h), (cx - w, cy - r)]
    p = rot(pts, cx, cy, deg)
    return "M" + "L".join(f"{n(x)} {n(y)}" for x, y in p) + "Z"


def tick(cx, cy, r1, r2, deg):
    x1, y1 = pt(cx, cy, r1, deg)
    x2, y2 = pt(cx, cy, r2, deg)
    return f"M{n(x1)} {n(y1)}L{n(x2)} {n(y2)}"


def circle(cx, cy, r, attrs):
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" {attrs}/>'


def path(d, attrs, accent=False, width=None):
    w = f' stroke-width="{n(width)}"' if width is not None else ""
    a = ' data-ink="accent"' if accent else ""
    return f'<path{a} d="{d}" {attrs}{w}/>'


def lancet(x1, x2, spring, r):
    """A pointed arch from (x1, spring) to (x2, spring) of radius r."""
    span = x2 - x1
    mid = (x1 + x2) / 2
    apex = spring - math.sqrt(r * r - (r - span / 2) ** 2)
    return f"M{n(x1)} {n(spring)}A{n(r)} {n(r)} 0 0 1 {n(mid)} {n(apex)}A{n(r)} {n(r)} 0 0 1 {n(x2)} {n(spring)}", apex


def quatrefoil(cx, cy, d, r, accent=True):
    """Four foils around a centre, filled; their union reads as tracery."""
    a = ' data-ink="accent"' if accent else ""
    out = [f'<circle{a} cx="{n(cx + dx)}" cy="{n(cy + dy)}" r="{n(r)}" {F}/>' for dx, dy in ((0, -d), (d, 0), (0, d), (-d, 0))]
    return "\n    ".join(out)


symbols = {}

# Heading flourish: the dial's chapter mark, drawn as a pointed arch with a
# brass lozenge where the dial has its marker fill.
arch, _ = lancet(3, 13, 10, 7)
symbols["orn-heading"] = ("0 0 16 16", "The mark before a section heading: the dial's chapter mark as a pointed arch.", [
    path(f"{arch}M3 10V15M13 10V15", S, width=1.7),
    path(lozenge(8, 9.6, 2, 2.6), F, accent=True),
])

# Section divider centre: a lozenge of tracery (a quatrefoil inside a
# lozenge), flanked by chapter ticks. 2:1, as the divider slot expects.
symbols["orn-divider"] = ("0 0 48 24", "A divider's centre: a quatrefoil in a lozenge between chapter ticks.", [
    path(lozenge(24, 12, 10, 10), S, width=1.4),
    path("M4 12H11M37 12H44M8 9V15M40 9V15", S, width=1.2),
    quatrefoil(24, 12, 2.6, 2.3),
])

# Frame corner, top left: a spandrel. The arc is the inside of a pointed
# arch meeting the corner; a short keyline runs along each edge, and a brass
# lozenge sits in the spandrel.
symbols["orn-corner"] = ("0 0 24 24", "Frame corner, top left: an arch spandrel with a brass lozenge.", [
    path("M2 22V2H22", S, width=2),
    path("M2 15A13 13 0 0 1 15 2", S, width=1.6),
    path(lozenge(6.6, 6.6, 3, 3), F, accent=True),
])

# Header band tile: a blind arcade of pointed arches, each with a small
# lozenge. It repeats across under the trail band.
arch, _ = lancet(1, 11, 8, 6)
symbols["orn-band"] = ("0 0 12 8", "One bay of the blind arcade under the trail band.", [
    path(arch, S, width=1),
    path(lozenge(6, 5.2, 1.2, 1.6), F, accent=True),
])

# Emblem: a rose window. Two rings, eight cusped openings and a brass
# quatrefoil at the centre. It is tracery, not a dial: it has no hand,
# arc or twelve divisions, so it never reads as a second timer.
parts = [circle(24, 24, 21.5, S + ' stroke-width="1.6"'), circle(24, 24, 18, S + ' stroke-width="0.9"')]
for k in range(8):
    deg = k * 45 + 22.5
    x, y = pt(24, 24, 12.6, deg)
    parts.append(circle(x, y, 4.2, S + ' stroke-width="1"'))
for k in range(8):
    parts.append(path(tick(24, 24, 15.5, 18, k * 45), S, width=1))
parts.append(quatrefoil(24, 24, 3.1, 2.8))
symbols["orn-emblem"] = ("0 0 48 48", "Empty state and sign-in emblem: a rose window of eight cusped openings.", parts)

# Swatch: the hour dial in small. One ring, twelve chapter ticks, a pointed
# chapter mark at each quarter, and a brass lozenge at twelve. The centre
# stays open so the texture shows.
parts = [circle(32, 32, 24, S + ' stroke-width="2"'), circle(32, 32, 19.5, S + ' stroke-width="1"')]
for k in range(12):
    if k % 3:
        parts.append(path(tick(32, 32, 19.5, 24, k * 30), S, width=1.6))
for k in range(4):
    parts.append(path(chapter_mark(32, 32, 30, 4.5, 4.5, 3, k * 90), S, width=2))
parts.append(path(lozenge_on_ring(32, 32, 26.5, 3, 3.6, 0), F, accent=True))
for k in (1, 2, 3):
    parts.append(path(lozenge_on_ring(32, 32, 26.5, 1.9, 2.4, k * 90), F, accent=True))
symbols["orn-swatch"] = ("0 0 64 64", "Appearance swatch: the hour dial's ring and chapter marks over the texture.", parts)

# Portrait frame: a bezel of two keylines in the outer 4% of the viewBox,
# with a lozenge at each corner and a gilt chapter lozenge at the middle of
# each side. The centre stays open for the portrait.
symbols["orn-portrait"] = ("0 0 100 100", "Construct portrait frame: a bezel with chapter lozenges.", [
    path("M1 1H99V99H1Z", S, width=1.3),
    path("M3.3 3.3H96.7V96.7H3.3Z", S, width=0.6),
    path(lozenge(2.1, 2.1, 1.9, 1.9) + lozenge(97.9, 2.1, 1.9, 1.9) + lozenge(2.1, 97.9, 1.9, 1.9) + lozenge(97.9, 97.9, 1.9, 1.9), F),
    path(lozenge(50, 2.1, 3.4, 1.9) + lozenge(50, 97.9, 3.4, 1.9) + lozenge(2.1, 50, 1.9, 3.4) + lozenge(97.9, 50, 1.9, 3.4), F, accent=True),
])

# Bullet: the dial's marker fill, a tall lozenge.
symbols["orn-bullet"] = ("0 0 8 8", "A list item's marker: the chapter lozenge.", [
    path(lozenge(4, 4, 2.6, 3.6), F),
])

# Rule end: the left terminal of a free-standing rule, a pointed finial and
# a chapter lozenge. The rule's line meets it at the right edge, at
# mid-height; the build mirrors it for the right end.
symbols["orn-rule-end"] = ("0 0 24 8", "A rule's left end: a finial and chapter lozenge. The build mirrors it.", [
    path("M1 4H3M11 4H24", S, width=1),
    path("M3 4L7 1L11 4L7 7Z", S, width=1),
    path(lozenge(7, 4, 1.3, 1.3), F, accent=True),
])

# Empty-state vignette: a Gothic hood mould with crockets and a finial,
# flanked by rules that end in chapter lozenges. It is open at the foot:
# the empty state sets the rose-window emblem just below it, so the two
# read as one gable with a rose window.
SPRING, R = 52, 40
hood, apex = lancet(33, 87, SPRING, R)
inner, _ = lancet(38, 82, SPRING, 35)
crockets = []
for t in (0.32, 0.62):
    for side in (-1, 1):
        # A point on the outer arch, by its height between spring and apex.
        y = SPRING - t * (SPRING - apex)
        centre = 33 + R if side < 0 else 87 - R
        x = centre + side * math.sqrt(R * R - (y - SPRING) ** 2)
        crockets.append(lozenge(x + side * 1.6, y - 1.2, 1.6, 2.2))
symbols["orn-vignette"] = ("0 0 120 52", "Empty-state vignette: a hood mould with crockets and a finial over the emblem.", [
    path(hood, S, width=1.6),
    path(inner, S, width=0.8),
    path("".join(crockets), F),
    path(f"M60 {n(apex)}V{n(apex - 3.5)}", S, width=1.4),
    path(lozenge(60, apex - 7, 2.2, 3.2), F, accent=True),
    path("M8 48H29M91 48H112", S, width=1),
    path(lozenge(5, 48, 2.4, 3) + lozenge(115, 48, 2.4, 3), F, accent=True),
])

# Notice marker: a solid lancet plaque with a gilt lozenge. It sits over
# the notice's brass start bar, so it is filled: an outline would let the
# bar show through and hide the lozenge.
arch, _ = lancet(1.5, 10.5, 7, 6)
symbols["orn-notice"] = ("0 0 12 12", "A notice marker: a solid lancet plaque with a gilt lozenge.", [
    path(f"{arch}V11H1.5Z", F),
    path(lozenge(6, 7, 1.6, 2.2), F, accent=True),
])

out = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    "  <!-- Soot & Brass ornament set. Hand-written geometry by the Soot and",
    "       Brass thread, 2026-11-17, written by tools/draw_ornaments.py. No",
    "       third-party artwork. Each symbol is a mask drawn in black; only",
    "       opacity counts. data-ink=\"accent\" marks the second ornament ink. -->",
]
for sid, (vb, note, body) in symbols.items():
    out.append(f"\n  <!-- {note} -->")
    out.append(f'  <symbol id="{sid}" viewBox="{vb}">')
    out.extend(f"    {b}" for b in body)
    out.append("  </symbol>")
out.append("</svg>\n")
open(sys.argv[1], "w").write("\n".join(out))
print("wrote", sys.argv[1], len(symbols), "symbols")
