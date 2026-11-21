#!/usr/bin/env python3
"""Write the appearance ornaments the site uses.

Reads each appearance's themes/<folder>/ornaments.svg and writes
apps/web/src/themes/ornaments.generated.css. Python 3 standard library only.

Run it from anywhere:

  python3 apps/web/design/build.py --app-ornaments
"""

from __future__ import annotations

import os
import re
import sys
import tempfile
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]

# (theme folder, mode: the data-mode and theme cookie value, display name)
APPEARANCES = [
    ("ivory-vellum", "light", "Ivory Vellum"),
    ("soot-brass", "soot-brass", "Soot & Brass"),
    ("espresso-leather", "dark", "Espresso Leather"),
]

ORNAMENT_SLOTS = ["divider", "heading", "band", "emblem", "swatch", "portrait",
                  "vignette", "notice"]
# Every theme draws these. The others are optional: a theme that leaves one
# out gets a blank image, and the slot's size token keeps it at 0.
REQUIRED_SYMBOLS = ["orn-corner", "orn-divider", "orn-heading", "orn-band",
                    "orn-emblem", "orn-swatch", "orn-portrait", "orn-bullet"]
OPTIONAL_SYMBOLS = ["orn-vignette", "orn-notice", "orn-rule-end"]


def fail(message: str) -> None:
    print(f"build.py: {message}", file=sys.stderr)
    sys.exit(1)



def strip_ns(element: ET.Element) -> None:
    for node in element.iter():
        if isinstance(node.tag, str) and "}" in node.tag:
            node.tag = node.tag.split("}", 1)[1]
        for key in list(node.attrib):
            if "}" in key:
                node.attrib[key.split("}", 1)[1]] = node.attrib.pop(key)


def write_atomic(path: Path, data: str | bytes) -> None:
    """Write a file so that a reader never sees it half written.

    Several threads run this build in one checkout at once. Each output is
    written to a temporary file in the same folder and then renamed over
    the target, which is atomic on one file system."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data.encode() if isinstance(data, str) else data)
        os.chmod(temp, 0o644)
        os.replace(temp, path)
    except BaseException:
        Path(temp).unlink(missing_ok=True)
        raise


def svg_uri(view_box: str, children: list[ET.Element], transform: str = "") -> str:
    _, _, w, h = view_box.split()
    body = "".join(ET.tostring(child, encoding="unicode") for child in children)
    if transform:
        body = f'<g transform="{transform}">{body}</g>'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" '
           f'width="{w}" height="{h}">{body}</svg>')
    svg = re.sub(r">\s+<", "><", svg)
    return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe=" /=:',()") + '")'


def ornament_tokens(svg_path: Path) -> dict[str, str]:
    """Return --orn-* declarations for one appearance's ornaments.svg."""
    # Comments are dropped first: a stray "--" inside one is not valid XML.
    source = re.sub(r"<!--.*?-->", "", svg_path.read_text(), flags=re.S)
    try:
        root = ET.fromstring(source)
    except ET.ParseError as error:
        fail(f"{svg_path} is not valid XML: {error}")
    strip_ns(root)
    symbols = {s.get("id"): s for s in root.iter("symbol")}
    tokens: dict[str, str] = {}

    def split(symbol: ET.Element) -> tuple[list[ET.Element], list[ET.Element]]:
        main, accent = [], []
        for child in list(symbol):
            if not isinstance(child.tag, str):
                continue
            ink = child.attrib.pop("data-ink", "")
            (accent if ink == "accent" else main).append(child)
        return main, accent

    corner = symbols.get("orn-corner")
    if corner is not None:
        vb = corner.get("viewBox", "0 0 24 24")
        _, _, w, h = vb.split()
        main, accent = split(corner)
        turns = {"tl": "", "tr": f"translate({w} 0) scale(-1 1)",
                 "bl": f"translate(0 {h}) scale(1 -1)",
                 "br": f"translate({w} {h}) scale(-1 -1)"}
        for corner_name, transform in turns.items():
            tokens[f"--orn-corner-{corner_name}"] = (
                svg_uri(vb, main, transform) if main else "var(--orn-blank)")
            tokens[f"--orn-corner-accent-{corner_name}"] = (
                svg_uri(vb, accent, transform) if accent else "var(--orn-blank)")

    for slot in ORNAMENT_SLOTS:
        symbol = symbols.get(f"orn-{slot}")
        if symbol is None:
            continue
        vb = symbol.get("viewBox", "0 0 16 16")
        main, accent = split(symbol)
        tokens[f"--orn-{slot}"] = svg_uri(vb, main) if main else "var(--orn-blank)"
        tokens[f"--orn-{slot}-accent"] = (
            svg_uri(vb, accent) if accent else "var(--orn-blank)")

    for name in REQUIRED_SYMBOLS:
        if name not in symbols:
            print(f"  warning: {svg_path} has no {name}; the slot stays blank")
    for name in symbols:
        if name not in REQUIRED_SYMBOLS + OPTIONAL_SYMBOLS:
            print(f"  warning: {svg_path} has {name}, which no component reads")

    def ratio(vb: str) -> str:
        _, _, w, h = (float(v) for v in vb.split())
        return f"{w / h:.4g}"

    vignette = symbols.get("orn-vignette")
    if vignette is not None:
        tokens["--orn-vignette-ratio"] = ratio(vignette.get("viewBox", "0 0 120 48"))

    rule_end = symbols.get("orn-rule-end")
    if rule_end is not None:
        vb = rule_end.get("viewBox", "0 0 24 8")
        _, _, w, _ = vb.split()
        main, accent = split(rule_end)
        for side, transform in {"l": "", "r": f"translate({w} 0) scale(-1 1)"}.items():
            tokens[f"--orn-rule-end-{side}"] = (
                svg_uri(vb, main, transform) if main else "var(--orn-blank)")
            tokens[f"--orn-rule-end-accent-{side}"] = (
                svg_uri(vb, accent, transform) if accent else "var(--orn-blank)")
        tokens["--orn-rule-end-ratio"] = ratio(vb)

    bullet = symbols.get("orn-bullet")
    if bullet is not None:
        main, accent = split(bullet)
        tokens["--orn-bullet"] = svg_uri(bullet.get("viewBox", "0 0 8 8"), main + accent)
    return tokens



def ornament_css(directory: Path, mode: str) -> str:
    tokens = ornament_tokens(directory / "ornaments.svg")
    selector = f':root,\n[data-mode="{mode}"]' if mode == "light" else f'[data-mode="{mode}"]'
    declarations = "\n".join(f"  {key}: {value};" for key, value in tokens.items())
    return f"{selector} {{\n{declarations}\n}}\n"


def write_app_ornaments() -> None:
    lines = ["/* Generated by apps/web/design/build.py --app-ornaments. */\n@layer masks {"]
    for folder, mode, _ in APPEARANCES:
        css = ornament_css(OUT / "themes" / folder, mode)
        lines.append("\n".join(f"  {line}" for line in css.splitlines()))
    lines.append("}\n")
    write_atomic(ROOT / "apps/web/src/themes/ornaments.generated.css", "\n".join(lines))


if __name__ == "__main__":
    if sys.argv[1:] == ["--app-ornaments"]:
        write_app_ornaments()
    else:
        fail("expected --app-ornaments")
