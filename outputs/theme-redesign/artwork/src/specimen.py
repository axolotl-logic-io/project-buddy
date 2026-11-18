"""Builds specimen.html: each construct at 32, 40, 64, 224 and 264 px in each
appearance, on its real texture, beside the current raster art.

Everything is inlined (textures, raster art, the font, the SVG), so the page
opens from disk. Textures are embedded byte for byte, unchanged.

Run:  python3 outputs/theme-redesign/artwork/src/specimen.py
"""

from __future__ import annotations

import base64
import html
import re
from pathlib import Path

ART = Path(__file__).resolve().parent.parent
REPO = ART.parents[2]
PUBLIC = REPO / "apps/web/public"
FONTS = REPO / "apps/web/src/themes/fonts"


def data_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


TEXTURES = {
    "light": data_uri(PUBLIC / "textures/ivory-vellum.webp", "image/webp"),
    "soot-brass": data_uri(PUBLIC / "textures/soot-brass.webp", "image/webp"),
    "dark": data_uri(PUBLIC / "textures/espresso-leather.webp", "image/webp"),
}

# The proposed --construct-* values for each appearance. The appearance
# threads own the final values; these are the artwork thread's proposal.
APPEARANCES = [
    {
        "mode": "light",
        "name": "Ivory Vellum",
        "note": "Sepia ink, gold leaf and a red rubric on vellum.",
        "page": "--page-ink: rgb(53 33 17); --page-muted: rgb(103 72 40); --page-panel: rgb(250 229 185 / .82); --page-line: rgb(134 96 50);",
        "roles": {
            "ground": "rgb(251 239 213)",
            "ground-ink": "rgb(150 112 64)",
            "ink": "rgb(58 36 18)",
            "metal": "rgb(214 168 74)",
            "metal-shade": "rgb(150 104 42)",
            "metal-light": "rgb(250 230 164)",
            "paper": "rgb(255 249 230)",
            "glow": "rgb(230 166 48)",
            "glow-core": "rgb(255 251 232)",
            "accent": "rgb(160 44 28)",
        },
        # The existing light tokens, for the fallback row.
        "fallback": "--field: rgb(255 243 215); --line: rgb(134 96 50); --header-ink: oklch(25% 0.04 60); --header-gold: oklch(78% 0.13 80); --header-paper: oklch(92% 0.065 85); --accent: rgb(128 75 17);",
    },
    {
        "mode": "soot-brass",
        "name": "Soot & Brass",
        "note": "Muted clockwork brass and soot on a burgundy cover.",
        "page": "--page-ink: rgb(238 228 210); --page-muted: rgb(199 187 169); --page-panel: rgb(41 30 34 / .86); --page-line: rgb(162 147 126);",
        "roles": {
            "ground": "rgb(60 29 36)",
            "ground-ink": "rgb(160 116 108)",
            "ink": "rgb(28 19 21)",
            "metal": "rgb(200 174 120)",
            "metal-shade": "rgb(128 104 68)",
            "metal-light": "rgb(238 224 186)",
            "paper": "rgb(230 219 196)",
            "glow": "rgb(234 200 132)",
            "glow-core": "rgb(255 247 226)",
            "accent": "rgb(158 40 46)",
        },
        "fallback": "--field: rgb(25 23 25); --line: rgb(162 147 126); --header-ink: rgb(29 24 26); --header-gold: rgb(185 160 106); --header-paper: rgb(238 228 210); --accent: rgb(194 181 155);",
    },
    {
        "mode": "dark",
        "name": "Espresso Leather",
        "note": "Candle-warm brass and ivory on tooled leather.",
        "page": "--page-ink: rgb(250 229 185); --page-muted: rgb(209 178 132); --page-panel: rgb(49 36 24 / .86); --page-line: rgb(173 135 82);",
        "roles": {
            "ground": "rgb(40 27 18)",
            "ground-ink": "rgb(132 98 64)",
            "ink": "rgb(32 20 11)",
            "metal": "rgb(218 168 88)",
            "metal-shade": "rgb(140 96 44)",
            "metal-light": "rgb(248 220 160)",
            "paper": "rgb(240 225 196)",
            "glow": "rgb(248 188 92)",
            "glow-core": "rgb(255 245 218)",
            "accent": "rgb(164 48 32)",
        },
        "fallback": "--field: rgb(30 23 16); --line: rgb(173 135 82); --header-ink: oklch(25% 0.04 60); --header-gold: oklch(78% 0.13 80); --header-paper: oklch(92% 0.065 85); --accent: rgb(216 164 82);",
    },
]

