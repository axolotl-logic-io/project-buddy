"""Traces every class in the captured HTML to where it is declared.

Run from the repository root after capture.mjs:

    python3 -I outputs/theme-redesign/capture/classes.py

Writes capture/classes.json. With --markdown it also writes capture/classes.md,
the per-view class lists and role tables that inventory.md links to.

A class is traced to the first of:
  - a selector in one of the app's CSS files (page-roles.css, chat.css,
    construct-discovery.css, contract.css, parchment.css), with its line;
  - a rule in the compiled stylesheet (capture/css/), which means Tailwind
    generated it from a utility name, or a dependency (Streamdown, Shiki)
    shipped it;
  - none: a class with no rule, used as a hook by scripts or tests, or dead.
"""

import json
import sys
import re
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CAPTURE = Path(__file__).resolve().parent
WEB = ROOT / "apps" / "web"
CSS_FILES = [
    WEB / "src/app/page-roles.css",
    WEB / "src/components/chat/chat.css",
    WEB / "src/components/constructs/construct-discovery.css",
    WEB / "src/themes/contract.css",
    WEB / "src/themes/parchment.css",
    WEB / "src/app/globals.css",
]
CLASS_IN_SELECTOR = re.compile(r"\.(-?[_a-zA-Z][\w-]*)")
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
LITERAL_COLOR = re.compile(r"\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\((?!\s*var)[^)]*\)")


def declared_classes(path):
    """Maps each class named in a selector of path to its declaring line.

    That is the first rule with the class alone as a selector, such as
    `.notice` or `.notice:hover`; else the first with a selector that starts
    with it, such as `.notice a`; else the first rule that names it.
    """
    text = path.read_text()
    # Blank out comments, keeping line numbers.
    text = re.sub(
        r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S
    )
    exact, own, named = {}, {}, {}
    start = 0
    for index, char in enumerate(text):
        if char in "{};":
            if char == "{":
                prelude = text[start:index]
                stripped = prelude.strip()
                if stripped and not stripped.startswith("@"):
                    offset = start + len(prelude) - len(prelude.lstrip())
                    line = text.count("\n", 0, offset) + 1
                    for name in CLASS_IN_SELECTOR.findall(prelude):
                        named.setdefault(name, line)
                    for selector in stripped.split(","):
                        selector = selector.strip()
                        lead = CLASS_IN_SELECTOR.match(selector)
                        if lead:
                            own.setdefault(lead.group(1), line)
                            if re.fullmatch(r"\.[\w-]+(?::[\w-]+(?:\([^)]*\))?|\[[^\]]*\])*", selector):
                                exact.setdefault(lead.group(1), line)
            start = index + 1
    return {name: rank(name, exact, own, named)[0] for name in named}


def rank(name, exact, own, named):
    """The class's declaring line, and 0, 1 or 2 for how directly it is declared."""
    if name in exact:
        return exact[name], 0
    if name in own:
        return own[name], 1
    return named[name], 2


def declared_ranks(path):
    """Like declared_classes, with each line's rank from rank()."""
    text = path.read_text()
    found = declared_classes(path)
    ranks = {}
    for name, line in found.items():
        pattern = re.compile(r"(?:^|,)\s*\." + re.escape(name) + r"(?![\w-])")
        rule = rule_prelude(text, line)
        if re.search(r"(?:^|,)\s*\." + re.escape(name) + r"(?::[\w-]+(?:\([^)]*\))?|\[[^\]]*\])*\s*(?:,|$)", rule):
            ranks[name] = 0
        elif pattern.search(rule):
            ranks[name] = 1
        else:
            ranks[name] = 2
    return found, ranks


def rule_prelude(text, line):
    """The selector text of the rule that starts on line."""
    rest = "\n".join(text.splitlines()[line - 1 :])
    return rest.split("{", 1)[0].strip()


def literal_colors(path):
    """Lines of path with a colour written as a literal, not a token."""
    hits = []
    for number, line in enumerate(path.read_text().splitlines(), 1):
        code = re.sub(r"/\*.*?\*/", "", line)
        if HEX.search(code) or LITERAL_COLOR.search(code):
            hits.append({"line": number, "text": line.strip()})
    return hits


class ClassCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.classes = defaultdict(int)
        self.inline_styles = []
        self.in_body = False

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.in_body = True
        for name, value in attrs:
            if name == "class" and value:
                for token in value.split():
                    self.classes[token] += 1
            if name == "style" and value and self.in_body:
                self.inline_styles.append({"tag": tag, "style": value})


STRING_LITERAL = re.compile(r'"([^"\n]*)"|\'([^\'\n]*)\'|`([^`]*)`')


def component_index():
    """Maps each token written in a string in a .tsx file to those files."""
    index = defaultdict(set)
    for path in (WEB / "src").rglob("*.tsx"):
        rel = str(path.relative_to(WEB))
        for match in STRING_LITERAL.finditer(path.read_text()):
            literal = next(group for group in match.groups() if group is not None)
            for token in re.split(r"[\s${}]+", literal):
                if token:
                    index[token].add(rel)
    return index


