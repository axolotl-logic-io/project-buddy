import type { JSX, ReactNode } from "react";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, otherAuthorNames } from "@/chats/message-author.ts";
import { ChatView } from "@/components/chat-view.tsx";
import type { TasksActions } from "@/components/tasks/use-tasks.ts";
import type { DailiesDay } from "@/dailies/dailies.ts";
import type { UserId } from "@/ids.ts";
import { changeQuestSpellAction } from "@/spells/quest-spell-action.ts";
import { getSpell } from "@/spells/spell.ts";
import type { TasksState } from "@/tasks/tasks.ts";
import {
  changeTasksAction,
  runChatCommandAction,
  undoTasksChangeAction,
} from "@/tasks/tasks-actions.ts";

// The task list's Server Actions, which also run the composer's commands.
const TASKS_ACTIONS: TasksActions = {
  change: changeTasksAction,
  undo: undoTasksChangeAction,
  command: runChatCommandAction,
};

// A quest's continuing conversation, as viewer sees it: its messages and
// the composer. The active Dailies quest's construct, who was chosen when
// it started, is in the header's trail band (header-links.tsx). Their own
// messages are the viewer's; every other user message shows its author's
// name. stoppedReplyId is the last message's id
// when its reply stopped (readStoppedReply). tasks is given in a quest's
// conversation alone, which shows the quest's tasks beside it.
function ChatScreen({
  conversation,
  messages,
  stoppedReplyId,
  viewer,
  tasks,
  panel,
  panelTitle,
  initialSection,
  dailiesDays,
  spellOnly,
}: {
  readonly spellOnly?: boolean | undefined;
  readonly conversation: Chat;
  readonly messages: ChatMessage[];
  readonly stoppedReplyId: string | undefined;
  readonly viewer: UserId;
  readonly tasks?: TasksState | undefined;
  readonly panel?: ReactNode;
  readonly panelTitle?: string | undefined;
  readonly initialSection?: string | undefined;
  // The Dailies quest's days, for its recurring tasks' streaks.
  readonly dailiesDays?: readonly DailiesDay[] | undefined;
}): JSX.Element {
  const { construct } = conversation;
  let spell = conversation.activeSpell;
  if (spell === undefined && conversation.spell !== undefined) {
    spell = getSpell(conversation.spell);
  }
  let stopActiveSpell:
    | (() => ReturnType<typeof changeQuestSpellAction>)
    | undefined;
  let destination: "tasks" | "brainstorm" | undefined;
  if (spellOnly === true) {
    stopActiveSpell = changeQuestSpellAction.bind(null, {
      questId: conversation.quest.id,
    });
    destination = spell?.definition.destination;
  }
  let tasksActions: TasksActions | undefined;
  if (spellOnly !== true) {
    tasksActions = TASKS_ACTIONS;
  }
  return (
    <ChatView
      stopActiveSpell={stopActiveSpell}
      spellDestination={destination}
      spellName={spell?.name}
      panel={panel}
      panelTitle={panelTitle}
      initialSection={initialSection}
      viewer={viewer}
      chatId={conversation.id}
      key={conversation.spellStartedAt ?? conversation.id}
      cast={conversation.spellStartedAt}
      initialMessages={messages}
      stoppedReplyId={stoppedReplyId}
      constructName={construct.name}
      construct={construct}
      authorNames={otherAuthorNames(messages, viewer)}
      questId={conversation.quest.id}
      initialTasks={tasks}
      tasksActions={tasksActions}
      dailiesDays={dailiesDays}
    />
  );
}

export { ChatScreen };
