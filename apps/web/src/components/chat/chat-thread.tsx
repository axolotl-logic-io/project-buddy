"use client";

import { type MessageRuntimeState, ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, type ReactNode, useCallback } from "react";
import { ChatComposer } from "@/components/chat/chat-composer.tsx";
import { ChatError, NoReplyYet } from "@/components/chat/chat-error.tsx";
import { ChatMessage } from "@/components/chat/chat-message.tsx";
import { useChatScroll } from "@/components/chat/use-chat-scroll.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The conversation, any failure, and the composer, docked at the bottom of
// the window (chat.css's .chat-composer-dock). With no failure to show, a
// last message that is unanswered says it has no reply yet, with Retry
// reply. It scrolls to follow a
// streaming reply unless the user has scrolled up. A user message that
// authorNames holds shows its author's name; every other one is the
// viewer's own.
export function ChatThread({
  buddyName,
  authorNames,
  error,
  unanswered,
  droppedImages,
  onRetry,
}: {
  buddyName: string;
  authorNames: ReadonlyMap<string, string>;
  error: Error | undefined;
  unanswered: boolean;
  droppedImages: number;
  onRetry?: (() => void) | undefined;
}): JSX.Element {
  const scrollRef = useChatScroll();
  const renderMessage = useCallback(
    ({ message }: { message: MessageRuntimeState }): ReactNode => (
      <ChatMessage
        buddyName={buddyName}
        authorName={authorNames.get(message.id)}
        role={message.role}
      />
    ),
    [buddyName, authorNames],
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
        {error === undefined && unanswered && onRetry !== undefined && (
          <NoReplyYet buddyName={buddyName} onRetry={onRetry} />
        )}
        <ThreadPrimitive.ViewportFooter className="chat-composer-dock">
          <ChatComposer droppedImages={droppedImages} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
