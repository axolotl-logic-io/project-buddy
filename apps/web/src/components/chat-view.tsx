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
import {
  type ChatCommands,
  ChatCommandsContext,
  type CommandListing,
} from "@/components/chat/chat-commands.ts";
import { ChatThread } from "@/components/chat/chat-thread.tsx";
import { useComposerDraft } from "@/components/chat/composer-draft.ts";
import type { ReplyStop } from "@/components/chat/reply-stop.ts";
import { PlanPanel } from "@/components/plan/plan-panel.tsx";
import {
  type PlanActions,
  PlanContext,
  usePlanController,
} from "@/components/plan/use-plan.ts";
import { Notice } from "@/components/ui/form-message.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import { reloadForNewerBuild } from "@/errors/newer-build-reload.ts";
import type { ChatId, ProjectId, UserId } from "@/ids.ts";
import { imageAttachmentAdapter } from "@/images/attachment-adapter.ts";
import type { PlanState } from "@/plan/plan.ts";
import {
  PLAN_COMMAND_NAMES,
  PLAN_COMMAND_USAGE,
} from "@/plan/plan-commands.ts";
import { awaitsReply, PLAN_CARD_PART } from "@/plan/plan-message.ts";
import {
  CHAT_TRANSPORT,
  chatFailureCase,
  isFromNewerBuild,
} from "@/replies/chat-protocol.ts";
import type { ReplyCost } from "@/replies/reply-accounting.ts";
import { replyGoldAction } from "@/replies/reply-gold-action.ts";
import { stopReplyAction } from "@/replies/stop-reply-action.ts";
import {
  CHANGE_PLAN_OUTPUT,
  CHANGE_PLAN_TOOL,
} from "@/replies/tools/change-plan-contract.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  CHAT_COMMANDS_COPY,
  PLAN_COPY,
  PLAN_PANEL_COPY,
} from "@/ui/copy/plan.ts";

function pairedReplyCosts(
  messages: readonly UIMessage[],
  charged: readonly ReplyCost[] | undefined,
): Map<string, ReplyCost | undefined> {
  const costs = new Map<string, ReplyCost | undefined>();
  const byMessage = new Map(charged?.map((cost) => [cost.messageId, cost]));
  let answeredId: string | undefined;
  for (const message of messages) {
    if (awaitsReply(message)) {
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

// The built-in plan commands as the composer lists them.
const PLAN_COMMAND_LISTINGS: readonly CommandListing[] = PLAN_COMMAND_NAMES.map(
  (name) => ({
    command: `/${name}`,
    usage: PLAN_COMMAND_USAGE[name],
    description: CHAT_COMMANDS_COPY.description(name),
  }),
);

const NO_COMMANDS: readonly CommandListing[] = [];

// The newest plan the construct's change_plan calls in the messages saved,
// or undefined if none did.
function planFromConstruct(
  messages: readonly UIMessage[],
): Pick<PlanState, "version" | "plan"> | undefined {
  let newest: Pick<PlanState, "version" | "plan"> | undefined;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === `tool-${CHANGE_PLAN_TOOL}` && "output" in part) {
        const output = CHANGE_PLAN_OUTPUT.safeParse(part.output).data;
        if (
          output?.status === "changed" &&
          output.version > (newest?.version ?? 0)
        ) {
          newest = { version: output.version, plan: output.plan };
        }
      }
    }
  }
  return newest;
}

