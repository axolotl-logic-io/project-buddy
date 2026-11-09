"use client";

import { type MessageRuntimeState, ThreadPrimitive } from "@assistant-ui/react";
import { type JSX, type ReactNode, useCallback } from "react";
import { ChatMessage } from "@/components/chat/chat-message.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { ChatId } from "@/ids.ts";
import type { ReplyCost } from "@/replies/reply-accounting.ts";

// One renderer boundary for the whole history. Empty adventures do not load
// it; populated ones retain server-rendered, searchable, accessible messages.
function ChatHistory({
  construct,
  chatId,
  openingMessageId,
  authorNames,
  replyCosts,
  activityAllowed,
}: {
  readonly construct: ConstructSnapshot;
  readonly chatId: ChatId;
  readonly openingMessageId?: string | undefined;
  readonly authorNames: ReadonlyMap<string, string>;
  readonly replyCosts?: ReadonlyMap<string, ReplyCost | undefined> | undefined;
  readonly activityAllowed: boolean;
}): JSX.Element {
  const renderMessage = useCallback(
    ({ message }: { message: MessageRuntimeState }): ReactNode => (
      <ChatMessage
        construct={construct}
        destination={{ kind: "adventure", id: chatId }}
        opening={message.id === openingMessageId}
        activityAllowed={activityAllowed}
        authorName={authorNames.get(message.id)}
        role={message.role}
        cost={replyCosts?.get(message.id)}
      />
    ),
    [construct, chatId, openingMessageId, activityAllowed, authorNames, replyCosts],
  );
  return <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>;
}

export { ChatHistory };
