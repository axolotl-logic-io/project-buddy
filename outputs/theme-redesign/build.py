#!/usr/bin/env python3
"""Build the theme redesign mockups.

Reads views-src/, system/tokens.css, system/components.css and each
appearance's tokens.css and ornaments.svg, and writes:

  views/<view>--<state>.html   one page per view and state
  views/assets/bundle.css      fonts, textures, tokens, ornaments, components
  views/assets/view.js         the appearance switcher and width toggle
  views/assets/constructs/     construct images used by the views
  index.html                   the gallery: each capture beside its view
  system/specimen.html         every component in every state, per appearance

An appearance uses themes/<folder>/ when it has a tokens.css, and
themes/_template/<folder>/ otherwise. Python 3 standard library only.

Run it from anywhere:

  python3 outputs/theme-redesign/build.py
"""

from __future__ import annotations

import base64
import html
import json
import re
import shutil
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
SRC = OUT / "views-src"
VIEWS = OUT / "views"
ASSETS = VIEWS / "assets"
SYSTEM = OUT / "system"
CAPTURES = OUT / "capture" / "screenshots"

FONT_DIR = ROOT / "apps/web/src/themes/fonts"
TEXTURE_DIR = ROOT / "apps/web/public/textures"
CONSTRUCT_DIR = ROOT / "apps/web/public/constructs"

# (theme folder, mode: the data-mode and theme cookie value, display name)
APPEARANCES = [
    ("ivory-vellum", "light", "Ivory Vellum"),
    ("soot-brass", "soot-brass", "Soot & Brass"),
    ("espresso-leather", "dark", "Espresso Leather"),
]
WIDTHS = [1280, 360]

# (CSS variable, family, file, weight range, style, fallback)
FONTS = [
    ("source-serif-4", "PB Source Serif 4",
     "source-serif-4/source-serif-4-latin-wght-normal.woff2", "200 900", "normal",
     "Georgia, serif"),
    ("nunito", "PB Nunito", "nunito/nunito-latin-wght-normal.woff2", "200 1000",
     "normal", "system-ui, sans-serif"),
    ("jetbrains-mono", "PB JetBrains Mono",
     "jetbrains-mono/jetbrains-mono-latin-wght-normal.woff2", "100 800", "normal",
     "ui-monospace, monospace"),
    ("im-fell-english", "PB IM Fell English",
     "im-fell-english/im-fell-english-latin-400-normal.woff2", "400", "normal",
     "Georgia, serif"),
    ("im-fell-english-italic", "PB IM Fell English Italic",
     "im-fell-english/im-fell-english-latin-400-italic.woff2", "400", "italic",
     "Georgia, serif"),
    ("cormorant-garamond", "PB Cormorant Garamond",
     "cormorant-garamond/cormorant-garamond-latin-wght-normal.woff2", "300 700",
     "normal", "Georgia, serif"),
    ("unifrakturmaguntia", "PB UnifrakturMaguntia",
     "unifrakturmaguntia/unifrakturmaguntia-latin-400-normal.woff2", "400",
     "normal", "serif"),
]

CONSTRUCT_FILES = [f"{name}-v1-{size}.webp" for name in ("lumen", "vellum")
                   for size in (64, 128, 512)]

ORNAMENT_SLOTS = ["divider", "heading", "band", "emblem", "swatch", "portrait",
                  "vignette", "notice"]
# Every theme draws these. The others are optional: a theme that leaves one
# out gets a blank image, and the slot's size token keeps it at 0.
REQUIRED_SYMBOLS = ["orn-corner", "orn-divider", "orn-heading", "orn-band",
                    "orn-emblem", "orn-swatch", "orn-portrait", "orn-bullet"]
OPTIONAL_SYMBOLS = ["orn-vignette", "orn-notice", "orn-rule-end"]
FORCEABLE = {":hover": "hover", ":focus-visible": "focus", ":active": "active"}


def fail(message: str) -> None:
    print(f"build.py: {message}", file=sys.stderr)
    sys.exit(1)