// The id of the newest message holding a plan card, if any.
function newestPlanCard(messages: readonly UIMessage[]): string | undefined {
  return messages.findLast((message) =>
    message.parts.some((part) => part.type === PLAN_CARD_PART),
  )?.id;
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
  projectId,
  initialPlan,
  planActions,
  mockCommands = NO_COMMANDS,
  starter,
}: {
  chatId: ChatId;
  viewer: UserId;
  constructName: string;
  construct?: ConstructSnapshot | undefined;
  initialMessages: UIMessage[];
  stoppedReplyId?: string | undefined;
  authorNames?: ReadonlyMap<string, string>;
  // The chat's quest and its plan as the page read it; undefined in a
  // standalone chat.
  projectId?: ProjectId | undefined;
  initialPlan?: PlanState | undefined;
  // The plan's Server Actions, which the page hands over in a quest chat.
  planActions?: PlanActions | undefined;
  // The mock model's commands, which the composer lists too while it runs.
  mockCommands?: readonly CommandListing[] | undefined;
  // A prepared message offered beside the composer, such as the Dailies
  // quest's Start the day: choosing it sends text as the viewer's own
  // message, like any other, and leaves the draft in the composer.
  starter?: { readonly label: string; readonly text: string } | undefined;
}): JSX.Element {
  const router = useRouter();
  const replyCompletedRef = useRef(false);
  const [gold, setGold] =
    useState<Awaited<ReturnType<typeof replyGoldAction>>>();
  const [stopStatus, setStopStatus] = useState("");
  const [stopping, setStopping] = useState(false);
  const [refusal, setRefusal] = useState<Error | undefined>(undefined);
  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    transport: CHAT_TRANSPORT,
    onFinish: ({ isError }: { isError: boolean }): void => {
      replyCompletedRef.current = true;
      setStopping(false);
      setStopStatus("");
      // The SDK finishes failed requests too. Keep their error visible; a
      // refresh after a signed-out reply would redirect away from it.
      if (!isError) {
        router.refresh();
      }
    },
    onError: (error: Error): void => {
      replyCompletedRef.current = true;
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
      const previous = headerBalanceRef.current;
      headerBalanceRef.current = gold.balance;
      // An idle first read seeds the baseline. A reply may finish before
      // that read arrives, in which case its accounting still needs a refresh.
      if (previous !== undefined || replyCompletedRef.current) {
        router.refresh();
      }
      replyCompletedRef.current = false;
    }
  }, [gold, router]);
  const replyCosts = pairedReplyCosts(chat.messages, gold?.costs);
  const attachments = useMemo(() => imageAttachmentAdapter(chatId), [chatId]);
  const runtime = useAISDKRuntime(chat, { adapters: { attachments } });
  const reattach = useComposerDraft(runtime, { viewer, chatId });
  const replying = chat.status === "streaming" || chat.status === "submitted";
  const lastSaved = initialMessages.at(-1);
  const replyingElsewhere =
    lastSaved !== undefined &&
    awaitsReply(lastSaved) &&
    stoppedReplyId === undefined &&
    chat.status === "ready";
  const shownError = refusal ?? chat.error;
  const replyStopped =
    stoppedReplyId !== undefined &&
    shownError === undefined &&
    chat.status === "ready" &&
    chat.messages.at(-1)?.id === stoppedReplyId;
  const replyFailed = chat.status === "error" && refusal === undefined;
  // The plan's controls here wait while the newest message awaits a reply:
  // a plan message saved after it would end the conversation its reply, a
  // retry or "send again" answers. The server refuses one too
  // (src/chats/store.ts, chatAwaitsReply).
  let planDisabledNote: string | undefined;
  if (replying || replyingElsewhere) {
    planDisabledNote = PLAN_PANEL_COPY.busy(constructName);
  } else if (replyFailed || replyStopped) {
    planDisabledNote = PLAN_PANEL_COPY.unanswered;
  }
  const { setMessages } = chat;
  const addMessage = useCallback(
    (message: UIMessage): void => {
      setMessages((messages) => [...messages, message]);
    },
    [setMessages],
  );
  const observed = useMemo(
    () => planFromConstruct(chat.messages),
    [chat.messages],
  );
  const plan = usePlanController({
    projectId,
    actions: planActions,
    chatId,
    initialState: initialPlan,
    disabledNote: planDisabledNote,
    newestCardId: newestPlanCard(chat.messages),
    observed,
    onMessage: addMessage,
  });
  const receivePlan = plan?.receive;
  const runCommand = useCallback(
    async (text: string): Promise<string | undefined> => {
      const result = await planActions?.command({ chatId, text });
      if (result === undefined) {
        return CHAT_COMMANDS_COPY.failed;
      }
      switch (result.kind) {
        case "problem":
          return result.text;
        case "not-found":
          return PLAN_COPY.failed["not-found"];
        case "failed":
          receivePlan?.(result.state);
          return PLAN_COPY.failed[result.reason];
        case "changed":
        case "shown":
          receivePlan?.(result.state);
          if (result.message !== undefined) {
            addMessage(result.message);
          }
          return undefined;
        default:
          return result satisfies never;
      }
    },
    [addMessage, chatId, planActions, receivePlan],
  );
  // Without the plan's actions, as in a test of the conversation alone, the
  // composer runs no commands and sends every message.
  const commands = useMemo((): ChatCommands | undefined => {
    if (planActions === undefined) {
      return undefined;
    }
    let listings: readonly CommandListing[] = mockCommands;
    if (projectId !== undefined) {
      listings = [...PLAN_COMMAND_LISTINGS, ...mockCommands];
    }
    return {
      listings,
      mockCommands: mockCommands.length > 0,
      inQuest: projectId !== undefined,
      run: runCommand,
    };
  }, [mockCommands, planActions, projectId, runCommand]);
  const starterText = starter?.text;
  const { sendMessage } = chat;
  const sendStarter = useCallback((): void => {
    if (starterText !== undefined) {
      sendMessage({ text: starterText }).catch(() => undefined);
    }
  }, [sendMessage, starterText]);
  const retryReply = useCallback((): void => {
    chat.regenerate().catch(() => undefined);
  }, [chat]);
  if (refusal !== undefined && chat.status === "submitted") {
    setRefusal(undefined);
  }
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
    const message = [...chat.messages].reverse().find(awaitsReply);
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
  // While a reply runs, here or elsewhere, Stop takes Send's place.
  let replyStop: ReplyStop | undefined;
  if (replying || replyingElsewhere) {
    replyStop = { stopping, onStop: stop };
  }
  let offeredStarter: { label: string; onStart: () => void } | undefined;
  if (starter !== undefined && replyStop === undefined) {
    offeredStarter = { label: starter.label, onStart: sendStarter };
  }
  let openingMessageId: string | undefined;
  if (initialMessages[0]?.role === "assistant") {
    openingMessageId = initialMessages[0].id;
  }
  const conversation = (
    <>
      {reattach && <Notice role="status">{CHAT_COPY.reattach}</Notice>}
      {replyingElsewhere === true && (
        <Notice role="status">
          {CHAT_COPY.replyingElsewhere(constructName)}
        </Notice>
      )}
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
        stop={replyStop}
        stopStatus={stopStatus}
        starter={offeredStarter}
      />
    </>
  );
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <PlanContext.Provider value={plan}>
        <ChatCommandsContext.Provider value={commands}>
          {plan === undefined && conversation}
          {plan !== undefined && (
            <div className="adventure-layout">
              <PlanPanel />
              <div className="adventure-main">{conversation}</div>
            </div>
          )}
        </ChatCommandsContext.Provider>
      </PlanContext.Provider>
    </AssistantRuntimeProvider>
  );
}
