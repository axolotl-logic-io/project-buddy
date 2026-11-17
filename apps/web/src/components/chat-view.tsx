"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import {
  type JSX,
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
import { ChatPanel } from "@/components/chat-panel.tsx";
import { noteLeftQuest } from "@/components/left-quest.ts";
import { StatusFeedbackContext } from "@/components/quest-status-feedback-context.ts";
import {
  type TasksActions,
  TasksContext,
  useTasksController,
} from "@/components/tasks/use-tasks.ts";
import { Notice } from "@/components/ui/form-message.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
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
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { SPELL_MODE_COPY } from "@/ui/copy/spells.ts";
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
  sideSections,
  initialSection,
}: {
  spellName?: string | undefined;
  sideSections?: readonly WorkspaceSection[] | undefined;
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
  // Tasks controls wait while the newest message awaits a reply, keeping
  // the tasks stable for the reply and any retry. The server checks too.
  let tasksDisabledNote: string | undefined;
  if (replying || replyingElsewhere) {
    tasksDisabledNote = TASKS_PANEL_COPY.busy(constructName);
  } else if (
    replyFailed &&
    shownError !== undefined &&
    chatFailureCase(shownError) === "not-found"
  ) {
    // Retrying can't work for a quest that isn't open to the viewer.
    tasksDisabledNote = TASKS_PANEL_COPY.notFound;
  } else if (replyFailed || replyStopped) {
    tasksDisabledNote = TASKS_PANEL_COPY.unanswered;
  }
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
  const publishStatus = useContext(StatusFeedbackContext);
  const [panelProblem, setPanelProblem] = useState<string | undefined>();
  const tasks = useTasksController({
    questId,
    actions: tasksActions,
    chatId,
    initialState: initialTasks,
    disabledNote: tasksDisabledNote,
    newestCardId: newestTasksCard(chat.messages),
    observed,
    days: dailiesDays,
    onMessage: addMessage,
    onProblem: setPanelProblem,
  });
  const receiveTasks = tasks?.receive;
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
    [chatId, tasksActions, settleCommand],
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
  const { sendMessage } = chat;
  const busy = replying || replyingElsewhere;
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
    [tasksActions, execute, busy, sendMessage],
  );
  const stopSpell = useCallback((): void => {
    send(PANEL_COMMAND.stop).catch(() => undefined);
  }, [send]);
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
      <TasksContext.Provider value={tasks}>
        <ChatCommandsContext.Provider value={commands}>
          <ChatBusyContext.Provider value={busy}>
            <ChatSendContext.Provider value={send}>
              {tasks === undefined && conversation}
              {tasks !== undefined && (
                <ChatPanel
                  initialSection={initialSection}
                  sideSections={sideSections}
                >
                  {conversation}
                </ChatPanel>
              )}
            </ChatSendContext.Provider>
          </ChatBusyContext.Provider>
        </ChatCommandsContext.Provider>
      </TasksContext.Provider>
    </AssistantRuntimeProvider>
  );
}

export { ChatView };
