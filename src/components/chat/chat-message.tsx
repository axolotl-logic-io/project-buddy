"use client";

import {
  type EnrichedPartState,
  MessagePrimitive,
  type MessageRuntimeState,
} from "@assistant-ui/react";
import { type JSX, useCallback } from "react";
import { ChatPart } from "@/components/chat/chat-parts.tsx";
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";
import { COPY } from "@/ui/copy.ts";

function speakerName(
  role: MessageRuntimeState["role"],
  personaName: string,
): string {
  if (role === "user") {
    return COPY.chat.you;
  }
  return personaName;
}

// Whether part shows under the rest of its message, wherever it arrived in
// the stream: a call of a tool whose TOOL_PARTS entry is placed "under".
function showsUnderMessage(part: EnrichedPartState): boolean {
  return (
    part.type === "tool-call" &&
    TOOL_PARTS.get(part.toolName)?.placement === "under"
  );
}

// One message of the thread: who said it, then its parts in the order they
// arrived, except the tool calls placed under the message, such as the
// manual citations, which come after all the others.
export function ChatMessage({
  role,
  personaName,
}: {
  role: MessageRuntimeState["role"];
  personaName: string;
}): JSX.Element {
  const renderBodyPart = useCallback(
    ({ part }: { part: EnrichedPartState }): JSX.Element | null => {
      if (showsUnderMessage(part)) {
        return null;
      }
      return <ChatPart part={part} role={role} />;
    },
    [role],
  );
  const renderUnderPart = useCallback(
    ({ part }: { part: EnrichedPartState }): JSX.Element | null => {
      if (!showsUnderMessage(part)) {
        return null;
      }
      return <ChatPart part={part} role={role} />;
    },
    [role],
  );

  return (
    <MessagePrimitive.Root asChild={true}>
      <li className="flex flex-col gap-1">
        <p className="font-medium text-muted text-sm">
          {speakerName(role, personaName)}
        </p>
        <div className="flex flex-col gap-2">
          <MessagePrimitive.Parts>{renderBodyPart}</MessagePrimitive.Parts>
          <MessagePrimitive.Parts>{renderUnderPart}</MessagePrimitive.Parts>
        </div>
      </li>
    </MessagePrimitive.Root>
  );
}