def data_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def theme_dir(folder: str) -> tuple[Path, bool]:
    own = OUT / "themes" / folder
    if (own / "tokens.css").exists():
        return own, True
    return OUT / "themes" / "_template" / folder, False


# ---- Ornaments ---------------------------------------------------------------

def strip_ns(element: ET.Element) -> None:
    for node in element.iter():
        if isinstance(node.tag, str) and "}" in node.tag:
            node.tag = node.tag.split("}", 1)[1]
        for key in list(node.attrib):
            if "}" in key:
                node.attrib[key.split("}", 1)[1]] = node.attrib.pop(key)


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


# ---- CSS: forced states -----------------------------------------------------

def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def parse_blocks(css: str) -> list[tuple[str, object]]:
    """Split CSS into (prelude, body) pairs. A body with nested rules is a
    list; a declaration body is a string."""
    items: list[tuple[str, object]] = []
    i, n = 0, len(css)
    while i < n:
        open_at = css.find("{", i)
        semi = css.find(";", i)
        if open_at == -1:
            break
        if semi != -1 and semi < open_at:  # a statement such as @layer a, b;
            i = semi + 1
            continue
        prelude = css[i:open_at].strip()
        depth, j = 1, open_at + 1
        while j < n and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        inner = css[open_at + 1:j - 1]
        if prelude.startswith("@") and not prelude.startswith("@font-face") \
                and not prelude.startswith("@keyframes"):
            items.append((prelude, parse_blocks(inner)))
        else:
            items.append((prelude, inner))
        i = j
    return items


def split_selectors(prelude: str) -> list[str]:
    parts, depth, current = [], 0, ""
    for ch in prelude:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
    parts.append(current.strip())
    return [re.sub(r"\s+", " ", p) for p in parts if p]


def forced_rules(items: list[tuple[str, object]]) -> str:
    """Copy every rule that uses a user-action pseudo-class so that
    data-force="hover|focus|active" shows that state without a pointer."""
    out = []
    for prelude, body in items:
        if isinstance(body, list):
            if prelude.startswith("@layer") or prelude.startswith("@media") \
                    or prelude.startswith("@supports"):
                inner = forced_rules(body)
                if inner:
                    out.append(f"{prelude} {{\n{inner}}}\n")
            continue
        if prelude.startswith("@"):
            continue
        copies = []
        for selector in split_selectors(prelude):
            forced = selector
            for pseudo, state in FORCEABLE.items():
                forced = forced.replace(pseudo, f'[data-force~="{state}"]')
            if forced != selector:
                copies.append(forced)
        if copies:
            out.append(",\n".join(copies) + " {" + body + "}\n")
    return "".join(out)


# ---- Bundle -----------------------------------------------------------------

