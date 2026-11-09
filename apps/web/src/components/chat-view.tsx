"use client";

import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import {
  type AssistantRuntime,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { isTextUIPart, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChatThread } from "@/components/chat/chat-thread.tsx";
import { useComposerDraft } from "@/components/chat/composer-draft.ts";
import { Button } from "@/components/ui/button.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import { reloadForNewerBuild } from "@/errors/newer-build-reload.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { imageAttachmentAdapter } from "@/images/attachment-adapter.ts";
import {
  CHAT_TRANSPORT,
  chatFailureCase,
  isFromNewerBuild,
} from "@/replies/chat-protocol.ts";
import type { ReplyCost } from "@/replies/reply-accounting.ts";
import { replyGoldAction } from "@/replies/reply-gold-action.ts";
import { stopReplyAction } from "@/replies/stop-reply-action.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

function pairedReplyCosts(
  messages: readonly UIMessage[],
  charged: readonly ReplyCost[] | undefined,
): Map<string, ReplyCost | undefined> {
  const costs = new Map<string, ReplyCost | undefined>();
  const byMessage = new Map(charged?.map((cost) => [cost.messageId, cost]));
  let answeredId: string | undefined;
  for (const message of messages) {
    if (message.role === "user") {
      answeredId = message.id;
    }
    if (message.role === "assistant" && answeredId !== undefined) {
      costs.set(message.id, byMessage.get(answeredId));
    }
  }
  return costs;
}

// A chat whose every user message is the viewer's own.
const CLAIM_REFRESH_MS = 2000;

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

// A chat with the construct: the saved conversation, then each new message and
// its streamed reply. A refusal for being out of gold is kept in the view's own
// state, not as the chat's error: while the chat has an error and no last
// message, as when an empty chat's first message is taken back, assistant-ui
// shows an empty reply. The chat calls onError before it records the error,
// so the error is cleared a microtask later; the refusal's alert stays until
// she sends again. A message that was answered already, such as one sent
// again after a lost connection, gets no second reply: the page reloads the
// saved conversation instead, answer included, while keeping the composer.
// A failure that names a
// case this build doesn't know came from a newer build, mid-deploy: the
// page reloads once to pick that build up, and shows the unknown message if
// it already did within the last minute (newer-build-reload.ts).
// authorNames names the authors of the saved user messages someone else
// wrote, by message id; every other user message is the viewer's own.
// stoppedReplyId is the saved last message's id when its reply stopped,
// such as after a failure before a reload: until the user sends or retries, the
// chat says so and offers to retry the reply.
export function ChatView({
  chatId,
  viewer,
  constructName,
  construct,
  initialMessages,
  stoppedReplyId,
  authorNames = NO_AUTHOR_NAMES,
}: {
  chatId: ChatId;
  viewer: UserId;
  constructName: string;
  construct?: ConstructSnapshot | undefined;
  initialMessages: UIMessage[];
  stoppedReplyId?: string | undefined;
  authorNames?: ReadonlyMap<string, string>;
}): JSX.Element {
  const router = useRouter();
  const [gold, setGold] =
    useState<Awaited<ReturnType<typeof replyGoldAction>>>();
  const [stopStatus, setStopStatus] = useState("");
  const [stopping, setStopping] = useState(false);
  const [refusal, setRefusal] = useState<Error | undefined>(undefined);
  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    transport: CHAT_TRANSPORT,
    onFinish: (): void => {
      setStopping(false);
      setStopStatus("");
      router.refresh();
    },
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
  // Saved updates from another viewer replace the conversation without
  // replacing the runtime that owns this viewer's draft and attachments.
  const savedMessagesRef = useRef(initialMessages);
  useEffect(() => {
    if (savedMessagesRef.current === initialMessages) {
      return;
    }
    savedMessagesRef.current = initialMessages;
    if (chat.status === "ready" || chat.status === "error") {
      chat.setMessages(initialMessages);
      chat.clearError();
    }
  }, [initialMessages, chat.status, chat.setMessages, chat.clearError]);
  useEffect(() => {
    if (chat.status !== "ready" && chat.status !== "error") {
      return;
    }
    let current = true;
    replyGoldAction(
      chatId,
      chat.messages
        .filter((message) => message.role === "user")
        .map((message) => message.id),
    )
      .then((next) => {
        if (current && next?.viewer === viewer) {
          setGold(next);
        }
      })
      .catch(() => {
        if (current) {
          setGold(undefined);
        }
      });
    return (): void => {
      current = false;
    };
  }, [chat.status, chatId, viewer, chat.messages]);
  const costsPending =
    gold?.costs.some((cost) => cost.state === "pending") === true;
  useEffect(() => {
    if (!costsPending || chat.status !== "ready") {
      return;
    }
    let current = true;
    let loading = false;
    const timer = globalThis.setInterval(() => {
      if (loading) {
        return;
      }
      loading = true;
      replyGoldAction(
        chatId,
        chat.messages
          .filter((message) => message.role === "user")
          .map((message) => message.id),
      )
        .then((next) => {
          if (current && next?.viewer === viewer) {
            setGold(next);
          }
        })
        .catch(() => {
          if (current) {
            setGold(undefined);
          }
        })
        .finally(() => {
          loading = false;
        });
    }, CLAIM_REFRESH_MS);
    return (): void => {
      current = false;
      globalThis.clearInterval(timer);
    };
  }, [costsPending, chat.status, chatId, chat.messages, viewer]);
  const headerBalanceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (gold !== undefined && headerBalanceRef.current !== gold.balance) {
      headerBalanceRef.current = gold.balance;
      router.refresh();
    }
  }, [gold, router]);
  const replyCosts = pairedReplyCosts(chat.messages, gold?.costs);
  const attachments = useMemo(() => imageAttachmentAdapter(chatId), [chatId]);
  const runtime = useAISDKRuntime(chat, { adapters: { attachments } });
  const reattach = useComposerDraft(runtime, { viewer, chatId });
  const retryReply = useCallback((): void => {
    chat.regenerate().catch(() => undefined);
  }, [chat]);
  if (refusal !== undefined && chat.status === "submitted") {
    setRefusal(undefined);
  }
  const replyingElsewhere =
    initialMessages.at(-1)?.role === "user" &&
    stoppedReplyId === undefined &&
    chat.status === "ready";
  useEffect(() => {
    if (!replyingElsewhere) {
      return;
    }
    const refresh = globalThis.setInterval(
      () => router.refresh(),
      CLAIM_REFRESH_MS,
    );
    return (): void => globalThis.clearInterval(refresh);
  }, [replyingElsewhere, router]);
  const stop = useCallback(async (): Promise<void> => {
    const message = [...chat.messages]
      .reverse()
      .find((entry) => entry.role === "user");
    if (message === undefined) {
      return;
    }
    setStopping(true);
    setStopStatus(CHAT_COPY.stopping);
    try {
      const status = await stopReplyAction({ chatId, messageId: message.id });
      if (status === "completed") {
        setStopStatus(CHAT_COPY.stopCompleted);
        setStopping(false);
      } else if (status !== "active") {
        setStopping(false);
        setStopStatus(CHAT_COPY.stopFailed);
      }
      router.refresh();
    } catch {
      setStopping(false);
      setStopStatus(CHAT_COPY.stopFailed);
    }
  }, [chat.messages, chatId, router]);
  let openingMessageId: string | undefined;
  if (initialMessages[0]?.role === "assistant") {
    openingMessageId = initialMessages[0].id;
  }
  const shownError = refusal ?? chat.error;
  const replyStopped =
    stoppedReplyId !== undefined &&
    shownError === undefined &&
    chat.status === "ready" &&
    chat.messages.at(-1)?.id === stoppedReplyId;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {reattach && <p role="status">{CHAT_COPY.reattach}</p>}
      {replyingElsewhere === true && (
        <p role="status" className="text-muted">
          {CHAT_COPY.replyingElsewhere(constructName)}
        </p>
      )}
      {(chat.status === "streaming" ||
        chat.status === "submitted" ||
        replyingElsewhere) && (
        <Button onClick={stop} disabled={stopping} variant="secondary">
          {CHAT_COPY.stop}
        </Button>
      )}
      {stopStatus !== "" && <p role="status">{stopStatus}</p>}
      <ChatThread
        goldBalance={gold?.balance}
        replyCosts={replyCosts}
        chatId={chatId}
        error={shownError}
        replyStopped={replyStopped}
        onRetry={retryReply}
        construct={
          construct ?? { name: constructName, definition: { prompt: "" } }
        }
        openingMessageId={openingMessageId}
        authorNames={authorNames}
      />
    </AssistantRuntimeProvider>
  );
}
