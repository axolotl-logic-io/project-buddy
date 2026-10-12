"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import type { JSX } from "react";
import { ChatThread } from "@/components/chat/chat-thread.tsx";
import type { ChatId } from "@/ids.ts";
import { CHAT_TRANSPORT } from "@/tutor/chat-protocol.ts";

// A chat with the tutor: the saved conversation, then each new message and
// its streamed reply.
export function ChatView({
  chatId,
  personaName,
  initialMessages,
}: {
  chatId: ChatId;
  personaName: string;
  initialMessages: UIMessage[];
}): JSX.Element {
  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    transport: CHAT_TRANSPORT,
  });
  const runtime = useAISDKRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatThread error={chat.error} personaName={personaName} />
    </AssistantRuntimeProvider>
  );
}
