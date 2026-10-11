"use client";

import { code } from "@streamdown/code";
import type { JSX } from "react";
import {
  type LinkSafetyConfig,
  type PluginConfig,
  Streamdown,
} from "streamdown";
import { isManualUrl } from "@/manual/manual-source.ts";

const STREAMDOWN_PLUGINS: PluginConfig = { code };

// Links into the Blender manual open straight away; any other link asks
// first.
const LINK_SAFETY: LinkSafetyConfig = {
  enabled: true,
  onLinkCheck: isManualUrl,
};

// Text as Markdown, with GitHub's extensions and highlighted code. While the
// text is still streaming, unfinished Markdown, such as an open code fence,
// renders as if it were closed. Links open in a new tab.
export function Markdown({
  text,
  running,
}: {
  text: string;
  running: boolean;
}): JSX.Element {
  return (
    <Streamdown
      className="markdown"
      isAnimating={running}
      linkSafety={LINK_SAFETY}
      plugins={STREAMDOWN_PLUGINS}
    >
      {text}
    </Streamdown>
  );
}
