"use client";

import type { EnrichedPartState } from "@assistant-ui/react";
import type { JSX } from "react";
import { ChatMarkdown } from "@/components/chat/chat-markdown.tsx";
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";

// One part of a message, in the message's order: text as Markdown, and tool
// calls through their entries in TOOL_PARTS. Calls of tools without an entry,
// data parts, and the tutor's reasoning, sources and files are not shown.
export function ChatPart({
  part,
}: {
  part: EnrichedPartState;
}): JSX.Element | null {
  switch (part.type) {
    case "text":
      return (
        <ChatMarkdown
          running={part.status.type === "running"}
          text={part.text}
        />
      );
    case "tool-call": {
      const renderTool = TOOL_PARTS.get(part.toolName);
      if (renderTool === undefined) {
        return null;
      }
      return renderTool(part);
    }
    case "data":
    case "reasoning":
    case "source":
    case "image":
    case "file":
    case "audio":
    case "generative-ui":
      return null;
    default: {
      const unhandled: never = part;
      return unhandled;
    }
  }
}
