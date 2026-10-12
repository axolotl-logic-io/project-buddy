"use client";

import { createCodePlugin, type ThemeInput } from "@streamdown/code";
import type { JSX } from "react";
import {
  type LinkSafetyConfig,
  type PluginConfig,
  Streamdown,
} from "streamdown";
import { isManualUrl } from "@/manual/manual-source.ts";

// The colours of highlighted code: the token contract's code colours, as CSS
// variables, so code follows the site's theme and the mode the user chose
// rather than the operating system's. Streamdown asks for a light and a
// dark highlighting theme and picks between them by the operating system,
// so this one serves as both. The scopes are TextMate's.
const CODE_TOKEN_COLORS: ThemeInput = {
  name: "code-tokens",
  fg: "var(--foreground)",
  bg: "transparent",
  settings: [
    { settings: { foreground: "var(--foreground)" } },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--code-comment)" },
    },
    {
      scope: ["keyword", "storage"],
      settings: { foreground: "var(--code-keyword)" },
    },
    {
      scope: ["string", "string.regexp"],
      settings: { foreground: "var(--code-string)" },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call.generic",
      ],
      settings: { foreground: "var(--code-function)" },
    },
    {
      scope: ["constant", "variable.parameter", "entity.name.type"],
      settings: { foreground: "var(--code-constant)" },
    },
  ],
};

const STREAMDOWN_PLUGINS: PluginConfig = {
  code: createCodePlugin({ themes: [CODE_TOKEN_COLORS, CODE_TOKEN_COLORS] }),
};

// Links into the Blender manual open straight away; any other link asks
// first.
const LINK_SAFETY: LinkSafetyConfig = {
  enabled: true,
  onLinkCheck: isManualUrl,
};

// Text as Markdown, with GitHub's extensions and highlighted code, styled
// from the token contract (chat.css). While the text is still streaming,
// unfinished Markdown, such as an open code fence, renders as if it were
// closed, and a caret marks where the text will continue. Links open in a
// new tab.
export function Markdown({
  text,
  running,
}: {
  text: string;
  running: boolean;
}): JSX.Element {
  return (
    <Streamdown
      caret="block"
      className="markdown"
      isAnimating={running}
      linkSafety={LINK_SAFETY}
      plugins={STREAMDOWN_PLUGINS}
    >
      {text}
    </Streamdown>
  );
}
