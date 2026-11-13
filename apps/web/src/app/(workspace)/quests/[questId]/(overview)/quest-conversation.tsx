import type { JSX } from "react";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { QuestSidebarSection } from "@/components/plan/plan-panel.tsx";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { changeIdeaAction } from "@/ideas/idea-actions.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import type { UserId } from "@/ids.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { readPlanState } from "@/plan/plan-store.ts";
import type { Quest } from "@/quests/store.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { ProgressTimeline } from "./progress-timeline.tsx";
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
  section = "plan",
): Promise<JSX.Element> {
  const conversation = await readQuestConversation(viewer, quest.id);
  if (conversation === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Notice>{QUEST_CONVERSATION_COPY.notStarted}</Notice>
        <StartConversationForm questId={quest.id} />
      </div>
    );
  }
  const [messages, stoppedReplyId, plan, ideas, milestones] = await Promise.all(
    [
      listMessages(viewer, conversation.id),
      readStoppedReply(viewer, conversation.id),
      readPlanState(viewer, quest.id),
      listIdeas(viewer, quest.id),
      listMilestones(viewer, quest.id),
    ],
  );
  let starter: typeof START_THE_DAY | undefined;
  if (quest.dailies && quest.status === "active") {
    starter = START_THE_DAY;
  }
  let initialSection: string | undefined = section;
  if (section === "conversation") {
    initialSection = undefined;
  }
  return (
    <ChatScreen
      header={null}
      initialSection={initialSection}
      sideContent={
        <>
          <QuestSidebarSection value="ideas" name={IDEAS_COPY.heading}>
            <QuestIdeas
              embedded={true}
              questId={quest.id}
              ideas={ideas}
              action={changeIdeaAction}
            />
          </QuestSidebarSection>
          <QuestSidebarSection
            value="progress"
            name={PROGRESS_TIMELINE_COPY.heading}
          >
            <ProgressTimeline milestones={milestones} />
          </QuestSidebarSection>
        </>
      }
      conversation={conversation}
      messages={messages}
      stoppedReplyId={stoppedReplyId}
      viewer={viewer}
      plan={plan}
      starter={starter}
    />
  );
}

export { questConversation };
