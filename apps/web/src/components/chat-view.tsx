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
  PANEL_COMMAND,
  PANEL_COMMAND_NAMES,
  PANEL_COMMAND_USAGE,
} from "@/commands/panel-commands.ts";
import {
  type ChatCommands,
  ChatCommandsContext,
  type CommandListing,
} from "@/components/chat/chat-commands.ts";
import {
  ChatBusyContext,
  ChatSendContext,
  type ChatSendResult,
} from "@/components/chat/chat-send.ts";
import { ChatThread } from "@/components/chat/chat-thread.tsx";
import { useComposerDraft } from "@/components/chat/composer-draft.ts";
import type { ReplyStop } from "@/components/chat/reply-stop.ts";
import { ConversationPanel } from "@/components/conversation-panel.tsx";
import { noteLeftQuest } from "@/components/left-quest.ts";
import { QuestPanel } from "@/components/quest-panel.tsx";
import { StatusFeedbackContext } from "@/components/quest-status-feedback-context.ts";
import {
  type TasksActions,
  TasksContext,
  useTasksController,
} from "@/components/tasks/use-tasks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import { type DailiesDay, todayHere } from "@/dailies/dailies.ts";
import { reloadForNewerBuild } from "@/errors/newer-build-reload.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import {
  CHAT_TRANSPORT,
  chatFailureCase,
  isFromNewerBuild,
} from "@/replies/chat-protocol.ts";
import { stopReplyAction } from "@/replies/stop-reply-action.ts";
import {
  CHANGE_TASKS_OUTPUT,
  CHANGE_TASKS_TOOL,
} from "@/replies/tools/change-tasks-contract.ts";
import type { TasksState } from "@/tasks/tasks.ts";
import type { TasksActionResult } from "@/tasks/tasks-actions.ts";
import {
  isChatCommand,
  TASKS_COMMAND_NAMES,
  TASKS_COMMAND_USAGE,
} from "@/tasks/tasks-commands.ts";
import { awaitsReply, TASKS_CARD_PART } from "@/tasks/tasks-message.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { SPELL_MODE_COPY, SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import {
  CHAT_COMMANDS_COPY,
  TASKS_COPY,
  TASKS_PANEL_COPY,
  tasksLineText,
} from "@/ui/copy/tasks.ts";

// A chat whose every user message is the viewer's own.
const CLAIM_REFRESH_MS = 2000;

const NO_AUTHOR_NAMES: ReadonlyMap<string, string> = new Map();

// The built-in tasks commands as the composer lists them.
const TASKS_COMMAND_LISTINGS: readonly CommandListing[] =
  TASKS_COMMAND_NAMES.map((name) => ({
    command: `/${name}`,
    usage: TASKS_COMMAND_USAGE[name],
    description: CHAT_COMMANDS_COPY.description(name),
  }));

// The other commands the quest panel's controls send, as the composer lists
// them.
const PANEL_COMMAND_LISTINGS: readonly CommandListing[] =
  PANEL_COMMAND_NAMES.map((name) => ({
    command: `/${name}`,
    usage: PANEL_COMMAND_USAGE[name],
    description: PANEL_COMMANDS_COPY.description(name),
  }));

// What a command did, for the composer or a panel control: why it did
// nothing, or what the conversation now notes of it.
interface CommandOutcome {
  readonly problem?: string | undefined;
  readonly note?: string | undefined;
}

// The construct's commands the composer lists, which it sends as messages
// for the construct to answer.
const CONSTRUCT_COMMANDS: readonly CommandListing[] = [
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
  {
    command: "/exp",
    usage: "/exp",
    description: "Show your experience, circle and title",
  },
];

// The newest tasks the construct's change_tasks calls in the messages saved,
// or undefined if none did.
function tasksFromConstruct(
  messages: readonly UIMessage[],
): Pick<TasksState, "version" | "tasks"> | undefined {
  let newest: Pick<TasksState, "version" | "tasks"> | undefined;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === `tool-${CHANGE_TASKS_TOOL}` && "output" in part) {
        const output = CHANGE_TASKS_OUTPUT.safeParse(part.output).data;
        if (
          output?.status === "changed" &&
          output.version > (newest?.version ?? 0)
        ) {
          newest = { version: output.version, tasks: output.tasks };
        }
      }
    }
  }
  return newest;
}