def compiled_selectors():
    names = set()
    for path in (CAPTURE / "css").glob("*.css"):
        text = path.read_text()
        for match in re.finditer(r"\.((?:\\.|[\w-])+)", text):
            names.add(re.sub(r"\\(.)", r"\1", match.group(1)))
    return names


def main():
    ranked = defaultdict(list)
    for order, path in enumerate(CSS_FILES):
        rel = str(path.relative_to(ROOT))
        found, ranks = declared_ranks(path)
        for name, line in found.items():
            ranked[name].append((ranks[name], order, f"{rel}:{line}"))
    # A class's own rule comes first, so chat-thread is traced to chat.css,
    # not to page-roles.css's `.page-column:has(.chat-thread)`.
    declared = {name: [s for _, _, s in sorted(rows)] for name, rows in ranked.items()}
    compiled = compiled_selectors()
    components = component_index()

    views = {}
    for path in sorted((CAPTURE / "html").glob("*.html")):
        collector = ClassCollector()
        collector.feed(path.read_text())
        views[path.stem] = {
            "classes": dict(collector.classes),
            "inline_styles": collector.inline_styles,
        }

    def source(name):
        if name in declared:
            return declared[name]
        if name in compiled:
            return ["compiled stylesheet (Tailwind utility or dependency)"]
        return ["no rule"]

    every_class = sorted({c for v in views.values() for c in v["classes"]})
    role_files = {
        "page-roles.css": WEB / "src/app/page-roles.css",
        "chat.css": WEB / "src/components/chat/chat.css",
    }
    roles = {}
    for label, path in role_files.items():
        for name, line in sorted(declared_classes(path).items(), key=lambda i: i[1]):
            # A state and a view share one view name, before "--".
            using_states = [v for v in views if name in views[v]["classes"]]
            using_views = sorted({v.split("--")[0] for v in using_states})
            roles.setdefault(label, []).append(
                {
                    "class": name,
                    "line": line,
                    "states": len(using_states),
                    "views": using_views,
                }
            )

    def view_components(classes):
        """Components that write the view's own (non-Tailwind) classes."""
        found = set()
        for name in classes:
            if name in declared or source(name) == ["no rule"]:
                found |= components.get(name, set())
        return sorted(found)

    result = {
        "views": {
            view: {
                "classes": {
                    name: {"count": count, "source": source(name)}
                    for name, count in sorted(data["classes"].items())
                },
                "components": view_components(data["classes"]),
                "inline_styles": data["inline_styles"],
            }
            for view, data in views.items()
        },
        "all_classes": {name: source(name) for name in every_class},
        "roles": roles,
        "literal_colors": {
            str(path.relative_to(ROOT)): literal_colors(path)
            for path in CSS_FILES
        },
    }
    (CAPTURE / "classes.json").write_text(json.dumps(result, indent=1))
    print(len(views), "html files,", len(every_class), "classes")
    if "--markdown" in sys.argv:
        (CAPTURE / "classes.md").write_text(markdown(result))
        print("wrote classes.md")


def markdown(result):
    """Per-view class lists and site-wide role tables, for inventory.md."""
    out = []
    by_view = defaultdict(dict)
    for state, data in result["views"].items():
        for name, info in data["classes"].items():
            by_view[state.split("--")[0]][name] = info["source"]
    for view in sorted(by_view):
        out.append(f"#### Classes in {view}\n")
        groups = defaultdict(list)
        for name, sources in sorted(by_view[view].items()):
            first = sources[0]
            if first.startswith("apps/"):
                path, line = first.rsplit(":", 1)
                also = "".join(
                    f", also {Path(s).name}:{s.rsplit(':', 1)[1]}" for s in sources[1:]
                )
                groups[Path(path).name].append(f"`{name}` ({line}{also})")
            elif first == "no rule":
                groups["no rule"].append(f"`{name}`")
            else:
                groups["compiled"].append(f"`{name}`")
        labels = {
            "compiled": "Tailwind utilities and dependency classes",
            "no rule": "No rule (hooks or dead names)",
        }
        for group in sorted(groups, key=lambda g: (g in labels, g)):
            label = labels.get(group, f"{group} roles, with line")
            out.append(f"- {label}: {', '.join(groups[group])}")
        out.append("")
    for label, rows in result["roles"].items():
        out.append(f"#### {label} roles\n")
        out.append("| Class | Line | Captured states | Views |")
        out.append("| --- | --- | --- | --- |")
        for row in rows:
            views = ", ".join(row["views"]) or "none"
            out.append(f"| `{row['class']}` | {row['line']} | {row['states']} | {views} |")
        out.append("")
    return "\n".join(out)


main()
