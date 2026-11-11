import type { JSX, ReactNode } from "react";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, otherAuthorNames } from "@/chats/message-author.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import type { PlanActions } from "@/components/plan/use-plan.ts";
import type { UserId } from "@/ids.ts";
import type { PlanState } from "@/plan/plan.ts";
import {
  changePlanAction,
  runChatCommandAction,
  undoPlanChangeAction,
} from "@/plan/plan-actions.ts";
import { mockCommandListings } from "@/replies/mock-command-listings.ts";

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
// conversation alone, which shows the quest's plan beside it. While the
// mock model runs, the composer lists its commands too. starter is a
// prepared message offered above the composer, such as Start the day.
function ChatScreen({
  conversation,
  messages,
  stoppedReplyId,
  viewer,
  plan,
  title,
  actions,
  starter,
}: {
  readonly conversation: Chat;
  readonly messages: ChatMessage[];
  readonly stoppedReplyId: string | undefined;
  readonly viewer: UserId;
  readonly plan?: PlanState | undefined;
  // The page's heading, for a page without one of its own, such as Chat.
  readonly title?: string | undefined;
  readonly actions?: ReactNode;
  readonly starter?:
    | { readonly label: string; readonly text: string }
    | undefined;
}): JSX.Element {
  const { construct } = conversation;
  return (
    <>
      <header className="chat-header">
        <div className="conversation-header">
          <AdventureCharacterHeader
            construct={construct}
            destination={{ kind: "adventure", id: conversation.id }}
          />
          {title !== undefined && (
            <h1 className="chat-heading flex-1">{title}</h1>
          )}
          {actions}
        </div>
      </header>
      <ChatView
        viewer={viewer}
        chatId={conversation.id}
        key={conversation.id}
        initialMessages={messages}
        stoppedReplyId={stoppedReplyId}
        constructName={construct.name}
        construct={construct}
        authorNames={otherAuthorNames(messages, viewer)}
        projectId={conversation.project?.id}
        initialPlan={plan}
        planActions={PLAN_ACTIONS}
        mockCommands={mockCommandListings()}
        starter={starter}
      />
    </>
  );
}

export { ChatScreen };
