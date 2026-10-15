"use client";

import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import {
  type AssistantRuntime,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { isTextUIPart, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { type JSX, useState } from "react";
import { ChatThread } from "@/components/chat/chat-thread.tsx";
import { reloadForNewerBuild } from "@/errors/newer-build-reload.ts";
import type { ChatId } from "@/ids.ts";
import {
  CHAT_TRANSPORT,
  chatFailureCase,
  isFromNewerBuild,
} from "@/tutor/chat-protocol.ts";

// Takes back the message her quota refused. The server refused it before
// saving it, so the view drops the message useChat showed at once and gives
// her its text back in the box, as a reload would show the chat; the
// refusal's alert stays. Text she typed meanwhile is kept. setMessages is
// given a function because it calls it at once with the chat's current
// messages, which the last render's chat.messages may not have caught up to.
function takeBackRefusedMessage(
  chat: UseChatHelpers<UIMessage>,
  runtime: AssistantRuntime,
): void {
  let refusedText: string | undefined;
  chat.setMessages((messages: UIMessage[]): UIMessage[] => {
    const refused = messages.at(-1);
    if (refused?.role !== "user") {
      return messages;
    }
    refusedText = refused.parts
      .filter(isTextUIPart)
      .map(({ text }) => text)
      .join("");
    return messages.slice(0, -1);
  });
  const { composer } = runtime.thread;
  if (refusedText !== undefined && composer.getState().text === "") {
    composer.setText(refusedText);
  }
}

// A chat with the tutor: the saved conversation, then each new message and
// its streamed reply. A refusal for her quota is kept in the view's own
// state, not as the chat's error: while the chat has an error and no last
// message, as when an empty chat's first message is taken back, assistant-ui
// shows an empty reply. The chat calls onError before it records the error,
// so the error is cleared a microtask later; the refusal's alert stays until
// she sends again. A message that was answered already, such as one sent
// again after a lost connection, gets no second reply: the page reloads the
// saved conversation instead, answer included, and the chat page's key on
// its last message starts this view again from it. A failure that names a
// case this build doesn't know came from a newer build, mid-deploy: the
// page reloads once to pick that build up, and shows the unknown message if
// it already did within the last minute (newer-build-reload.ts).
export function ChatView({
  chatId,
  buddyName,
  initialMessages,
}: {
  chatId: ChatId;
  buddyName: string;
  initialMessages: UIMessage[];
}): JSX.Element {
  const router = useRouter();
  const [refusal, setRefusal] = useState<Error | undefined>(undefined);
  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    transport: CHAT_TRANSPORT,
    onError: (error: Error): void => {
      const errorCase = chatFailureCase(error);
      if (errorCase === "already-answered") {
        router.refresh();
      }
      if (isFromNewerBuild(error)) {
        reloadForNewerBuild();
      }
      if (errorCase === "quota-used-up") {
        takeBackRefusedMessage(chat, runtime);
        setRefusal(error);
        queueMicrotask(chat.clearError);
      }
    },
  });
  const runtime = useAISDKRuntime(chat);
  if (refusal !== undefined && chat.status === "submitted") {
    setRefusal(undefined);
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatThread error={refusal ?? chat.error} buddyName={buddyName} />
    </AssistantRuntimeProvider>
  );
}