PREVIEW_CSS = """
@layer preview {
  .appearance-fieldset legend { margin-block-end: 0.5rem; }
  html.pb-shell-page body > :not(.pb-shell) { display: none !important; }
  html.pb-shell-page body { background: Canvas; color: CanvasText; }
  .pb-shell { display: flex; flex-direction: column; block-size: 100dvh;
    font: 14px/1.4 system-ui, sans-serif; background: Canvas; color: CanvasText; }
  .pb-shell * { font: inherit; }
  .pb-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1.25rem;
    padding: 0.5rem 1rem; border-block-end: 1px solid GrayText; }
  .pb-bar fieldset { display: flex; gap: 0.75rem; align-items: center; margin: 0;
    padding: 0; border: 0; }
  .pb-bar legend { float: left; margin-inline-end: 0.5rem; font-weight: 600; }
  .pb-bar label { display: inline-flex; gap: 0.25rem; align-items: center; }
  .pb-bar a { color: LinkText; }
  .pb-bar .pb-title { font-weight: 700; }
  .pb-stage { flex: 1; overflow: auto; background: color-mix(in srgb, GrayText 18%, Canvas); }
  .pb-stage iframe { display: block; margin: 1rem auto; block-size: calc(100% - 2rem);
    border: 1px solid GrayText; background: Canvas; }

  /* Specimen sheet */
  .specimen-mode { padding: 2rem 1.5rem 4rem; background-color: var(--background);
    background-image: var(--page-decoration); background-size: cover;
    color: var(--foreground); font-family: var(--body-font); }
  .specimen-mode + .specimen-mode { border-block-start: 4px solid var(--line); }
  .specimen-title { font-family: var(--display-font); font-size: 2rem; margin-block-end: 1.5rem; }
  .specimen-group { display: flex; flex-direction: column; gap: 1rem; margin-block: 2.5rem; }
  .specimen-group > h3 { font-family: system-ui, sans-serif; font-size: 0.8125rem;
    font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted);
    border-block-end: 1px dashed var(--line); padding-block-end: 0.25rem; }
  .specimen-row { display: flex; flex-wrap: wrap; gap: 1.25rem 1.5rem; align-items: flex-start; }
  .specimen-cell { display: flex; flex-direction: column; gap: 0.5rem; min-inline-size: 0; }
  .specimen-cell > .specimen-label { font: 600 0.75rem/1.2 system-ui, sans-serif; color: var(--muted); }
  .specimen-mode .site-panel, .specimen-mode .quest-sidebar { position: static; display: flex;
    inline-size: 18rem; max-block-size: none; }
  .specimen-mode .dialog-overlay { position: relative; inset: auto; z-index: 0; padding: 1.5rem; }
  .specimen-mode .menu { position: relative; inset: auto; }
  .specimen-mode .chat-composer .menu { position: relative; inset: auto; margin-block-end: 0.5rem; }
  .specimen-mode .trail-band, .specimen-mode .chat-composer-dock, .specimen-mode .save-bar { position: relative; }
  .specimen-mode .site-header { z-index: 0; }
}
"""


def build_bundle() -> tuple[str, list[str]]:
    notes = []
    parts = ["@layer tokens, appearance, elements, components, preview;\n"]

    # Fonts, inlined from apps/web/src/themes/fonts/.
    font_vars = []
    for var, family, file, weight, style, fallback in FONTS:
        path = FONT_DIR / file
        if not path.exists():
            fail(f"missing font {path}")
        parts.append(
            f'@font-face {{ font-family: "{family}"; src: url("{data_uri(path, "font/woff2")}") '
            f'format("woff2"); font-weight: {weight}; font-style: {style}; font-display: block; }}\n')
        font_vars.append(f'    --typeface-{var}: "{family}", {fallback};')
    parts.append("@layer tokens {\n  :root {\n" + "\n".join(font_vars) + "\n  }\n}\n")

    parts.append((SYSTEM / "tokens.css").read_text())

    # Appearances: tokens with textures inlined, then ornaments.
    for folder, mode, name in APPEARANCES:
        directory, own = theme_dir(folder)
        notes.append(f"{name}: {'themes/' + folder if own else 'themes/_template/' + folder + ' (fallback)'}")
        tokens_css = (directory / "tokens.css").read_text()

        def inline_texture(match: re.Match) -> str:
            path = TEXTURE_DIR / match.group(1)
            if not path.exists():
                fail(f"{directory / 'tokens.css'} names a missing texture {path}")
            return f'url("{data_uri(path, "image/webp")}")'

        tokens_css = re.sub(r'url\(["\']?/textures/([\w.-]+)["\']?\)', inline_texture, tokens_css)
        parts.append(f"/* ---- {name} ({mode}) from {directory.relative_to(OUT)} ---- */\n")
        parts.append(tokens_css)
        svg = directory / "ornaments.svg"
        if svg.exists():
            tokens = ornament_tokens(svg)
            selector = f':root,\n  [data-mode="{mode}"]' if mode == "light" else f'[data-mode="{mode}"]'
            body = "\n".join(f"    {key}: {value};" for key, value in tokens.items())
            parts.append(f"@layer appearance {{\n  {selector} {{\n{body}\n  }}\n}}\n")

    components = (SYSTEM / "components.css").read_text()
    parts.append(components)
    forced = forced_rules(parse_blocks(strip_comments(components)))
    parts.append("/* ---- Forced states for mockups: data-force=\"hover focus active\" ---- */\n")
    parts.append(forced)
    parts.append(PREVIEW_CSS)
    return "".join(parts), notes


