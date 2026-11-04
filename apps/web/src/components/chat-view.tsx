"use client";

import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import {
  type AssistantRuntime,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import {
  type JSX,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  SELECT_ACTIVITY_OUTPUT,
  SELECT_ACTIVITY_TOOL,
} from "@/activities/select-activity-contract.ts";
import { ChatThread } from "@/components/chat/chat-thread.tsx";
import { reloadForNewerBuild } from "@/errors/newer-build-reload.ts";
import { extraTag } from "@/flags/flags.ts";
import type { ChatId } from "@/ids.ts";
import { imageAttachmentAdapter } from "@/images/attachment-adapter.ts";
import {
  CHAT_TRANSPORT,
  chatFailureCase,
  isFromNewerBuild,
} from "@/replies/chat-protocol.ts";
import { SELECT_ACTIVITY_COPY } from "@/ui/copy/chat.ts";

// A chat whose every user message is the viewer's own.
const NO_AUTHOR_NAMES: ReadonlyMap<string, string> = new Map();

// Takes back the message refused because she is out of gold. The server refused it before
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
  const refusedImages: {
    contentType: string;
    type: "image";
    name: string;
    content: [{ type: "image"; image: string }];
  }[] = [];
  chat.setMessages((messages: UIMessage[]): UIMessage[] => {
    const refused = messages.at(-1);
    if (refused?.role !== "user") {
      return messages;
    }
    for (const part of refused.parts) {
      if (part.type === "file") {
        refusedImages.push({
          type: "image",
          contentType: part.mediaType,
          name: part.filename ?? "Image",
          content: [
            {
              type: "image",
              image: new URL(part.url, globalThis.location.origin).href,
            },
          ],
        });
      }
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
  for (const image of refusedImages) {
    composer.addAttachment(image).catch(() => undefined);
  }
}

// A chat with the buddy: the saved conversation, then each new message and
// its streamed reply. A refusal for being out of gold is kept in the view's own
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
// authorNames names the authors of the saved user messages someone else
// wrote, by message id; every other user message is the viewer's own.
export function ChatView({
  chatId,
  buddyName,
  initialMessages,
  authorNames = NO_AUTHOR_NAMES,
  activityName,
  header,
  navigation,
}: {
  header?: ReactNode;
  navigation?: ReactNode;
  activityName?: string | undefined;
  chatId: ChatId;
  buddyName: string;
  initialMessages: UIMessage[];
  authorNames?: ReadonlyMap<string, string>;
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
      if (errorCase === "out-of-gold") {
        takeBackRefusedMessage(chat, runtime);
        setRefusal(error);
        queueMicrotask(chat.clearError);
      }
    },
  });
  const attachments = useMemo(() => imageAttachmentAdapter(chatId), [chatId]);
  const runtime = useAISDKRuntime(chat, { adapters: { attachments } });
  const retryReply = useCallback((): void => {
    chat.regenerate().catch(() => undefined);
  }, [chat]);
  if (refusal !== undefined && chat.status === "submitted") {
    setRefusal(undefined);
  }

  let currentName = activityName;
  for (const message of chat.messages) {
    for (const part of message.parts) {
      if (
        isToolUIPart(part) &&
        getToolName(part) === SELECT_ACTIVITY_TOOL &&
        part.state === "output-available"
      ) {
        const output = SELECT_ACTIVITY_OUTPUT.safeParse(part.output);
        if (output.success && output.data.status === "entered") {
          currentName = output.data.name;
        }
      }
    }
  }
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <header className="chat-header" {...extraTag("pinned-chat-header")}>
        <div className="grid grid-cols-2 items-center gap-3">
          {navigation}
          {currentName !== undefined && (
            <p className="wrap-anywhere min-w-0 text-right text-muted text-sm">
              {SELECT_ACTIVITY_COPY.current(currentName)}
            </p>
          )}
        </div>
        {header}
      </header>
      <ChatThread
        error={refusal ?? chat.error}
        onRetry={retryReply}
        buddyName={buddyName}
        authorNames={authorNames}
      />
    </AssistantRuntimeProvider>
  );
}