CONSTRUCTS = [
    {
        "id": "lumen",
        "name": "Lumen",
        # Current raster art and its avatar frame, from src/constructs/lumen.ts.
        "v1_frame": (0.5, 0.53, 0.27),
        # A crop of the full v2 drawing, for comparison with the avatar cut.
        "crop": (0.5, 0.5, 0.56),
    },
    {
        "id": "vellum",
        "name": "Vellum",
        "v1_frame": (0.49, 0.22, 0.32),
        "crop": (0.5, 0.27, 0.42),
    },
]

STYLE_BLOCK = re.compile(r"<style>.*?</style>\n?", re.S)
TITLE_DESC = re.compile(r"<title.*?</desc>\n", re.S)
COUNTER = {"n": 0}
# Each raster is embedded once, as a custom property.
RASTERS: set[tuple[str, int]] = set()


def inline_svg(name: str, frame=None, view=256) -> str:
    """One inline copy with ids made unique, so each copy's gradients
    resolve their colours in their own appearance."""
    COUNTER["n"] += 1
    suffix = f"-i{COUNTER['n']}"
    text = (ART / name).read_text()
    text = STYLE_BLOCK.sub("", text)
    # The frame carries the accessible name, as in the app.
    text = TITLE_DESC.sub("", text)
    text = text.replace(' role="img" aria-labelledby="title desc"', ' aria-hidden="true" focusable="false"')
    for ident in set(re.findall(r'id="([^"]+)"', text)):
        text = text.replace(f'id="{ident}"', f'id="{ident}{suffix}"')
        text = text.replace(f"url(#{ident})", f"url(#{ident}{suffix})")
    if frame is not None:
        x, y, size = frame
        s = size * view
        box = f"{x * view - s / 2:.2f} {y * view - s / 2:.2f} {s:.2f} {s:.2f}"
        text = re.sub(r'viewBox="[^"]+"', f'viewBox="{box}"', text, count=1)
    return text.replace("<?xml", "")


def raster(cid: str, px: int, frame=None) -> str:
    """The current art, framed the way construct-visual.tsx frames it."""
    x, y, size = frame or (0.5, 0.5, 1)
    need = px / size * 2
    width = next(w for w in (64, 128, 256, 512, 1024) if w >= need) if need <= 1024 else 1024
    RASTERS.add((cid, width))
    style = (
        f"background-image:var(--{cid}-v1-{width});"
        f"width:{100 / size:.3f}%;height:{100 / size:.3f}%;"
        f"left:{50 - x * 100 / size:.3f}%;top:{50 - y * 100 / size:.3f}%"
    )
    return f'<span class="raster" style="{style}"></span>'


def visual(inner: str, role: str, px: int, label: str) -> str:
    avatar = role == "avatar"
    body = (
        f'<span class="construct-visual" data-visual-role="{role}" role="img" '
        f'aria-label="{html.escape(label)}">{inner}</span>'
    )
    if avatar:
        body = f'<span class="construct-avatar" style="--s:{px}px">{body}</span>'
    else:
        body = f'<span class="construct-frame" style="--s:{px}px">{body}</span>'
    return body


def cell(px: int, caption: str, content: str) -> str:
    return (
        f'<figure class="cell"><div class="cell-art">{content}</div>'
        f"<figcaption>{px} px<br><span>{caption}</span></figcaption></figure>"
    )


