"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import {
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
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
import { StatusFeedbackContext } from "@/components/quest-status-feedback-context.ts";
import { Notice } from "@/components/ui/form-message.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import { reloadForNewerBuild } from "@/errors/newer-build-reload.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
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
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { SPELL_MODE_COPY } from "@/ui/copy/spells.ts";

// A chat whose every user message is the viewer's own.
const CLAIM_REFRESH_MS = 2000;

const NO_AUTHOR_NAMES: ReadonlyMap<string, string> = new Map();

// The built-in plan commands as the composer lists them.
const PLAN_COMMAND_LISTINGS: readonly CommandListing[] = PLAN_COMMAND_NAMES.map(
  (name) => ({
    command: `/${name}`,
    usage: PLAN_COMMAND_USAGE[name],
    description: CHAT_COMMANDS_COPY.description(name),
  }),
);

const SPELL_COMMANDS: readonly CommandListing[] = [
  {
    command: "/brainstorm",
    usage: "/brainstorm",
    description: "Cast Brainstorm; save subsequent messages to Ideas",
  },
  {
    command: "/stop",
    usage: "/stop",
    description: "Stop the active spell and return to Chat",
  },
];
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

// A continuing conversation with streamed replies, commands and workspace sections.
function ChatView({
  chatId,
  viewer,
  constructName,
  construct,
  initialMessages,
  stoppedReplyId,
  authorNames = NO_AUTHOR_NAMES,
  questId,
  initialPlan,
  planActions,
  spellName,
  sideSections,
  initialSection,
  sidebarActions,
}: {
  spellName?: string | undefined;
  sideSections?: readonly WorkspaceSection[] | undefined;
  sidebarActions?: ReactNode;
  initialSection?: string | undefined;
  chatId: ChatId;
  viewer: UserId;
  constructName: string;
  construct?: ConstructSnapshot | undefined;
  initialMessages: UIMessage[];
  stoppedReplyId?: string | undefined;
  authorNames?: ReadonlyMap<string, string>;
  // The chat's quest and its plan as the page read it; undefined in a
  // standalone chat.
  questId?: QuestId | undefined;
  initialPlan?: PlanState | undefined;
  // The plan's Server Actions, which the page hands over in a quest chat.
  planActions?: PlanActions | undefined;
}): JSX.Element {
  const router = useRouter();
  const [stopStatus, setStopStatus] = useState("");
  const [stopping, setStopping] = useState(false);
  const chat = useChat({
    id: chatId,
    messages: initialMessages,
    transport: CHAT_TRANSPORT,
    onFinish: ({ isError }: { isError: boolean }): void => {
      setStopping(false);
      setStopStatus("");
      // The SDK finishes failed requests too. Keep their error visible; a
      // refresh after a signed-out reply would redirect away from it.
      if (!isError) {
        router.refresh();
      }
    },
    onError: (error: Error): void => {
      const errorCase = chatFailureCase(error);
      if (errorCase === "already-answered") {
        router.refresh();
      }
      if (isFromNewerBuild(error)) {
        reloadForNewerBuild();
      }
    },
  });
  // Saved updates from another viewer replace the conversation without
  // replacing the runtime that owns this viewer's draft.
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
  const runtime = useAISDKRuntime(chat);
  useComposerDraft(runtime, { viewer, chatId });
  const replying = chat.status === "streaming" || chat.status === "submitted";
  const lastSaved = initialMessages.at(-1);
  const replyingElsewhere =
    lastSaved !== undefined &&
    awaitsReply(lastSaved) &&
    stoppedReplyId === undefined &&
    chat.status === "ready";
  const shownError = chat.error;
  const replyStopped =
    stoppedReplyId !== undefined &&
    shownError === undefined &&
    chat.status === "ready" &&
    chat.messages.at(-1)?.id === stoppedReplyId;
  const replyFailed = chat.status === "error";
  // Plan controls wait while the newest message awaits a reply, keeping
  // the plan stable for the reply and any retry. The server checks too.
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
    questId,
    actions: planActions,
    chatId,
    initialState: initialPlan,
    disabledNote: planDisabledNote,
    newestCardId: newestPlanCard(chat.messages),
    observed,
  });
  const receivePlan = plan?.receive;
  const publishStatus = useContext(StatusFeedbackContext);
  const runCommand = useCallback(
    async (text: string): Promise<string | undefined> => {
      const result = await planActions?.command({ chatId, text });
      if (result === undefined) {
        return CHAT_COMMANDS_COPY.failed;
      }
      switch (result.kind) {
        case "quest-status":
          publishStatus?.(result.feedback);
          return undefined;
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
    [addMessage, chatId, planActions, receivePlan, publishStatus],
  );
  // Without the plan's actions, as in a test of the conversation alone, the
  // composer runs no commands and sends every message.
  const commands = useMemo((): ChatCommands | undefined => {
    if (planActions === undefined) {
      return undefined;
    }
    let listings: readonly CommandListing[] = NO_COMMANDS;
    if (questId !== undefined) {
      listings = [
        ...PLAN_COMMAND_LISTINGS,
        ...QUEST_STATUS_COPY.commands,
        ...SPELL_COMMANDS,
      ];
    }
    return {
      listings,
      inQuest: questId !== undefined,
      run: runCommand,
    };
  }, [planActions, questId, runCommand]);
  const { sendMessage } = chat;
  const stopSpell = useCallback((): void => {
    sendMessage({ text: "/stop" }).catch(() => undefined);
  }, [sendMessage]);
  const retryReply = useCallback((): void => {
    chat.regenerate().catch(() => undefined);
  }, [chat]);
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
  let openingMessageId: string | undefined;
  if (initialMessages[0]?.role === "assistant") {
    openingMessageId = initialMessages[0].id;
  }
  let spellStop: { label: string; onStop: () => void } | undefined;
  if (spellName !== undefined && replyStop === undefined) {
    spellStop = {
      label: SPELL_MODE_COPY.stop(spellName),
      onStop: stopSpell,
    };
  }
  const conversation = (
    <>
      {replyingElsewhere === true && (
        <Notice role="status">
          {CHAT_COPY.replyingElsewhere(constructName)}
        </Notice>
      )}
      <ChatThread
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
        spellStop={spellStop}
      />
    </>
  );
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <PlanContext.Provider value={plan}>
        <ChatCommandsContext.Provider value={commands}>
          {plan === undefined && conversation}
          {plan !== undefined && (
            <PlanPanel
              sidebarActions={sidebarActions}
              initialSection={initialSection}
              sideSections={sideSections}
            >
              {conversation}
            </PlanPanel>
          )}
        </ChatCommandsContext.Provider>
      </PlanContext.Provider>
    </AssistantRuntimeProvider>
  );
}

export { ChatView };
