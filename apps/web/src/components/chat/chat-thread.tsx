"use client";

import { type MessageRuntimeState, ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, type ReactNode, useCallback, useRef } from "react";
import { ChatComposer } from "@/components/chat/chat-composer.tsx";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { ChatMessage } from "@/components/chat/chat-message.tsx";
import { StoppedReply } from "@/components/chat/stopped-reply.tsx";
import { useChatScroll } from "@/components/chat/use-chat-scroll.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The conversation, any failure or a reply that stopped before it was
// made, with a way to retry it, and the composer, docked at the bottom of
// the window (chat.css's .chat-composer-dock). Retry reply moves focus to the
// message box, since the button goes once the reply starts. It scrolls to follow a
// streaming reply unless the user has scrolled up. A user message that
// authorNames holds shows its author's name; every other one is the
// viewer's own.
export function ChatThread({
  buddyName,
  authorNames,
  error,
  replyStopped,
  onRetry,
}: {
  buddyName: string;
  authorNames: ReadonlyMap<string, string>;
  error: Error | undefined;
  replyStopped?: boolean | undefined;
  onRetry?: (() => void) | undefined;
}): JSX.Element {
  const scrollRef = useChatScroll();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const retry = useCallback((): void => {
    onRetry?.();
    inputRef.current?.focus();
  }, [onRetry]);
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
        {error !== undefined && (
          <ChatError error={error} onRetry={onRetry && retry} />
        )}
        {replyStopped === true && (
          <StoppedReply buddyName={buddyName} onRetry={onRetry && retry} />
        )}
        <ThreadPrimitive.ViewportFooter className="chat-composer-dock">
          <ChatComposer inputRef={inputRef} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