# ---- Templates --------------------------------------------------------------

PARENT_LINKS = {"Quests": "quests--list.html", "Spellbook": "spellbook--list.html",
                "Timer": "timer--setup.html"}
INCLUDE = re.compile(r"<!--\s*include:([\w-]+)((?:\s+[\w-]+=\"[^\"]*\")*)\s*-->")
ATTR = re.compile(r'([\w-]+)="([^"]*)"')
# A conditional whose body holds no other opener: the innermost. Applying it
# until nothing changes resolves nested conditionals from the inside out.
COND = re.compile(r"\{\{([?!])([\w-]+)(?:=([^}]*))?\}\}((?:(?!\{\{[?!]).)*?)\{\{/\1\}\}", re.S)
VAR = re.compile(r"\{\{([\w-]+)\}\}")


def parents_html(value: str) -> str:
    if not value or "<" in value:
        return value
    items = []
    for label in [p.strip() for p in value.split("|") if p.strip()]:
        href = PARENT_LINKS.get(label, "#")
        items.append(f'<li><a href="{href}">{html.escape(label)}</a>'
                     f'<span aria-hidden="true">/</span></li>')
    return "".join(items)


def render(text: str, values: dict[str, str], depth: int = 0) -> str:
    if depth > 12:
        fail("includes nest too deeply")

    def cond(match: re.Match) -> str:
        kind, key, expected, inner = match.groups()
        actual = values.get(key, "")
        hit = (actual == expected) if expected is not None else bool(actual)
        return inner if hit == (kind == "?") else ""

    previous = None
    while previous != text:
        previous = text
        text = COND.sub(cond, text)
    text = VAR.sub(lambda m: values.get(m.group(1), ""), text)

    def include(match: re.Match) -> str:
        name = match.group(1)
        path = SRC / "_partials" / f"{name}.html"
        if not path.exists():
            fail(f"missing partial {path}")
        # A value holding markup writes its attributes in single quotes, since
        # the include's own value uses double quotes. Use ’ for apostrophes.
        attrs = {k: v.replace("'", '"') if "<" in v else v
                 for k, v in ATTR.findall(match.group(2))}
        if "parents" in attrs:
            attrs["parents"] = parents_html(attrs["parents"])
        return render(path.read_text(), attrs, depth + 1)

    return INCLUDE.sub(include, text)


def read_view(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text()
    meta: dict[str, str] = {}
    match = re.match(r"\s*<!--meta\n(.*?)-->\n?", text, re.S)
    if match:
        for line in match.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip()] = value.strip()
        text = text[match.end():]
    return meta, text


def page(title: str, body: str, css: str, js: str, icons: str) -> str:
    return f"""<!doctype html>
<html lang="en" data-mode="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · Theme redesign mockup</title>
<link rel="stylesheet" href="{css}">
<script src="{js}"></script>
</head>
<body>
{icons}
<div class="app">
{body}
</div>
</body>
</html>
"""


