"use client";

import { type JSX, memo } from "react";
import {
  type Components,
  defaultComponents,
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

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

// Streamdown's own heading components, moved down so that the text's "#"
// heading renders at topLevel and each deeper one below it, down to h6.
function headingComponents(topLevel: number): Components {
  return Object.fromEntries(
    HEADING_TAGS.map((tag, index) => [
      tag,
      defaultComponents[HEADING_TAGS[index + topLevel - 1] ?? "h6"],
    ]),
  );
}

const HEADING_COMPONENTS = HEADING_TAGS.map((_, index) =>
  headingComponents(index + 1),
);

// Text as Markdown, with GitHub's extensions and highlighted code, styled
// from the token contract (chat.css). While the text is still streaming,
// unfinished Markdown, such as an open code fence, renders as if it were
// closed, and a caret marks where the text will continue. Links open in a
// new tab. Inside a page that already has headings, topHeadingLevel puts
// the text's headings below them, so the page keeps a single h1.
function MarkdownContent({
  text,
  running,
  topHeadingLevel = 1,
}: {
  text: string;
  running: boolean;
  topHeadingLevel?: number;
}): JSX.Element {
  return (
    <Streamdown
      caret="block"
      className="markdown"
      components={
        HEADING_COMPONENTS[topHeadingLevel - 1] ??
        headingComponents(topHeadingLevel)
      }
      isAnimating={running}
      linkSafety={LINK_SAFETY}
      plugins={STREAMDOWN_PLUGINS}
    >
      {text}
    </Streamdown>
  );
}

// Completed prose does not change when sibling messages or the composer update.
const Markdown = memo(MarkdownContent);

export { Markdown };
