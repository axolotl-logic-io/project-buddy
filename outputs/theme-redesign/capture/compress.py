"""Shrinks the capture's screenshots to a 128-colour palette.

Run from the repository root after capture.mjs:

    python3 -I outputs/theme-redesign/capture/compress.py

Each PNG in capture/screenshots/ is quantized in place with median cut and
no dithering, which keeps the paper textures readable and roughly halves the
file. A file that is already a palette image is skipped, so the script is
safe to run twice. Needs Pillow.
"""

from pathlib import Path

from PIL import Image

SHOTS = Path(__file__).resolve().parent / "screenshots"


def main():
    before = after = 0
    for path in sorted(SHOTS.glob("*.png")):
        size = path.stat().st_size
        before += size
        with Image.open(path) as image:
            if image.mode == "P":
                after += size
                continue
            quantized = image.convert("RGB").quantize(
                colors=128,
                method=Image.Quantize.MEDIANCUT,
                dither=Image.Dither.NONE,
            )
        quantized.save(path, optimize=True)
        after += path.stat().st_size
    print(f"{before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")


main()
