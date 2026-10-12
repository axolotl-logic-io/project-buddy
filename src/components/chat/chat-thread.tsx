"use client";

import { type MessageRuntimeState, ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, type ReactNode, useCallback } from "react";
import { ChatComposer } from "@/components/chat/chat-composer.tsx";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { ChatMessage } from "@/components/chat/chat-message.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The conversation, any failure, and the composer, which stays at the
// bottom of the window. It scrolls to follow a streaming reply unless the
// user has scrolled up.
export function ChatThread({
  personaName,
  error,
}: {
  personaName: string;
  error: Error | undefined;
}): JSX.Element {
  const renderMessage = useCallback(
    ({ message }: { message: MessageRuntimeState }): ReactNode => (
      <ChatMessage personaName={personaName} role={message.role} />
    ),
    [personaName],
  );

  return (
    <ThreadPrimitive.Root className="flex flex-col">
      <ThreadPrimitive.Viewport className="flex flex-col gap-6">
        <ol
          aria-label={CHAT_COPY.conversationLabel}
          className="flex flex-col gap-8"
        >
          <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
        </ol>
        {error !== undefined && <ChatError error={error} />}
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 bg-background pt-2 pb-4 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-4 before:bg-linear-to-t before:from-background before:to-transparent">
          <ChatComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
