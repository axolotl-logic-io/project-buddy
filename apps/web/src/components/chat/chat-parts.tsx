"use client";

import type {
  EnrichedPartState,
  MessageRuntimeState,
} from "@assistant-ui/react";
import Image from "next/image";
import type { JSX } from "react";
import { PlanDataPart } from "@/components/chat/plan-change-part.tsx";
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";
import { Markdown } from "@/components/markdown.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { IMAGE_COPY } from "@/ui/copy/images.ts";

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
  return <Markdown running={part.status.type === "running"} text={part.text} />;
}

// One part of a message from role: text, tool calls through their entries
// in TOOL_PARTS, or the entry's failure line when the call failed, and the
// plan parts of a plan message (src/plan/plan-message.ts). Calls of tools
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
      return toolPart.render(part);
    }
    case "image":
      return (
        <a href={part.image} target="_blank" rel="noreferrer">
          <Image
            unoptimized={true}
            width={640}
            height={480}
            alt={part.filename ?? IMAGE_COPY.preview}
            className="chat-image"
            src={part.image}
          />
        </a>
      );
    case "data":
      return <PlanDataPart name={part.name} data={part.data} />;
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
