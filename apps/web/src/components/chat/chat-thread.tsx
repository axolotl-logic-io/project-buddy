"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, useCallback, useRef } from "react";
import { ChatComposer } from "@/components/chat/chat-composer.tsx";
import { ChatHistory } from "@/components/chat/chat-history.tsx";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { StoppedReply } from "@/components/chat/stopped-reply.tsx";
import { useChatScroll } from "@/components/chat/use-chat-scroll.ts";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { ChatId } from "@/ids.ts";
import type { ReplyCost } from "@/replies/reply-accounting.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The conversation, any failure or a reply that stopped before it was
// made, with a way to retry it, and the composer, docked at the bottom of
// the window (chat.css's .chat-composer-dock). Retry reply moves focus to the
// message box, since the button goes once the reply starts. It scrolls to follow a
// streaming reply unless the user has scrolled up. A user message that
// authorNames holds shows its author's name; every other one is the
// viewer's own.
export function ChatThread({
  construct,
  goldBalance,
  replyCosts,
  chatId,
  openingMessageId,
  authorNames,
  error,
  replyStopped,
  onRetry,
}: {
  goldBalance?: number | undefined;
  replyCosts?: ReadonlyMap<string, ReplyCost | undefined>;
  construct: ConstructSnapshot;
  chatId: ChatId;
  openingMessageId?: string | undefined;
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
            <ChatHistory
              construct={construct}
              chatId={chatId}
              openingMessageId={openingMessageId}
              authorNames={authorNames}
              replyCosts={replyCosts}
              activityAllowed={error === undefined && replyStopped !== true}
            />
        </ol>
        {error !== undefined && (
          <ChatError error={error} onRetry={onRetry && retry} />
        )}
        {replyStopped === true && (
          <StoppedReply
            constructName={construct.name}
            onRetry={onRetry && retry}
          />
        )}
        <ThreadPrimitive.ViewportFooter className="chat-composer-dock">
          <p className="text-muted text-xs">
            {goldBalance === undefined && CHAT_COPY.balanceUnknown}
            {goldBalance !== undefined && CHAT_COPY.balance(goldBalance)}
          </p>
          <ChatComposer inputRef={inputRef} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
