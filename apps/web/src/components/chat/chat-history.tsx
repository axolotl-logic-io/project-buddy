"use client";

import { type MessageRuntimeState, ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, memo, type ReactNode, useCallback } from "react";
import { ChatMessage } from "@/components/chat/chat-message.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { ChatId } from "@/ids.ts";

// The complete, server-rendered history. Composer updates need not render
// this list again when its message presentation has not changed.
function ChatHistoryContent({
  construct,
  chatId,
  openingMessageId,
  authorNames,
  progressAllowed,
}: {
  readonly construct: ConstructSnapshot;
  readonly chatId: ChatId;
  readonly openingMessageId?: string | undefined;
  readonly authorNames: ReadonlyMap<string, string>;
  readonly progressAllowed: boolean;
}): JSX.Element {
  const renderMessage = useCallback(
    ({ message }: { message: MessageRuntimeState }): ReactNode => (
      <ChatMessage
        construct={construct}
        destination={{ kind: "adventure", id: chatId }}
        opening={message.id === openingMessageId}
        progressAllowed={progressAllowed}
        authorName={authorNames.get(message.id)}
        role={message.role}
      />
    ),
    [
      construct,
      chatId,
      openingMessageId,
      progressAllowed,
      authorNames,
    ],
  );
  return <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>;
}

const ChatHistory = memo(ChatHistoryContent);

export { ChatHistory };
