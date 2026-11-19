"""Writes the drawings as React components for the site.

Reads lumen.svg, lumen-avatar.svg, vellum.svg and vellum-avatar.svg and writes
apps/web/src/components/constructs/artwork/lumen-v2.tsx and vellum-v2.tsx.
Each file exports a portrait component and an avatar component.

The components drop the SVG's embedded <style>, <title> and <desc>: the site
styles the classes in construct-art.css, and the construct frame around the
drawing carries its accessible name. Each gradient and clip id gets a
per-instance prefix from React's useId, so two copies on one page never
share a definition.

Run after draw.py, then format the output with Biome:
  python3 outputs/theme-redesign/artwork/src/to_tsx.py
  (cd apps/web && npx biome format --write src/components/constructs/artwork)
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

ART = Path(__file__).resolve().parent.parent
REPO = ART.parents[2]
OUT = REPO / "apps/web/src/components/constructs/artwork"
SVG_NS = "{http://www.w3.org/2000/svg}"
SKIPPED = {"style", "title", "desc"}
PAINT = {"fill", "stroke", "color", "stop-color", "flood-color", "lighting-color"}
URL_REF = re.compile(r"url\(#(?P<id>[\w-]+)\)")

CONSTRUCTS = [
    {
        "id": "lumen",
        "name": "Lumen",
        "about": (
            "Lumen, drawn: a smiling mote of light inside a brass ring of runes,\n"
            "// with two tilted rings crossing it like a gyroscope. The avatar cut\n"
            "// keeps the face, the ring and its four jewels, drawn heavier for 32\n"
            "// and 40 px."
        ),
    },
    {
        "id": "vellum",
        "name": "Vellum",
        "about": (
            "Vellum, drawn: a small brass automaton with lens eyes, a quill, a\n"
            "// rolled map and a compass rose on its chest, before a faint map\n"
            "// margin. The avatar cut is its head and shoulders."
        ),
    },
]


def camel(name: str) -> str:
    """An SVG attribute's JSX name: class to className, kebab-case to camelCase."""
    if name == "class":
        return "className"
    head, *rest = name.split("-")
    return head + "".join(part.capitalize() for part in rest)


def local_id(value: str, prefix: str) -> str:
    """An id without the drawing's own prefix, such as "sky" for "lumen-sky"."""
    return value.removeprefix(prefix)


def attributes(element: ET.Element, prefix: str) -> str:
    parts = []
    for name, value in element.attrib.items():
        if name == "style" or (
            name in PAINT and value != "none" and not URL_REF.fullmatch(value)
        ):
            raise ValueError(f"Use a paint class for {element.tag}: {name}={value}")
        jsx = camel(name)
        if name == "id":
            parts.append(f"id={{`${{id}}{local_id(value, prefix)}`}}")
        elif URL_REF.search(value):
            ref = URL_REF.sub(
                lambda match: f"url(#${{id}}{local_id(match['id'], prefix)})", value
            )
            parts.append(f"{jsx}={{`{ref}`}}")
        else:
            parts.append(f'{jsx}="{value}"')
    if not parts:
        return ""
    return " " + " ".join(parts)


def jsx(element: ET.Element, prefix: str, depth: int) -> list[str]:
    tag = element.tag.removeprefix(SVG_NS)
    if tag in SKIPPED:
        return []
    pad = "  " * depth
    children = [line for child in element for line in jsx(child, prefix, depth + 1)]
    if not children:
        return [f"{pad}<{tag}{attributes(element, prefix)} />"]
    return [f"{pad}<{tag}{attributes(element, prefix)}>", *children, f"{pad}</{tag}>"]


def view_box(svg: ET.Element) -> tuple[str, str, str]:
    x, y, width, height = svg.attrib["viewBox"].split()
    assert width == height, "drawings are square"
    return x, y, width


def drawing_body(svg: ET.Element, function: str, prefix: str) -> tuple[str, str]:
    """Turn named layers into components, keeping SVG paint order and shape hierarchy."""
    body = []
    layers: dict[str, list[ET.Element]] = {}
    layer = None
    for child in svg:
        if child.tag is ET.Comment:
            marker = (child.text or "").strip()
            if marker.startswith("layer: "):
                label = marker.removeprefix("layer: ")
                layer = layers.setdefault(f"{function}{label}", [])
        elif layer is None:
            body.extend(jsx(child, prefix, 3))
        else:
            layer.append(child)

    components = []
    for name, shapes in layers.items():
        markup = "\n".join(line for shape in shapes for line in jsx(shape, prefix, 3))
        uses_id = "${id}" in markup
        props = "{ id }: { readonly id: string }" if uses_id else ""
        passed = " id={id}" if uses_id else ""
        if len(shapes) != 1:
            markup = f"    <>\n{markup}\n    </>"
        components.append(
            f"function {name}({props}): JSX.Element {{\n"
            f"  return (\n{markup}\n  );\n}}\n\n"
        )
        body.append(f"      <{name}{passed} />")
    return "".join(components), "\n".join(body)


def component(file: str, function: str, box: str, prefix: str) -> str:
    parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))
    svg = ET.parse(ART / file, parser=parser).getroot()
    x, y, size = view_box(svg)
    layers, body = drawing_body(svg, function, prefix)
    return (
        layers
        + f"const {box} = {{ x: {x}, y: {y}, size: {size} }} as const;\n\n"
        f"function {function}({{ frame }}: DrawingProps): JSX.Element {{\n"
        "  const id = useId();\n"
        "  return (\n"
        "    <svg\n"
        '      className="construct-art"\n'
        f"      viewBox={{frameViewBox({box}, frame)}}\n"
        "      aria-hidden={true}\n"
        "    >\n" + body + "\n"
        "    </svg>\n"
        "  );\n"
        "}\n"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for construct in CONSTRUCTS:
        cid, name = construct["id"], construct["name"]
        text = (
            'import { type JSX, useId } from "react";\n'
            "import {\n"
            "  type DrawingProps,\n"
            "  frameViewBox,\n"
            '} from "@/components/constructs/artwork/frame-view-box.ts";\n\n'
            f"// {construct['about']}\n"
            "//\n"
            "// Generated by outputs/theme-redesign/artwork/src/to_tsx.py from the\n"
            "// hand-written drawings; change draw.py there and regenerate. No shape\n"
            "// names a colour: construct-art.css paints each class with the\n"
            "// appearance's --construct-* tokens.\n\n"
            + component(f"{cid}.svg", f"{name}Portrait", "PORTRAIT_BOX", f"{cid}-")
            + "\n"
            + component(
                f"{cid}-avatar.svg", f"{name}Avatar", "AVATAR_BOX", f"{cid}-avatar-"
            )
            + f"\nexport {{ {name}Avatar, {name}Portrait }};\n"
        )
        (OUT / f"{cid}-v2.tsx").write_text(text)
        print(f"Wrote {OUT / f'{cid}-v2.tsx'}")


if __name__ == "__main__":
    main()
