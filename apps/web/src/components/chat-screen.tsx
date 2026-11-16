import type { JSX, ReactNode } from "react";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, otherAuthorNames } from "@/chats/message-author.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import type { TasksActions } from "@/components/tasks/use-tasks.ts";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import type { DailiesDay } from "@/dailies/dailies.ts";
import type { UserId } from "@/ids.ts";
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

// A quest's continuing conversation, as viewer sees it: a pinned header
// with its construct, who was chosen when it started; then its messages
// and the composer. Their own messages are the viewer's; every other user
// message shows its author's name. stoppedReplyId is the last message's id
// when its reply stopped (readStoppedReply). tasks is given in a quest's
// conversation alone, which shows the quest's tasks beside it.
// header replaces the default construct header; null omits it when the
// construct is already available in the surrounding navigation.
function ChatScreen({
  conversation,
  messages,
  stoppedReplyId,
  viewer,
  tasks,
  actions,
  header,
  sideSections,
  initialSection,
  dailiesDays,
}: {
  readonly conversation: Chat;
  readonly messages: ChatMessage[];
  readonly stoppedReplyId: string | undefined;
  readonly viewer: UserId;
  readonly tasks?: TasksState | undefined;
  readonly actions?: ReactNode;
  readonly sideSections?: readonly WorkspaceSection[] | undefined;
  readonly initialSection?: string | undefined;
  readonly header?: ReactNode;
  // The Dailies quest's days, for its recurring tasks' streaks.
  readonly dailiesDays?: readonly DailiesDay[] | undefined;
}): JSX.Element {
  const { construct } = conversation;
  let spellName: string | undefined;
  if (conversation.spell !== undefined) {
    spellName =
      conversation.activeSpell?.name ?? getSpell(conversation.spell).name;
  }
  let heading = header;
  if (heading === undefined) {
    heading = (
      <header className="chat-header">
        <div className="conversation-header">
          <AdventureCharacterHeader
            construct={construct}
            destination={{ kind: "adventure", id: conversation.id }}
          />
          {actions}
        </div>
      </header>
    );
  }
  return (
    <>
      {heading}
      <ChatView
        spellName={spellName}
        sideSections={sideSections}
        initialSection={initialSection}
        viewer={viewer}
        chatId={conversation.id}
        key={conversation.id}
        initialMessages={messages}
        stoppedReplyId={stoppedReplyId}
        constructName={construct.name}
        construct={construct}
        authorNames={otherAuthorNames(messages, viewer)}
        questId={conversation.quest.id}
        initialTasks={tasks}
        tasksActions={TASKS_ACTIONS}
        dailiesDays={dailiesDays}
      />
    </>
  );
}

export { ChatScreen };
