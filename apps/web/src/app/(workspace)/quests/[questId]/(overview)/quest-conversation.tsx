import type { JSX } from "react";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { DayGrid } from "@/components/dailies/day-grid.tsx";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { SpellPicker } from "@/components/spell-picker.tsx";
import { StartDay } from "@/components/start-day.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import type { DailiesRecord } from "@/dailies/dailies.ts";
import { readDailiesRecord } from "@/dailies/day-store.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import type { UserId } from "@/ids.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { listNotes } from "@/notes/note-store.ts";
import {
  listQuestPeople,
  type QuestPeople,
} from "@/quests/membership-store.ts";
import type { Quest } from "@/quests/store.ts";
import { listOwnSpells } from "@/spells/own-spell-store.ts";
import { listSpells } from "@/spells/spell.ts";
import { readTasksState } from "@/tasks/tasks-store.ts";
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
        <QuestMembers viewer={viewer} people={people} dailies={quest.dailies} />
      ),
    },
  ];
}

// A quest's one conversation, as viewer sees it, with the quest's sidebar
// beside it: Buckets, whose menu holds Tasks, Ideas, Quick Notes and
// Progress, then Actions, which holds the spell picker, and Members. Opening it marks it read for viewer alone. Reading it spends
// nothing: a quest whose conversation hasn't started, as after the move
// from adventures, offers to start it instead. The active Dailies quest
// offers Start Day, which begins a new day with an empty conversation and
// reopens its done recurring tasks, and shows their streaks and day grid.
// The Dailies quest's days while it is active; undefined in any other quest.
function readRecord(
  quest: Quest,
  viewer: UserId,
): Promise<DailiesRecord | undefined> {
  if (!quest.dailies || quest.status !== "active") {
    return Promise.resolve(undefined);
  }
  return readDailiesRecord(viewer, quest.id);
}

async function questConversation(
  quest: Quest,
  viewer: UserId,
  section = "tasks",
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
    tasks,
    ideas,
    milestones,
    notes,
    ownSpells,
    people,
    record,
  ] = await Promise.all([
    listMessages(viewer, conversation.id),
    readStoppedReply(viewer, conversation.id),
    readTasksState(viewer, quest.id),
    listIdeas(viewer, quest.id),
    listMilestones(viewer, quest.id),
    listNotes(viewer, quest.id),
    listOwnSpells(viewer),
    listQuestPeople(viewer, quest.id),
    readRecord(quest, viewer),
  ]);
  let initialSection: string | undefined = section;
  if (section === "conversation") {
    initialSection = undefined;
  }
  return (
    <ChatScreen
      initialSection={initialSection}
      sideSections={[
        {
          id: "ideas",
          label: IDEAS_COPY.heading,
          content: <QuestIdeas embedded={true} ideas={ideas} />,
          bucket: true,
        },
        {
          id: "notes",
          label: QUEST_NOTES_COPY.heading,
          content: <QuestNotes notes={notes} />,
          bucket: true,
        },
        {
          id: "progress",
          label: PROGRESS_TIMELINE_COPY.heading,
          content: (
            <div className="flex flex-col gap-4">
              <DayGrid />
              <ProgressTimeline milestones={milestones} />
            </div>
          ),
          bucket: true,
        },
        {
          id: "actions",
          label: QUEST_SIDEBAR_COPY.actions,
          content: (
            <div className="flex flex-col gap-3">
              <QuestStatusControls quest={quest} />
              {record !== undefined && (
                <StartDay
                  lastStartedAt={record.days.at(-1)?.startedAt}
                  undoable={record.undoable}
                />
              )}
              <SpellPicker spells={[...listSpells(), ...ownSpells]} />
            </div>
          ),
        },
        ...membersSection(quest, viewer, people),
      ]}
      conversation={conversation}
      messages={messages}
      stoppedReplyId={stoppedReplyId}
      viewer={viewer}
      tasks={tasks}
      dailiesDays={record?.days}
    />
  );
}

export { questConversation };
