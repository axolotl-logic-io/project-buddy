"""Keeps a small set of Ivory Vellum screenshots as evidence.

Shoot first, from the repository root, into a folder outside the repo:

    ls outputs/theme-redesign/views/*.html | xargs -n1 basename \
      | sed 's/\.html$/@light/' \
      | xargs node outputs/theme-redesign/system/shoot.mjs --out /tmp/iv-shots specimen@light

Then run:

    python3 -I outputs/theme-redesign/themes/ivory-vellum/tools/keep_evidence.py /tmp/iv-shots

Each view is kept once, at one width, alternating so both widths are
covered; the specimen is kept at both widths, cropped to this appearance's
section. Every file is quantized to a 128-colour palette with median cut
and no dithering, as capture/compress.py does. Needs Pillow.
"""

import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "evidence"
# Where the Soot & Brass section starts in system/specimen.html, measured
# with Playwright on 2026-11-17.
SPECIMEN_END = {1280: 7710, 360: 12705}
# Views that read best at phone width; the rest are kept at 1280.
PHONE = {
    "construct--vellum", "quest--conversation", "quest--loading-reply",
    "quest--quick-notes", "quest--row-menu", "quest--sidebar-drawer",
    "quests--empty", "settings--default", "sign-in--link-sent",
    "site-panel--open", "spell--editor", "spellbook--yours-empty",
    "timer--setup", "profile--experience",
}


def save(image, path):
    image.convert("RGB").quantize(
        colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
    ).save(path, optimize=True)


def main(shots):
    OUT.mkdir(exist_ok=True)
    kept = 0
    for path in sorted(shots.glob("*--light--*.png")):
        name, width = path.stem.split("--light--")
        if (width == "360") != (name in PHONE):
            continue
        with Image.open(path) as image:
            save(image, OUT / path.name)
        kept += 1
    for width, end in SPECIMEN_END.items():
        with Image.open(shots / f"specimen--{width}.png") as image:
            save(image.crop((0, 0, width, min(end, image.height))), OUT / f"specimen--light--{width}.png")
        kept += 1
    print(f"Kept {kept} files in {OUT}")


main(Path(sys.argv[1]))