// The id of the newest message holding a Tasks card, if any.
function newestTasksCard(messages: readonly UIMessage[]): string | undefined {
  return messages.findLast((message) =>
    message.parts.some((part) => part.type === TASKS_CARD_PART),
  )?.id;
}

function useConversationCommands({
  chatId,
  tasksActions,
  receiveTasks,
  addMessage,
  panelProblem,
  setPanelProblem,
  busy,
  sendMessage,
}: {
  readonly chatId: ChatId;
  readonly tasksActions: TasksActions | undefined;
  readonly receiveTasks:
    | NonNullable<ReturnType<typeof useTasksController>>["receive"]
    | undefined;
  readonly addMessage: (message: UIMessage) => void;
  readonly panelProblem: string | undefined;
  readonly setPanelProblem: (problem: string | undefined) => void;
  readonly busy: boolean;
  readonly sendMessage: ReturnType<typeof useChat>["sendMessage"];
}): {
  readonly commands: ChatCommands | undefined;
  readonly send: (text: string) => Promise<ChatSendResult>;
} {
  const router = useRouter();
  const publishStatus = useContext(StatusFeedbackContext);
  // Shows what the command's result says, and answers with its outcome.
  const settleCommand = useCallback(
    (result: TasksActionResult): CommandOutcome => {
      switch (result.kind) {
        case "quest-status":
          publishStatus?.(result.feedback);
          if (result.message !== undefined) {
            addMessage(result.message);
          }
          return { note: result.feedback.message };
        case "noted":
          if (result.message !== undefined) {
            addMessage(result.message);
          }
          if (result.leftQuest !== undefined) {
            noteLeftQuest(result.leftQuest);
          }
          if (result.navigate !== undefined) {
            router.replace(result.navigate);
          }
          return { note: result.note };
        case "problem":
          return { problem: result.text };
        case "not-found":
          return { problem: TASKS_COPY.failed["not-found"] };
        case "failed":
          receiveTasks?.(result.state);
          return { problem: TASKS_COPY.failed[result.reason] };
        case "changed":
        case "shown":
          receiveTasks?.(result.state);
          if (result.message !== undefined) {
            addMessage(result.message);
          }
          if (result.kind === "changed") {
            return { note: result.lines.map(tasksLineText).join(". ") };
          }
          return {};
        default:
          return result satisfies never;
      }
    },
    [addMessage, receiveTasks, publishStatus, router],
  );
  const execute = useCallback(
    async (text: string): Promise<CommandOutcome> => {
      setPanelProblem(undefined);
      const result = await tasksActions?.command({
        chatId,
        text,
        localDate: todayHere(new Date()),
      });
      if (result === undefined) {
        return { problem: CHAT_COMMANDS_COPY.failed };
      }
      return settleCommand(result);
    },
    [chatId, tasksActions, settleCommand, setPanelProblem],
  );
  const runCommand = useCallback(
    async (text: string): Promise<string | undefined> =>
      (await execute(text)).problem,
    [execute],
  );
  // Without the task list's actions, as in a test of the conversation alone, the
  // composer runs no commands and sends every message.
  const commands = useMemo((): ChatCommands | undefined => {
    if (tasksActions === undefined) {
      return undefined;
    }
    return {
      listings: [
        ...TASKS_COMMAND_LISTINGS,
        ...QUEST_STATUS_COPY.commands,
        ...PANEL_COMMAND_LISTINGS,
        ...CONSTRUCT_COMMANDS,
      ],
      run: runCommand,
      panelProblem,
    };
  }, [tasksActions, runCommand, panelProblem]);
  // A quest panel control's send: a command runs at once, as typed in the
  // composer; any other message goes to the construct.
  const send = useCallback(
    async (text: string): Promise<ChatSendResult> => {
      if (tasksActions !== undefined && isChatCommand(text)) {
        const outcome = await execute(text).catch(
          (): CommandOutcome => ({ problem: CHAT_COMMANDS_COPY.failed }),
        );
        if (outcome.problem !== undefined) {
          setPanelProblem(outcome.problem);
          return { sent: false, problem: outcome.problem };
        }
        return { sent: true, note: outcome.note };
      }
      setPanelProblem(undefined);
      if (busy) {
        setPanelProblem(PANEL_COMMANDS_COPY.problems.awaitingReply);
        return {
          sent: false,
          problem: PANEL_COMMANDS_COPY.problems.awaitingReply,
        };
      }
      try {
        await sendMessage({ text });
        return { sent: true };
      } catch {
        setPanelProblem(PANEL_COMMANDS_COPY.problems.failed);
        return { sent: false, problem: PANEL_COMMANDS_COPY.problems.failed };
      }
    },
    [tasksActions, execute, busy, sendMessage, setPanelProblem],
  );
  return { commands, send };
}

