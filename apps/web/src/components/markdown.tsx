"use client";

import type { JSX } from "react";
import {
  type LinkSafetyConfig,
  type PluginConfig,
  Streamdown,
} from "streamdown";
import { isManualUrl } from "@/blender-manual/manual-source.ts";
import { CODE_HIGHLIGHTER } from "@/components/code-highlighting.ts";

const STREAMDOWN_PLUGINS: PluginConfig = { code: CODE_HIGHLIGHTER };

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
