"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, useCallback, useRef } from "react";
import { ChatComposer } from "@/components/chat/chat-composer.tsx";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { ChatHistory } from "@/components/chat/chat-history.tsx";
import type { ReplyStop } from "@/components/chat/reply-stop.ts";
import { StoppedReply } from "@/components/chat/stopped-reply.tsx";
import { useChatScroll } from "@/components/chat/use-chat-scroll.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { ChatId } from "@/ids.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The conversation, any failure or a reply that stopped before it was
// made, with a way to retry it, and the composer, docked at the bottom of
// the window (chat.css's .chat-composer-dock). While a reply runs, stop holds
// Stop reply, which the composer shows in Send's place, and stopStatus what
// came of choosing it, shown above the box. Retry reply moves focus to the
// message box, since the button goes once the reply starts. It scrolls to follow a
// streaming reply unless the user has scrolled up. A user message that
// authorNames holds shows its author's name; every other one is the
// viewer's own.
export function ChatThread({
  construct,
  chatId,
  openingMessageId,
  authorNames,
  error,
  replyStopped,
  onRetry,
  stop,
  stopStatus = "",
  spellStop,
}: {
  construct: ConstructSnapshot;
  chatId: ChatId;
  openingMessageId?: string | undefined;
  authorNames: ReadonlyMap<string, string>;
  error: Error | undefined;
  replyStopped?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  stop?: ReplyStop | undefined;
  stopStatus?: string;
  spellStop?:
    | { readonly label: string; readonly onStop: () => void }
    | undefined;
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
        className="chat-viewport flex flex-col gap-6"
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
            progressAllowed={error === undefined && replyStopped !== true}
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
          {stopStatus !== "" && <Notice role="status">{stopStatus}</Notice>}
          <div className="flex flex-wrap gap-2">
            {spellStop !== undefined && (
              <Button variant="secondary" onClick={spellStop.onStop}>
                {spellStop.label}
              </Button>
            )}
          </div>
          <ChatComposer inputRef={inputRef} stop={stop} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