VIEW_JS = r"""/* Mockup page behaviour. Query parameters:
   appearance=light|soot-brass|dark  the starting appearance (theme cookie values)
   width=1280|360                    the starting frame width
   bare                              show the page alone, with no toolbar
   The page shows itself alone (bare) when it has ?bare, when it sits in a
   frame, or when ?width is given and the window is no wider than that
   width plus 40 px: a screenshot tool that sets its viewport to the width
   gets the page alone. Otherwise it shows a toolbar and the page in a frame
   of the chosen width. */
(function () {
  var MODES = [["light", "Ivory Vellum"], ["soot-brass", "Soot & Brass"], ["dark", "Espresso Leather"]];
  var WIDTHS = ["1280", "360"];
  var params = new URLSearchParams(location.search);
  var mode = params.get("appearance") || params.get("mode") || "light";
  if (!MODES.some(function (m) { return m[0] === mode; })) mode = "light";
  var width = params.get("width");
  var widthGiven = WIDTHS.indexOf(width) !== -1;
  if (!widthGiven) width = "1280";
  var framed = window !== window.top;
  var bare = params.has("bare") || framed ||
    (widthGiven && window.innerWidth <= Number(width) + 40);
  var root = document.documentElement;
  root.setAttribute("data-mode", mode);
  if (!bare) root.classList.add("pb-shell-page");

  function setMode(next) {
    mode = next;
    root.setAttribute("data-mode", mode);
    document.querySelectorAll(".appearance-swatch-input").forEach(function (input) {
      input.checked = input.value === mode;
    });
  }

  function wireBare() {
    setMode(mode);
    document.addEventListener("change", function (event) {
      var t = event.target;
      if (t.classList && t.classList.contains("appearance-swatch-input")) {
        setMode(t.value);
        if (framed) window.parent.postMessage({ pbAppearance: t.value }, "*");
      }
    });
    document.addEventListener("click", function (event) {
      var control = event.target.closest("[aria-controls]");
      if (!control) return;
      var target = document.getElementById(control.getAttribute("aria-controls"));
      if (!target) return;
      if (target.classList.contains("site-panel")) {
        var open = target.hasAttribute("data-open");
        if (open) { target.removeAttribute("data-open"); target.removeAttribute("open"); }
        else { target.setAttribute("data-open", "always"); target.setAttribute("open", ""); }
        document.querySelectorAll('[aria-controls="site-panel"]').forEach(function (b) {
          if (b.closest(".trail-band")) b.setAttribute("aria-expanded", String(!open));
        });
      } else if (target.classList.contains("quest-sidebar")) {
        var phone = window.matchMedia("(width < 64rem)").matches;
        var attr = phone ? "data-drawer-open" : "data-open";
        var on = target.hasAttribute(attr);
        if (on) target.removeAttribute(attr); else target.setAttribute(attr, "");
        control.setAttribute("aria-expanded", String(!on));
      } else if (control.getAttribute("role") === "tab") {
        var list = control.closest("[role=tablist]");
        list.querySelectorAll("[role=tab]").forEach(function (tab) {
          var panel = document.getElementById(tab.getAttribute("aria-controls"));
          var selected = tab === control;
          tab.setAttribute("aria-selected", String(selected));
          if (panel) panel.hidden = !selected;
        });
      }
    });
  }

  function radios(name, items, current) {
    return items.map(function (item) {
      return '<label><input type="radio" name="' + name + '" value="' + item[0] + '"' +
        (item[0] === current ? " checked" : "") + "> " + item[1] + "</label>";
    }).join("");
  }

  function wireShell() {
    var shell = document.createElement("div");
    shell.className = "pb-shell";
    shell.innerHTML =
      '<div class="pb-bar"><a href="../index.html">All views</a>' +
      '<span class="pb-title"></span>' +
      '<fieldset><legend>Appearance</legend>' + radios("pb-appearance", MODES, mode) + "</fieldset>" +
      '<fieldset><legend>Width</legend>' +
      radios("pb-width", WIDTHS.map(function (w) { return [w, w + " px"]; }), width) + "</fieldset>" +
      '<a class="pb-alone" href="#">Open alone</a></div>' +
      '<div class="pb-stage"><iframe title="Mockup"></iframe></div>';
    document.body.appendChild(shell);
    shell.querySelector(".pb-title").textContent = document.title.replace(/ · .*$/, "");
    var frame = shell.querySelector("iframe");
    var alone = shell.querySelector(".pb-alone");
    function sync(reload) {
      var q = "?appearance=" + mode + "&width=" + width;
      history.replaceState(null, "", location.pathname + q);
      alone.href = location.pathname + q + "&bare";
      frame.style.inlineSize = width + "px";
      if (reload) frame.src = location.pathname + q + "&bare";
    }
    shell.addEventListener("change", function (event) {
      var t = event.target;
      if (t.name === "pb-appearance") { mode = t.value; sync(true); }
      if (t.name === "pb-width") { width = t.value; sync(true); }
    });
    window.addEventListener("message", function (event) {
      if (event.data && event.data.pbAppearance) {
        mode = event.data.pbAppearance;
        shell.querySelectorAll('[name="pb-appearance"]').forEach(function (r) { r.checked = r.value === mode; });
        sync(false);
      }
    });
    sync(true);
  }

  document.addEventListener("DOMContentLoaded", bare ? wireBare : wireShell);
})();
"""


