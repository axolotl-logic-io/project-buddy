"""Writes the Soot & Brass ornament sprite.

Every shape is hand-placed geometry, written as SVG paths. Python only does
the trigonometry for marks set around a ring (the chapter marks and ticks),
so the dial's twelve divisions stay exact. No icon set or generated image is
used.

Each element carries its own fill and stroke in currentColor, so the sprite
works both as inline SVG coloured by a theme token and as a mask image (where
currentColor is black and only opacity counts). Elements marked
data-ink="accent" take the second ornament ink.

Usage: python3 draw_ornaments.py OUT.svg
"""

import math
import sys

S = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"'
F = 'fill="currentColor"'


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
    path(lozenge(6, 5.2, 1.2, 1.6), F),
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

# Portrait frame: a case of two keylines, pointed-arch spandrels in the two
# upper corners, and a brass lozenge at the middle of each side. The middle
# stays open for the portrait.
symbols["orn-portrait"] = ("0 0 100 100", "Construct portrait frame: a bezel with arch spandrels and chapter lozenges.", [
    path("M1.5 1.5H98.5V98.5H1.5Z", S, width=1.6),
    path("M4 4H96V96H4Z", S, width=0.7),
    path("M4 20A16 16 0 0 1 20 4M96 20A16 16 0 0 0 80 4", S, width=0.9),
    path(lozenge(9.2, 9.2, 2.2, 2.2) + lozenge(90.8, 9.2, 2.2, 2.2), F),
    path(lozenge(50, 1.5, 3, 3.6) + lozenge(50, 98.5, 3, 3.6) + lozenge(1.5, 50, 3.6, 3) + lozenge(98.5, 50, 3.6, 3), F, accent=True),
])

# Bullet: the dial's marker fill, a tall lozenge.
symbols["orn-bullet"] = ("0 0 8 8", "A list item's marker: the chapter lozenge.", [
    path(lozenge(4, 4, 2.6, 3.6), F),
])

# Rule end: a terminal for a hairline rule, a pointed finial with a lozenge.
symbols["orn-rule-end"] = ("0 0 24 12", "A rule's right-hand end: a lozenge and pointed finial. Mirror it for the left.", [
    path("M0 6H13M18 6H23", S, width=1),
    path("M13 6L15.5 3.5L18 6L15.5 8.5Z", S, width=1),
    path(lozenge(15.5, 6, 1, 1), F, accent=True),
])

# Empty-state vignette: a lancet window, two lights under a rose, flanked by
# rules that end in chapter lozenges.
outer, _ = lancet(42, 78, 34, 30)
left, _ = lancet(47, 59, 44, 10)
right, _ = lancet(61, 73, 44, 10)
symbols["orn-vignette"] = ("0 0 120 72", "Empty-state vignette: a two-light lancet window with a rose, between rules.", [
    path(f"{outer}V70H42Z", S, width=1.6),
    path(f"{left}V66H47Z{right}V66H61Z", S, width=1),
    circle(60, 27, 7, S + ' stroke-width="1"'),
    quatrefoil(60, 27, 2.4, 2.1),
    path("M4 58H36M84 58H116", S, width=1),
    path(lozenge(4, 58, 2.4, 3) + lozenge(116, 58, 2.4, 3), F, accent=True),
    path("M36 70H84", S, width=1.2),
])

# Notice marker: a small lancet with a lozenge, for list items or notices
# where the heading mark would be too large.
arch, _ = lancet(1.5, 10.5, 7, 6)
symbols["orn-notice"] = ("0 0 12 12", "A notice marker: a small lancet arch with a lozenge.", [
    path(f"{arch}V11H1.5Z", S, width=1.2),
    path(lozenge(6, 7, 1.4, 1.9), F, accent=True),
])

out = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    "  <!-- Soot & Brass ornament set (draft). Hand-written geometry by the",
    "       Soot & Brass thread, 2026-11-17; written by tools/draw_ornaments.py.",
    "       No third-party artwork. Each element is painted in currentColor:",
    "       as a mask, only opacity counts. data-ink=\"accent\" marks the",
    "       second ornament ink. -->",
]
for sid, (vb, note, body) in symbols.items():
    out.append(f"\n  <!-- {note} -->")
    out.append(f'  <symbol id="{sid}" viewBox="{vb}">')
    out.extend(f"    {b}" for b in body)
    out.append("  </symbol>")
out.append("</svg>\n")
open(sys.argv[1], "w").write("\n".join(out))
print("wrote", sys.argv[1], len(symbols), "symbols")