function ActiveSpellConversation({
  name,
  destination,
  busy,
  onStop,
  children,
}: {
  readonly name: string;
  readonly destination: "tasks" | "brainstorm";
  readonly busy: boolean;
  readonly onStop: () => Promise<void>;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <section
      aria-label={QUEST_OVERVIEW_COPY.conversation}
      className="quest-active-spell"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="section-heading">{name}</h2>
          <p className="text-muted text-sm">
            {SPELLBOOK_COPY.collectionDestination(
              SPELLBOOK_COPY.destinations[destination],
            )}
          </p>
        </div>
        <Button variant="secondary" onClick={onStop} disabled={busy}>
          {SPELL_MODE_COPY.stop(name)}
        </Button>
      </header>
      {children}
    </section>
  );
}

// Owns the streamed reply, including reconciliation with saved messages and
// stopping a reply started here or by another viewer.
function useConversationReply({
  chatId,
  viewer,
  initialMessages,
  stoppedReplyId,
  cast,
}: {
  readonly cast?: string | undefined;
  readonly chatId: ChatId;
  readonly viewer: UserId;
  readonly initialMessages: UIMessage[];
  readonly stoppedReplyId: string | undefined;
}): {
  readonly chat: ReturnType<typeof useChat>;
  readonly runtime: ReturnType<typeof useAISDKRuntime>;
  readonly replyingElsewhere: boolean;
  readonly replyStopped: boolean;
  readonly replyStop: ReplyStop | undefined;
  readonly retryReply: () => void;
  readonly stopStatus: string;
  readonly setStopStatus: (status: string) => void;
} {
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
      if (errorCase === "already-answered" || errorCase === "spell-required") {
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
  useComposerDraft(runtime, { viewer, chatId, cast });
  const replying = chat.status === "streaming" || chat.status === "submitted";
  const lastSaved = initialMessages.at(-1);
  const replyingElsewhere =
    lastSaved !== undefined &&
    awaitsReply(lastSaved) &&
    stoppedReplyId === undefined &&
    chat.status === "ready";
  const replyStopped =
    stoppedReplyId !== undefined &&
    chat.error === undefined &&
    chat.status === "ready" &&
    chat.messages.at(-1)?.id === stoppedReplyId;
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
  return {
    chat,
    runtime,
    replyingElsewhere,
    replyStopped,
    replyStop,
    retryReply,
    stopStatus,
    setStopStatus,
  };
}

// Tasks stay stable while a reply runs and while it can still be retried.
function tasksDisabledNote({
  constructName,
  busy,
  replyStopped,
  error,
  failed,
}: {
  readonly constructName: string;
  readonly busy: boolean;
  readonly replyStopped: boolean;
  readonly error: Error | undefined;
  readonly failed: boolean;
}): string | undefined {
  let note: string | undefined;
  if (busy) {
    note = TASKS_PANEL_COPY.busy(constructName);
  } else if (
    failed &&
    error !== undefined &&
    chatFailureCase(error) === "not-found"
  ) {
    note = TASKS_PANEL_COPY.notFound;
  } else if (failed || replyStopped) {
    note = TASKS_PANEL_COPY.unanswered;
  }
  return note;
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
  initialTasks,
  tasksActions,
  dailiesDays,
  spellName,
  panel,
  panelTitle,
  initialSection,
  stopActiveSpell,
  spellDestination,
  cast,
}: {
  spellName?: string | undefined;
  cast?: string | undefined;
  stopActiveSpell?: (() => Promise<QuestActionResult>) | undefined;
  spellDestination?: "tasks" | "brainstorm" | undefined;
  panel?: ReactNode;
  panelTitle?: string | undefined;
  initialSection?: string | undefined;
  chatId: ChatId;
  viewer: UserId;
  constructName: string;
  construct?: ConstructSnapshot | undefined;
  initialMessages: UIMessage[];
  stoppedReplyId?: string | undefined;
  authorNames?: ReadonlyMap<string, string>;
  // The chat's quest and its tasks as the page read it.
  questId: QuestId;
  initialTasks?: TasksState | undefined;
  // The task list's Server Actions, which the page hands over in a quest chat.
  tasksActions?: TasksActions | undefined;
  // The Dailies quest's days, in the Dailies quest alone.
  dailiesDays?: readonly DailiesDay[] | undefined;
}): JSX.Element {
  const {
    chat,
    runtime,
    replyingElsewhere,
    replyStopped,
    replyStop,
    retryReply,
    stopStatus,
    setStopStatus,
  } = useConversationReply({
    chatId,
    viewer,
    initialMessages,
    stoppedReplyId,
    cast,
  });
  const shownError = chat.error;
  const busy = replyStop !== undefined;
  const { setMessages } = chat;
  const addMessage = useCallback(
    (message: UIMessage): void => {
      setMessages((messages) => [...messages, message]);
    },
    [setMessages],
  );
  const observed = useMemo(
    () => tasksFromConstruct(chat.messages),
    [chat.messages],
  );
  const [panelProblem, setPanelProblem] = useState<string | undefined>();
  const tasks = useTasksController({
    questId,
    actions: tasksActions,
    chatId,
    initialState: initialTasks,
    disabledNote: tasksDisabledNote({
      constructName,
      busy,
      replyStopped,
      error: shownError,
      failed: chat.status === "error",
    }),
    newestCardId: newestTasksCard(chat.messages),
    observed,
    days: dailiesDays,
    onMessage: addMessage,
    onProblem: setPanelProblem,
  });
  const { commands, send } = useConversationCommands({
    chatId,
    tasksActions,
    receiveTasks: tasks?.receive,
    addMessage,
    panelProblem,
    setPanelProblem,
    busy,
    sendMessage: chat.sendMessage,
  });
  const endSpell = useCallback(async (): Promise<void> => {
    if (stopActiveSpell === undefined) {
      return;
    }
    try {
      const result = await stopActiveSpell();
      if (result.kind === "problem") {
        setStopStatus(result.text);
        return;
      }
      const heading =
        document.querySelector<HTMLElement>("[data-quest-spells]") ??
        document.querySelector<HTMLElement>("[data-quest-overview-heading]");
      heading?.focus();
    } catch {
      setStopStatus(CHAT_COPY.stopFailed);
    }
  }, [stopActiveSpell, setStopStatus]);
  const stopSpell = useCallback((): void => {
    send(PANEL_COMMAND.stop).catch(() => undefined);
  }, [send]);
  let openingMessageId: string | undefined;
  if (initialMessages[0]?.role === "assistant") {
    openingMessageId = initialMessages[0].id;
  }
  let spellStop:
    | { label: string; activeLabel: string; onStop: () => void }
    | undefined;
  if (
    stopActiveSpell === undefined &&
    spellName !== undefined &&
    replyStop === undefined
  ) {
    spellStop = {
      label: SPELL_MODE_COPY.stop(spellName),
      activeLabel: SPELL_MODE_COPY.active(spellName),
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
        spellOnly={stopActiveSpell !== undefined}
      />
    </>
  );
  if (
    stopActiveSpell !== undefined &&
    spellName !== undefined &&
    spellDestination !== undefined
  ) {
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ActiveSpellConversation
          name={spellName}
          destination={spellDestination}
          busy={busy}
          onStop={endSpell}
        >
          {conversation}
        </ActiveSpellConversation>
      </AssistantRuntimeProvider>
    );
  }
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <TasksContext.Provider value={tasks}>
        <ChatCommandsContext.Provider value={commands}>
          <ChatBusyContext.Provider value={busy}>
            <ChatSendContext.Provider value={send}>
              {tasks === undefined && conversation}
              {tasks !== undefined && (
                <ConversationPanel
                  initialSection={initialSection}
                  panel={
                    panel ?? <QuestPanel initialSection={initialSection} />
                  }
                  title={panelTitle ?? QUEST_SIDEBAR_COPY.quest}
                >
                  {conversation}
                </ConversationPanel>
              )}
            </ChatSendContext.Provider>
          </ChatBusyContext.Provider>
        </ChatCommandsContext.Provider>
      </TasksContext.Provider>
    </AssistantRuntimeProvider>
  );
}

export { ChatView };