def build_views(icons: str) -> list[dict[str, str]]:
    entries = []
    for path in sorted(SRC.glob("*.html")):
        if path.name.startswith("_"):
            continue
        meta, text = read_view(path)
        name = path.stem
        body = render(text, {})
        title = meta.get("title", name)
        (VIEWS / f"{name}.html").write_text(
            page(title, body, "assets/bundle.css", "assets/view.js", icons))
        entries.append({"name": name, "title": title, "note": meta.get("note", ""),
                        "capture": meta.get("capture", "")})
    return entries


def build_specimen(icons: str) -> None:
    source = SRC / "_specimen.html"
    if not source.exists():
        return
    meta, text = read_view(source)
    sections = []
    for folder, mode, name in APPEARANCES:
        inner = render(text, {"mode": mode, "name": name})
        sections.append(
            f'<section class="specimen-mode" data-mode="{mode}" aria-labelledby="specimen-{mode}">\n'
            f'<h2 class="specimen-title" id="specimen-{mode}">{html.escape(name)}</h2>\n{inner}\n</section>')
    body = "\n".join(sections)
    out = f"""<!doctype html>
<html lang="en" data-mode="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Component specimen · Theme redesign</title>
<link rel="stylesheet" href="../views/assets/bundle.css">
</head>
<body>
{icons}
<main class="specimen">
{body}
</main>
</body>
</html>
"""
    (SYSTEM / "specimen.html").write_text(out)


def build_index(entries: list[dict[str, str]], notes: list[str]) -> None:
    available = sorted(p.name for p in CAPTURES.glob("*.png")) if CAPTURES.exists() else []
    data = json.dumps({"views": entries, "captures": available})
    sources = "".join(f"<li>{html.escape(n)}</li>" for n in notes)
    out = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Theme redesign: now and proposed</title>
<style>
  :root {{ color-scheme: light dark; font: 15px/1.45 system-ui, sans-serif; }}
  body {{ margin: 0; background: Canvas; color: CanvasText; }}
  header {{ position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: .5rem 1.5rem;
    align-items: center; padding: .75rem 1.25rem; background: Canvas; border-bottom: 1px solid GrayText; }}
  h1 {{ margin: 0; font-size: 1.125rem; }}
  fieldset {{ display: flex; gap: .75rem; margin: 0; padding: 0; border: 0; }}
  legend {{ float: left; margin-right: .5rem; font-weight: 600; }}
  main {{ padding: 1rem 1.25rem 4rem; }}
  .sources {{ margin: 0 0 1rem; color: GrayText; font-size: .875rem; }}
  .sources ul {{ display: inline; padding: 0; list-style: none; }}
  .sources li {{ display: inline; margin-right: 1rem; }}
  article {{ margin-block: 1.5rem 3rem; }}
  article h2 {{ margin: 0; font-size: 1.0625rem; }}
  article h2 a {{ color: LinkText; }}
  article p {{ margin: .25rem 0 .75rem; max-width: 60rem; color: color-mix(in srgb, CanvasText 75%, Canvas); }}
  .pair {{ display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-start; }}
  figure {{ margin: 0; }}
  figcaption {{ font-weight: 600; font-size: .8125rem; margin-bottom: .25rem; }}
  .box {{ overflow: auto; border: 1px solid GrayText; background: color-mix(in srgb, GrayText 12%, Canvas); }}
  .box img {{ display: block; width: 100%; }}
  .box iframe {{ display: block; border: 0; transform-origin: 0 0; }}
  .missing {{ display: grid; place-items: center; color: GrayText; }}
