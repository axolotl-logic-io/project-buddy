"use client";

import type {
  EnrichedPartState,
  MessageRuntimeState,
} from "@assistant-ui/react";
import type { JSX } from "react";
import { TasksDataPart } from "@/components/chat/tasks-change-part.tsx";
import { TOOL_PARTS } from "@/components/chat/tool-parts.ts";
import { Markdown } from "@/components/markdown.tsx";
import { Icon } from "@/components/ui/icon.tsx";

type TextPart = Extract<EnrichedPartState, { type: "text" }>;

// A text part: the user's own text exactly as she typed it, and the construct's
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
    <Markdown
      className="space-y-2 [&_blockquote]:not-italic [&_li]:py-0"
      running={part.status.type === "running"}
      text={part.text}
    />
  );
}

// One part of a message from role: text, tool calls through their entries
// in TOOL_PARTS, or the entry's failure line when the call failed, and the
// tasks parts of a task message (src/tasks/tasks-message.ts). Calls of tools
// without an entry, other data parts, and the construct's reasoning, sources
// and files are not shown.
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
          <p className="error-text icon-line">
            <Icon name="alert" />
            {toolPart.failure}
          </p>
        );
      }
      const { component: ToolComponent } = toolPart;
      return <ToolComponent part={part} />;
    }
    case "data":
      return <TasksDataPart name={part.name} data={part.data} />;
    case "image":
    case "reasoning":
    case "source":
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
