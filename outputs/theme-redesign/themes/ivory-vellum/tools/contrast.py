"""WCAG contrast of Ivory Vellum pairs against the texture and surfaces.

Texture luminances come from sample_texture_canvas.mjs (Chromium decode) and
sample_texture.py: the darkest single pixel
(the strict case for dark ink), the darkest 8 px block, the mean and the
lightest pixel. Usage: python3 contrast.py
"""

def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def L(rgb):
    r, g, b = rgb
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def ratio(a, b):
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)

TEXTURE = {"tex-darkest-px": 0.6142, "tex-darkest-8px": 0.7578, "tex-mean": 0.7953, "tex-lightest-px": 0.9264}

P = {
    "background": (246, 229, 194),
    "surface": (251, 237, 205),
    "field": (255, 248, 230),
    "secondary-surface": (243, 224, 184),
    "foreground": (52, 32, 18),
    "muted": (98, 68, 40),
    "line": (134, 96, 50),
    "primary": (92, 55, 22),
    "on-primary": (255, 244, 220),
    "accent": (122, 71, 16),
    "rubric": (150, 50, 32),
    "danger": (128, 26, 36),
    "on-danger": (255, 244, 225),
    "focus": (115, 65, 18),
    "action-fill": (128, 80, 20),
    "on-action": (255, 246, 226),
    "action-paper": (255, 248, 230),
    "action-ink": (52, 32, 18),
    "gold": (171, 126, 47),
    "pale-gold": (206, 180, 124),
    "header-ink": (49, 30, 16),
    "header-paper": (250, 232, 192),
    "header-gold": (201, 160, 72),
    "code-surface": (246, 230, 196),
    "on-accent": (255, 246, 226),
    "code-comment": (104, 72, 42),
    "code-keyword": (111, 47, 36),
    "code-string": (62, 82, 36),
    "code-function": (62, 62, 100),
    "code-constant": (112, 62, 20),
}
# The values in tokens.css, kept by hand in step with it.

def show(fg, bgs, need):
    for bg in bgs:
        lb = TEXTURE[bg] if bg in TEXTURE else L(P[bg])
        r = ratio(L(P[fg]), lb)
        flag = "ok " if r >= need else "LOW"
        print(f"{flag} {fg:>14} on {bg:<16} {r:5.2f}  (needs {need})")

text_bgs = ["tex-darkest-px", "tex-darkest-8px", "background", "surface", "field", "secondary-surface"]
print("== Text (4.5:1)")
for fg in ("foreground", "muted", "primary", "accent", "rubric", "danger", "action-ink"):
    show(fg, text_bgs, 4.5)
print("== Action labels (4.5:1)")
show("on-action", ["action-fill"], 4.5)
show("on-primary", ["primary"], 4.5)
show("on-danger", ["danger"], 4.5)
show("action-ink", ["action-paper"], 4.5)
show("header-paper", ["header-ink"], 4.5)
show("header-gold", ["header-ink"], 3)
show("on-accent", ["accent"], 4.5)
print("== Code colours on code-surface (4.5:1)")
for fg in ("foreground", "code-comment", "code-keyword", "code-string", "code-function", "code-constant"):
    show(fg, ["code-surface"], 4.5)
print("== Progress ring (arc 3:1, ink 4.5:1 on the disc, which is surface)")
show("primary", ["surface"], 3)
show("foreground", ["surface"], 4.5)
show("rubric", ["surface"], 4.5)
print("== Boundaries and focus (3:1)")
for fg in ("line", "focus", "action-fill", "danger"):
    show(fg, ["tex-darkest-px", "surface", "field", "secondary-surface", "code-surface"], 3)
show("focus", ["action-paper"], 3)
print("== Focus inside the dark header (3:1). The header has no focus token of")
print("   its own yet, so --focus lands on --header-ink; gold would pass.")
show("focus", ["header-ink"], 3)
show("header-gold", ["header-ink"], 3)
print("== Ornament inks (decorative; aim >= 2:1 to be seen)")
for fg in ("gold", "pale-gold", "line", "rubric"):
    show(fg, ["tex-mean", "surface"], 2)
print("== Rubric vs danger distinguishability (luminance ratio)")
print(f"   rubric/danger {ratio(L(P['rubric']), L(P['danger'])):.2f}")