</style>
</head>
<body>
<header>
  <h1>Theme redesign: now and proposed</h1>
  <fieldset><legend>Appearance</legend>
    <label><input type="radio" name="appearance" value="light" checked> Ivory Vellum</label>
    <label><input type="radio" name="appearance" value="soot-brass"> Soot &amp; Brass</label>
    <label><input type="radio" name="appearance" value="dark"> Espresso Leather</label>
  </fieldset>
  <fieldset><legend>Width</legend>
    <label><input type="radio" name="width" value="1280" checked> 1280 px</label>
    <label><input type="radio" name="width" value="360"> 360 px</label>
  </fieldset>
  <a href="system/specimen.html">Component specimen</a>
</header>
<main>
  <div class="sources">Built from: <ul>{sources}</ul></div>
  <div id="views"></div>
</main>
<script>
const DATA = {data};
const SIZES = {{ "1280": {{ w: 1280, h: 900, scale: 0.42 }}, "360": {{ w: 360, h: 780, scale: 0.75 }} }};
const params = new URLSearchParams(location.search);
let mode = params.get("appearance") || "light";
let width = params.get("width") || "1280";
document.querySelectorAll("input[name=appearance]").forEach(r => r.checked = r.value === mode);
document.querySelectorAll("input[name=width]").forEach(r => r.checked = r.value === width);
function draw() {{
  const s = SIZES[width];
  const boxW = Math.round(s.w * s.scale), boxH = Math.round(s.h * s.scale);
  const root = document.getElementById("views");
  root.textContent = "";
  for (const v of DATA.views) {{
    const art = document.createElement("article");
    const href = `views/${{v.name}}.html?appearance=${{mode}}&width=${{width}}`;
    const shot = v.capture ? `${{v.capture}}--${{mode}}--${{width}}.png` : "";
    const has = shot && DATA.captures.includes(shot);
    art.innerHTML = `<h2><a href="${{href}}"></a></h2><p></p><div class="pair">
      <figure><figcaption>Now</figcaption><div class="box" style="width:${{boxW}}px;height:${{boxH}}px">
        ${{has ? `<img loading="lazy" alt="" src="capture/screenshots/${{shot}}">` : `<div class="missing" style="height:100%">No capture</div>`}}
      </div></figure>
      <figure><figcaption>Proposed</figcaption><div class="box" style="width:${{boxW}}px;height:${{boxH}}px;overflow:hidden">
        <iframe loading="lazy" title="" src="views/${{v.name}}.html?bare&appearance=${{mode}}&width=${{width}}"
          style="width:${{s.w}}px;height:${{s.h}}px;transform:scale(${{s.scale}})"></iframe>
      </div></figure></div>`;
    art.querySelector("h2 a").textContent = v.title;
    art.querySelector("p").textContent = v.note;
    const img = art.querySelector("img");
    if (img) img.alt = `Current app: ${{v.title}}`;
    art.querySelector("iframe").title = `Proposed: ${{v.title}}`;
    root.append(art);
  }}
  history.replaceState(null, "", `?appearance=${{mode}}&width=${{width}}`);
}}
document.addEventListener("change", e => {{
  if (e.target.name === "appearance") mode = e.target.value;
  if (e.target.name === "width") width = e.target.value;
  draw();
}});
draw();
</script>
</body>
</html>
"""
    (OUT / "index.html").write_text(out)


def main() -> None:
    for required in (SRC, SYSTEM / "tokens.css", SYSTEM / "components.css"):
        if not required.exists():
            fail(f"missing {required}")
    if VIEWS.exists():
        shutil.rmtree(VIEWS)
    (ASSETS / "constructs").mkdir(parents=True)

    css, notes = build_bundle()
    (ASSETS / "bundle.css").write_text(css)
    (ASSETS / "view.js").write_text(VIEW_JS)
    for file in CONSTRUCT_FILES:
        shutil.copyfile(CONSTRUCT_DIR / file, ASSETS / "constructs" / file)

    icons = (SRC / "_partials" / "icons.html").read_text()
    entries = build_views(icons)
    build_specimen(icons)
    build_index(entries, notes)

    print(f"Built {len(entries)} views, the specimen and the gallery.")
    for note in notes:
        print(f"  {note}")
    print(f"  bundle.css: {len(css) // 1024} KiB")
    print(f"Open {OUT / 'index.html'}")


if __name__ == "__main__":
    main()
