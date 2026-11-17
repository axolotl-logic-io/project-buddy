import type { JSX } from "react";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { DailiesPanel } from "@/components/dailies-panel.tsx";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { QuestPanel } from "@/components/quest-panel.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { SpellPicker } from "@/components/spell-picker.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
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

// Only an Active Dailies quest exposes day controls. The persisted mark,
// independent of the editable name, also selects its panel composition below.
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
  const sections: WorkspaceSection[] = [
    {
      id: "ideas",
      label: IDEAS_COPY.heading,
      icon: <Icon name="sparkle" />,
      description: IDEAS_COPY.bucketIntro,
      content: <QuestIdeas embedded={true} ideas={ideas} />,
      bucket: true,
    },
    {
      id: "notes",
      label: QUEST_NOTES_COPY.heading,
      icon: <Icon name="note" />,
      description: QUEST_NOTES_COPY.bucketIntro,
      content: <QuestNotes notes={notes} quest={quest} />,
      bucket: true,
    },
    {
      id: "progress",
      label: PROGRESS_TIMELINE_COPY.heading,
      content: <ProgressTimeline milestones={milestones} />,
      bucket: true,
    },
    {
      id: "actions",
      label: QUEST_SIDEBAR_COPY.actions,
      content: (
        <div className="flex flex-col gap-3">
          <QuestStatusControls quest={quest} />
          <SpellPicker spells={[...listSpells(), ...ownSpells]} />
        </div>
      ),
    },
    ...membersSection(quest, viewer, people),
  ];
  let panel = (
    <QuestPanel sections={sections} initialSection={initialSection} />
  );
  let panelTitle: string = QUEST_SIDEBAR_COPY.quest;
  if (quest.dailies) {
    panel = (
      <DailiesPanel
        sections={sections}
        record={record}
        initialSection={initialSection}
      />
    );
    panelTitle = QUEST_SIDEBAR_COPY.dailies;
  }
  return (
    <ChatScreen
      initialSection={initialSection}
      panel={panel}
      panelTitle={panelTitle}
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
