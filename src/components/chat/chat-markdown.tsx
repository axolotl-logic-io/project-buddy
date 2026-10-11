"use client";

import { code } from "@streamdown/code";
import type { JSX } from "react";
import { type PluginConfig, Streamdown } from "streamdown";

const STREAMDOWN_PLUGINS: PluginConfig = { code };

// Text as Markdown, with GitHub's extensions and highlighted code. While the
// text is still streaming, unfinished Markdown, such as an open code fence,
// renders as if it were closed.
export function ChatMarkdown({
  text,
  running,
}: {
  text: string;
  running: boolean;
}): JSX.Element {
  return (
    <Streamdown
      className="chat-markdown"
      isAnimating={running}
      plugins={STREAMDOWN_PLUGINS}
    >
      {text}
    </Streamdown>
  );
}
