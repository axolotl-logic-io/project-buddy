"use client";

import { type MessageRuntimeState, ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, type ReactNode, useCallback } from "react";
import { ChatComposer } from "@/components/chat/chat-composer.tsx";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { ChatMessage } from "@/components/chat/chat-message.tsx";
import { COPY } from "@/ui/copy.ts";

// Shown while the tutor has not started its reply.
function ThinkingLine({
  personaName,
  waiting,
}: {
  personaName: string;
  waiting: boolean;
}): JSX.Element | null {
  if (!waiting) {
    return null;
  }
  return (
    <p className="text-muted text-sm">{COPY.chat.thinking(personaName)}</p>
  );
}

// The conversation, a line while the tutor starts its reply, any failure,
// and the composer. It scrolls to follow a streaming reply unless the user
// has scrolled up.
export function ChatThread({
  personaName,
  waiting,
  error,
}: {
  personaName: string;
  waiting: boolean;
  error: Error | undefined;
}): JSX.Element {
  const renderMessage = useCallback(
    ({ message }: { message: MessageRuntimeState }): ReactNode => (
      <ChatMessage personaName={personaName} role={message.role} />
    ),
    [personaName],
  );

  return (
    <ThreadPrimitive.Root className="flex flex-col gap-4">
      <ThreadPrimitive.Viewport className="flex flex-col gap-4">
        <ol className="flex flex-col gap-4">
          <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
        </ol>
        <ThinkingLine personaName={personaName} waiting={waiting} />
        {error !== undefined && <ChatError error={error} />}
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 bg-background py-2">
          <ChatComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
