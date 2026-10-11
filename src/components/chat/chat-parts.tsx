"use client";

import type { EnrichedPartState } from "@assistant-ui/react";
import type { JSX } from "react";
import { ChatMarkdown } from "@/components/chat/chat-markdown.tsx";

type ToolCallPart = Extract<EnrichedPartState, { type: "tool-call" }>;
type DataPart = Extract<EnrichedPartState, { type: "data" }>;

// How each tool's calls render, by tool name. Add a tool with one entry,
// such as `["searchManual", (part) => <SearchPart part={part} />]`. Calls of
// tools without an entry are not shown.
const TOOL_PARTS: ReadonlyMap<string, (part: ToolCallPart) => JSX.Element> =
  new Map([]);

// How each kind of data part renders, by data name, as for tools. Data parts
// without an entry are not shown.
const DATA_PARTS: ReadonlyMap<string, (part: DataPart) => JSX.Element> =
  new Map([]);

// One part of a message, in the message's order: text as Markdown, tool
// calls and data parts through their registered components. The tutor's
// reasoning, sources and files are not shown.
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
    case "data": {
      const renderData = DATA_PARTS.get(part.name);
      if (renderData === undefined) {
        return null;
      }
      return renderData(part);
    }
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
