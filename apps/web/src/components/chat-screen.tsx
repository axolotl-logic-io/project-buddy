import type { JSX, ReactNode } from "react";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, otherAuthorNames } from "@/chats/message-author.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import type { PlanActions } from "@/components/plan/use-plan.ts";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import type { UserId } from "@/ids.ts";
import type { PlanState } from "@/plan/plan.ts";
import {
  changePlanAction,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { getSpell } from "@/spells/spell.ts";

// The plan's Server Actions, which also run the composer's commands, in a
// quest's conversation and in Chat alike.
const PLAN_ACTIONS: PlanActions = {
  change: changePlanAction,
  undo: undoPlanChangeAction,
  command: runChatCommandAction,
};

// A continuing conversation, a quest's or the private Chat, as viewer sees
// it: a pinned header with its construct, who was chosen when it started,
// and actions, such as Chat's Turn Chat into a quest; then its messages
// and the composer. Their own messages are the viewer's; every other user
// message shows its author's name. stoppedReplyId is the last message's id
// when its reply stopped (readStoppedReply). plan is given in a quest's
// conversation alone, which shows the quest's plan beside it.
// header replaces the default construct header; null omits it when the
// construct is already available in the surrounding navigation.
function ChatScreen({
  conversation,
  messages,
  stoppedReplyId,
  viewer,
  plan,
  actions,
  header,
  sideSections,
  initialSection,
}: {
  readonly conversation: Chat;
  readonly messages: ChatMessage[];
  readonly stoppedReplyId: string | undefined;
  readonly viewer: UserId;
  readonly plan?: PlanState | undefined;
  readonly actions?: ReactNode;
  readonly sideSections?: readonly WorkspaceSection[] | undefined;
  readonly initialSection?: string | undefined;
  readonly header?: ReactNode;
}): JSX.Element {
  const { construct } = conversation;
  let spellName: string | undefined;
  if (conversation.spell !== undefined) {
    spellName = getSpell(conversation.spell).name;
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
        questId={conversation.quest?.id}
        initialPlan={plan}
        planActions={PLAN_ACTIONS}
      />
    </>
  );
}

export { ChatScreen };
