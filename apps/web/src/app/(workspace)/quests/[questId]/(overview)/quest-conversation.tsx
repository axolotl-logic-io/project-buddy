import type { JSX } from "react";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { ResetConversation } from "@/components/reset-conversation.tsx";
import { SpellPicker } from "@/components/spell-picker.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { changeIdeaAction } from "@/ideas/idea-actions.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import type { UserId } from "@/ids.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { deleteNoteAction } from "@/notes/note-actions.ts";
import { listNotes } from "@/notes/note-store.ts";
import { readPlanState } from "@/plan/plan-store.ts";
import {
  inviteToQuestAction,
  removeFromQuestAction,
} from "@/quests/membership-actions.ts";
import {
  listQuestPeople,
  type QuestPeople,
} from "@/quests/membership-store.ts";
import type { Quest } from "@/quests/store.ts";
import { listOwnSpells } from "@/spells/own-spell-store.ts";
import { listSpells } from "@/spells/spell.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { QUEST_NOTES_COPY } from "@/ui/copy/notes.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { ProgressTimeline } from "./progress-timeline.tsx";
import { StartConversationForm } from "./start-conversation-form.tsx";

// The Members section, while the quest is open to viewer.
function membersSection(
  quest: Quest,
  viewer: UserId,
  people: QuestPeople | undefined,
): WorkspaceSection[] {
  if (people === undefined) {
    return [];
  }
  return [
    {
      id: "members",
      label: QUEST_MEMBERS_COPY.heading,
      content: (
        <QuestMembers
          questId={quest.id}
          viewer={viewer}
          people={people}
          dailies={quest.dailies}
          invite={inviteToQuestAction}
          remove={removeFromQuestAction}
        />
      ),
    },
  ];
}

// A quest's one conversation, as viewer sees it, with the quest's sidebar
// beside it: Plan, Ideas, Progress, Quick Notes, Members, and Actions,
// which holds the spell picker. Opening it marks it read for viewer alone. Reading it spends
// nothing: a quest whose conversation hasn't started, as after the move
// from adventures, offers to start it instead. The Dailies quest offers
// Reset Day, which clears the conversation and reopens Plan steps.
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
  const [
    messages,
    stoppedReplyId,
    plan,
    ideas,
    milestones,
    notes,
    ownSpells,
    people,
  ] = await Promise.all([
    listMessages(viewer, conversation.id),
    readStoppedReply(viewer, conversation.id),
    readPlanState(viewer, quest.id),
    listIdeas(viewer, quest.id),
    listMilestones(viewer, quest.id),
    listNotes(viewer, quest.id),
    listOwnSpells(viewer),
    listQuestPeople(viewer, quest.id),
  ]);
  let initialSection: string | undefined = section;
  if (section === "conversation") {
    initialSection = undefined;
  }
  let header: JSX.Element | null = null;
  if (quest.dailies && quest.status === "active") {
    header = (
      <header className="chat-header">
        <div className="conversation-header">
          <AdventureCharacterHeader
            construct={conversation.construct}
            destination={{ kind: "adventure", id: conversation.id }}
          />
        </div>
      </header>
    );
  }
  return (
    <ChatScreen
      header={header}
      initialSection={initialSection}
      sideSections={[
        {
          id: "ideas",
          label: IDEAS_COPY.heading,
          content: (
            <QuestIdeas
              embedded={true}
              questId={quest.id}
              ideas={ideas}
              action={changeIdeaAction}
            />
          ),
        },
        {
          id: "progress",
          label: PROGRESS_TIMELINE_COPY.heading,
          content: <ProgressTimeline milestones={milestones} />,
        },
        {
          id: "notes",
          label: QUEST_NOTES_COPY.heading,
          content: (
            <QuestNotes
              questId={quest.id}
              notes={notes}
              action={deleteNoteAction}
            />
          ),
        },
        ...membersSection(quest, viewer, people),
        {
          id: "actions",
          label: QUEST_SIDEBAR_COPY.actions,
          content: (
            <div className="flex flex-col gap-3">
              {quest.dailies && quest.status === "active" && (
                <ResetConversation
                  chatId={conversation.id}
                  label={QUEST_CONVERSATION_COPY.resetDay}
                  quest={true}
                />
              )}
              <SpellPicker
                chatId={conversation.id}
                spells={[...listSpells(), ...ownSpells]}
              />
            </div>
          ),
        },
      ]}
      conversation={conversation}
      messages={messages}
      stoppedReplyId={stoppedReplyId}
      viewer={viewer}
      plan={plan}
    />
  );
}

export { questConversation };
