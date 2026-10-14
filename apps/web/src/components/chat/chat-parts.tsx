"use client";

import type {
  EnrichedPartState,
  MessageRuntimeState,
} from "@assistant-ui/react";
import type { JSX } from "react";
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";
import { Markdown } from "@/components/markdown.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { extraTag } from "@/flags/flags.ts";

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
  return <Markdown running={part.status.type === "running"} text={part.text} />;
}

// One part of a message from role: text, and tool calls through their entries
// in TOOL_PARTS, or the entry's failure line when the call failed. Calls of
// tools without an entry, data parts, and the tutor's reasoning, sources and
// files are not shown.
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
      const toolPart = TOOL_PARTS.get(part.toolName);
      if (toolPart === undefined) {
        return null;
      }
      if (part.isError === true) {
        return (
          <p className="error-text icon-line" {...extraTag("tool-lines")}>
            <Icon name="alert" />
            {toolPart.failure}
          </p>
        );
      }
      return toolPart.render(part);
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
