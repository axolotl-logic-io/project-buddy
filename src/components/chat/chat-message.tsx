"use client";

import type { EnrichedPartState } from "@assistant-ui/react";
import { MessagePrimitive } from "@assistant-ui/react";
import type { JSX } from "react";
import { ChatPart } from "@/components/chat/chat-parts.tsx";
import { COPY } from "@/ui/copy.ts";

function renderPart({ part }: { part: EnrichedPartState }): JSX.Element {
  return <ChatPart part={part} />;
}

function speakerName(role: string, personaName: string): string {
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
  role: string;
  personaName: string;
}): JSX.Element {
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