def construct_rows(c: dict) -> str:
    cid, name = c["id"], c["name"]
    proposed = "".join(
        [
            cell(32, "avatar cut", visual(inline_svg(f"{cid}-avatar.svg", view=64), "avatar", 32, name)),
            cell(40, "avatar cut", visual(inline_svg(f"{cid}-avatar.svg", view=64), "avatar", 40, name)),
            cell(64, "avatar cut", visual(inline_svg(f"{cid}-avatar.svg", view=64), "avatar", 64, name)),
            cell(64, "portrait", visual(inline_svg(f"{cid}.svg"), "portrait", 64, name)),
            cell(224, "opening", visual(inline_svg(f"{cid}.svg"), "opening", 224, name)),
            cell(264, "portrait", visual(inline_svg(f"{cid}.svg"), "portrait", 264, name)),
        ]
    )
    current = "".join(
        [
            cell(32, "avatar frame", visual(raster(cid, 32, c["v1_frame"]), "avatar", 32, name)),
            cell(40, "avatar frame", visual(raster(cid, 40, c["v1_frame"]), "avatar", 40, name)),
            cell(64, "avatar frame", visual(raster(cid, 64, c["v1_frame"]), "avatar", 64, name)),
            cell(64, "portrait", visual(raster(cid, 64), "portrait", 64, name)),
            cell(224, "opening", visual(raster(cid, 224), "opening", 224, name)),
            cell(264, "portrait", visual(raster(cid, 264), "portrait", 264, name)),
        ]
    )
    crop = "".join(
        [
            cell(32, "crop of portrait", visual(inline_svg(f"{cid}.svg", frame=c["crop"]), "avatar", 32, name)),
            cell(40, "crop of portrait", visual(inline_svg(f"{cid}.svg", frame=c["crop"]), "avatar", 40, name)),
        ]
    )
    context = (
        '<div class="in-context">'
        f'<p class="speaker">{visual(inline_svg(f"{cid}-avatar.svg", view=64), "avatar", 32, name)}'
        f"<span>{name}</span></p>"
        '<p class="trail">'
        f'{visual(inline_svg(f"{cid}-avatar.svg", view=64), "avatar", 40, name)}'
        f"<span>{name}</span></p>"
        "</div>"
    )
    return (
        f'<div class="construct"><h3>{name}</h3>'
        f'<p class="strip-label">Proposed: live SVG</p><div class="strip">{proposed}</div>'
        f'<p class="strip-label">Current: raster art (v1)</p><div class="strip">{current}</div>'
        f'<div class="split"><div><p class="strip-label">Not chosen: a crop of the full drawing</p>'
        f'<div class="strip">{crop}</div></div>'
        f'<div><p class="strip-label">In context: a chat speaker (32 px) and the trail band (40 px)</p>{context}</div></div>'
        "</div>"
    )


def frame_demo(c: dict) -> str:
    """The portrait inside a stand-in frame, with the safe areas drawn."""
    cid, name = c["id"], c["name"]
    return (
        '<figure class="frame-demo">'
        '<div class="frame-box">'
        f'{visual(inline_svg(f"{cid}.svg"), "portrait", 184, name)}'
        '<svg class="frame-guides" viewBox="0 0 100 100" aria-hidden="true">'
        '<rect class="g-frame" x="1" y="1" width="98" height="98"/>'
        '<rect class="g-frame thin" x="3.2" y="3.2" width="93.6" height="93.6"/>'
        '<rect class="g-image" x="4" y="4" width="92" height="92"/>'
        '<rect class="g-overlap" x="9.5" y="9.5" width="81" height="81"/>'
        '<circle class="g-safe" cx="50" cy="50" r="40.5"/>'
        "</svg></div>"
        f"<figcaption>{name} in a stand-in plate frame. Solid: the image. "
        "Dotted: how far a frame may reach into it. Dashed circle: the "
        "essential figure, safe under a round medallion.</figcaption></figure>"
    )


# Clears the section's --construct-* values, so the drawings fall back to
# the contract tokens.
UNSET = " ".join(
    f"--construct-{k}: initial;"
    for k in APPEARANCES[0]["roles"]
)


def fallback_row(app: dict) -> str:
    cells = []
    for c in CONSTRUCTS:
        cells.append(cell(40, c["name"], visual(inline_svg(f"{c['id']}-avatar.svg", view=64), "avatar", 40, c["name"])))
        cells.append(cell(112, c["name"], visual(inline_svg(f"{c['id']}.svg"), "portrait", 112, c["name"])))
    return (
        f'<div class="fallback" style="{UNSET} {app["fallback"]}">'
        '<p class="strip-label">Fallback: no --construct-* values, only today\'s tokens</p>'
        f'<div class="strip">{"".join(cells)}</div></div>'
    )


def section(app: dict) -> str:
    roles = " ".join(f"--construct-{k}: {v};" for k, v in app["roles"].items())
    rows = "".join(construct_rows(c) for c in CONSTRUCTS)
    demos = "".join(frame_demo(c) for c in CONSTRUCTS)
    return (
        f'<section class="appearance" data-mode="{app["mode"]}" '
        f'style="background-image:url({TEXTURES[app["mode"]]}); {app["page"]} {roles}">'
        f'<div class="panel"><h2>{app["name"]}</h2><p class="note">{app["note"]}</p>'
        f"{rows}"
        f'<div class="demos">{demos}</div>'
        f"{fallback_row(app)}"
        "</div></section>"
    )


