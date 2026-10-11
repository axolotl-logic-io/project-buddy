"use client";

import type {
  EnrichedPartState,
  MessageRuntimeState,
} from "@assistant-ui/react";
import type { JSX } from "react";
import { ChatMarkdown } from "@/components/chat/chat-markdown.tsx";
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";

type TextPart = Extract<EnrichedPartState, { type: "text" }>;

// A text part: the user's own text exactly as she typed it, and the tutor's
// as Markdown.
function ChatText({
  part,
  role,
}: {
  part: TextPart;
  role: MessageRuntimeState["role"];
}): JSX.Element {
  if (role === "user") {
    return <p className="whitespace-pre-wrap">{part.text}</p>;
  }
  return (
    <ChatMarkdown running={part.status.type === "running"} text={part.text} />
  );
}

// One part of a message from role, in the message's order: text, and tool
// calls through their entries in TOOL_PARTS. Calls of tools without an entry,
// data parts, and the tutor's reasoning, sources and files are not shown.
export function ChatPart({
  part,
  role,
}: {
  part: EnrichedPartState;
  role: MessageRuntimeState["role"];
}): JSX.Element | null {
  switch (part.type) {
    case "text":
      return <ChatText part={part} role={role} />;
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
