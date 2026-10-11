"use client";

import {
  type EnrichedPartState,
  MessagePrimitive,
  type MessageRuntimeState,
} from "@assistant-ui/react";
import { type JSX, useCallback } from "react";
import { ChatPart } from "@/components/chat/chat-parts.tsx";
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

// One message of the thread: who said it, then its parts.
export function ChatMessage({
  role,
  personaName,
}: {
  role: MessageRuntimeState["role"];
  personaName: string;
}): JSX.Element {
  const renderPart = useCallback(
    ({ part }: { part: EnrichedPartState }): JSX.Element => (
      <ChatPart part={part} role={role} />
    ),
    [role],
  );

  return (
    <MessagePrimitive.Root asChild={true}>
      <li className="flex flex-col gap-1">
        <p className="font-medium text-muted text-sm">
          {speakerName(role, personaName)}
        </p>
        <div className="flex flex-col gap-2">
          <MessagePrimitive.Parts>{renderPart}</MessagePrimitive.Parts>
        </div>
      </li>
    </MessagePrimitive.Root>
  );
}
