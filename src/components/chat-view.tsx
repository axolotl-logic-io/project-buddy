"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { ChatThread } from "@/components/chat/chat-thread.tsx";
import type { ChatId } from "@/ids.ts";
import { CHAT_TRANSPORT, chatFailureCase } from "@/tutor/chat-protocol.ts";

// A chat with the tutor: the saved conversation, then each new message and
// its streamed reply. A message that was answered already, such as one sent
// again after a lost connection, gets no second reply: the page reloads the
// saved conversation instead, answer included, and the chat page's key on
// its last message starts this view again from it.
export function ChatView({
  chatId,
  personaName,
  initialMessages,
}: {
  chatId: ChatId;
  personaName: string;
  initialMessages: UIMessage[];
}): JSX.Element {
  const router = useRouter();
  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    transport: CHAT_TRANSPORT,
    onError: (error: Error): void => {
      if (chatFailureCase(error) === "already-answered") {
        router.refresh();
      }
    },
  });
  const runtime = useAISDKRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatThread error={chat.error} personaName={personaName} />
    </AssistantRuntimeProvider>
  );
}
