import type { JSX } from "react";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import { readPlanState } from "@/plan/plan-store.ts";
import type { Quest } from "@/quests/store.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { StartConversationForm } from "./start-conversation-form.tsx";

// The prepared message that starts the day in the Dailies quest.
const START_THE_DAY: { readonly label: string; readonly text: string } = {
  label: QUEST_CONVERSATION_COPY.startTheDay,
  text: QUEST_CONVERSATION_COPY.startTheDayMessage,
};

// A quest's one conversation, as viewer sees it, with the quest's plan
// beside it. Opening it marks it read for viewer alone. Reading it spends
// nothing: a quest whose conversation hasn't started, as after the move
// from adventures, offers to start it instead. The Dailies quest offers
// Start the day, which sends a prepared message like any other.
async function questConversation(
  quest: Quest,
  viewer: UserId,
): Promise<{ readonly content: JSX.Element; readonly portrait?: JSX.Element }> {
  const conversation = await readQuestConversation(viewer, quest.id);
  if (conversation === undefined) {
    return {
      content: (
        <div className="flex flex-col items-start gap-3">
          <Notice>{QUEST_CONVERSATION_COPY.notStarted}</Notice>
          <StartConversationForm questId={quest.id} />
        </div>
      ),
    };
  }
  const [messages, stoppedReplyId, plan] = await Promise.all([
    listMessages(viewer, conversation.id),
    readStoppedReply(viewer, conversation.id),
    readPlanState(viewer, quest.id),
  ]);
  let starter: typeof START_THE_DAY | undefined;
  if (quest.dailies && quest.status === "active") {
    starter = START_THE_DAY;
  }
  return {
    portrait: (
      <AdventureCharacterHeader
        construct={conversation.construct}
        destination={{ kind: "adventure", id: conversation.id }}
        compact={true}
      />
    ),
    content: (
      <ChatScreen
        header={null}
        conversation={conversation}
        messages={messages}
        stoppedReplyId={stoppedReplyId}
        viewer={viewer}
        plan={plan}
        starter={starter}
      />
    ),
  };
}

export { questConversation };