PAGE_CSS = """
@font-face { font-family: "Source Serif 4"; src: url(FONT) format("woff2"); font-weight: 200 900; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: "Source Serif 4", Georgia, serif; background: #000; }
header.page { padding: 24px max(16px, calc(50% - 600px)); background: rgb(36 27 19); color: rgb(250 229 185); }
header.page h1 { margin: 0 0 6px; font-size: 1.6rem; font-weight: 600; }
header.page p { margin: 0; max-width: 70ch; line-height: 1.5; color: rgb(209 178 132); }
.appearance { background-size: 512px; background-repeat: repeat; padding: 24px max(12px, calc(50% - 600px)); color: var(--page-ink); }
.panel { background: var(--page-panel); border: 1px solid var(--page-line); padding: 20px; }
h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
h3 { margin: 18px 0 4px; font-size: 1.2rem; font-weight: 600; }
.note { margin: 4px 0 0; color: var(--page-muted); }
.strip-label { margin: 12px 0 6px; font-size: .8rem; letter-spacing: .06em; text-transform: uppercase; color: var(--page-muted); }
.strip { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
.cell { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.cell-art { display: flex; align-items: flex-end; }
figcaption { font-size: .75rem; line-height: 1.25; text-align: center; color: var(--page-muted); }
figcaption span { font-style: italic; }
.split { display: flex; flex-wrap: wrap; gap: 32px; }
.in-context { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; }
.in-context p { margin: 0; display: flex; align-items: center; gap: 8px; }
.speaker { font-variant-caps: all-small-caps; letter-spacing: .06em; font-weight: 700; font-size: .95rem; }
.trail { font-size: 1.1rem; font-weight: 600; }

/* The app's construct frame (src/app/page-roles.css), as it is today. */
.construct-visual { position: relative; display: inline-grid; place-items: center; container-type: inline-size;
  inline-size: 100%; aspect-ratio: 1; overflow: hidden; background: rgb(128 75 17); color: rgb(255 244 220); line-height: 1; }
.construct-visual .raster { position: absolute; background-size: 100% 100%; }
.construct-visual > svg { position: absolute; inset: 0; }
.construct-visual[data-visual-role="avatar"] { border-radius: 50%; }
.construct-avatar, .construct-frame { display: inline-flex; flex-shrink: 0; inline-size: var(--s); block-size: var(--s); }

.demos { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 20px; }
.frame-demo { margin: 0; max-width: 240px; }
.frame-box { position: relative; inline-size: 200px; block-size: 200px; display: grid; place-items: center; }
.frame-box > .construct-frame { position: relative; z-index: 0; }
.frame-guides { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; pointer-events: none; }
.g-frame { stroke: var(--page-line); stroke-width: 1.6; }
.g-frame.thin { stroke-width: .6; }
.g-image { stroke: var(--page-ink); stroke-width: .5; }
.g-overlap { stroke: var(--page-ink); stroke-width: .5; stroke-dasharray: .6 1.2; }
.g-safe { stroke: var(--page-ink); stroke-width: .5; stroke-dasharray: 2 1.5; }
.frame-demo figcaption { text-align: left; margin-top: 6px; }
.fallback { margin-top: 12px; border-top: 1px solid var(--page-line); }
"""


def main() -> None:
    font = data_uri(FONTS / "source-serif-4/source-serif-4-latin-wght-normal.woff2", "font/woff2")
    css = PAGE_CSS.replace("FONT", font) + (ART / "construct-art.css").read_text()
    body = "".join(section(a) for a in APPEARANCES)
    css += ":root {" + "".join(
        f"--{cid}-v1-{w}: url({data_uri(PUBLIC / f'constructs/{cid}-v1-{w}.webp', 'image/webp')});"
        for cid, w in sorted(RASTERS)
    ) + "}"
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Construct artwork specimen: Lumen and Vellum</title>
<style>{css}</style></head>
<body>
<header class="page"><h1>Construct artwork specimen</h1>
<p>Lumen and Vellum drawn as live SVG that takes its colours from each appearance.
Each appearance shows the proposed drawings at 32, 40, 64, 224 and 264 px above the
current raster art, on that appearance's own texture.</p></header>
{body}
</body></html>
"""
    (ART / "specimen.html").write_text(page)
    print(f"specimen.html: {len(page.encode()) // 1024} KB")


if __name__ == "__main__":
    main()
