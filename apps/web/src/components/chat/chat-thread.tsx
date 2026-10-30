"use client";

import { type MessageRuntimeState, ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, type ReactNode, useCallback } from "react";
import { ChatComposer } from "@/components/chat/chat-composer.tsx";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { ChatMessage } from "@/components/chat/chat-message.tsx";
import { useChatScroll } from "@/components/chat/use-chat-scroll.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The conversation, any failure, and the composer, docked at the bottom of
// the window (chat.css's .chat-composer-dock). It scrolls to follow a
// streaming reply unless the user has scrolled up.
export function ChatThread({
  buddyName,
  activityControl,
  error,
  onRetry,
}: {
  activityControl?: ReactNode;
  buddyName: string;
  error: Error | undefined;
  onRetry?: (() => void) | undefined;
}): JSX.Element {
  const scrollRef = useChatScroll();
  const renderMessage = useCallback(
    ({ message }: { message: MessageRuntimeState }): ReactNode => (
      <ChatMessage buddyName={buddyName} role={message.role} />
    ),
    [buddyName],
  );

  return (
    <ThreadPrimitive.Root ref={scrollRef} className="chat-thread flex flex-col">
      <ThreadPrimitive.Viewport
        autoScroll={false}
        scrollToBottomOnInitialize={false}
        scrollToBottomOnRunStart={false}
        scrollToBottomOnThreadSwitch={false}
        className="flex flex-col gap-6"
      >
        <ol
          aria-label={CHAT_COPY.conversationLabel}
          className="flex flex-col gap-8"
        >
          <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
        </ol>
        {error !== undefined && <ChatError error={error} onRetry={onRetry} />}
        <ThreadPrimitive.ViewportFooter className="chat-composer-dock">
          <ChatComposer />
          {activityControl}
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
