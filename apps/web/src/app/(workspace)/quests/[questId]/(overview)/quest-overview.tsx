import Link from "next/link";
import type { JSX } from "react";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { ConversationPanel } from "@/components/conversation-panel.tsx";
import { DayGrid } from "@/components/dailies/day-grid.tsx";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { QuestTasks } from "@/components/quest-tasks.tsx";
import { QuestWorkspace } from "@/components/quest-workspace.tsx";
import { SpellPicker } from "@/components/spell-picker.tsx";
import { StartDay } from "@/components/start-day.tsx";
import { StopSpell } from "@/components/stop-spell.tsx";
import { TaskRows } from "@/components/tasks/task-rows.tsx";
import type { TasksActions } from "@/components/tasks/use-tasks.ts";
import { QuestTimer } from "@/components/timer/quest-timer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { findConversation } from "@/conversations/conversation-store.ts";
import { readDailiesRecord } from "@/dailies/day-store.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import type { UserId } from "@/ids.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { listNotes } from "@/notes/note-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import type { Quest } from "@/quests/store.ts";
import { listOwnSpells } from "@/spells/own-spell-store.ts";
import { getSpell, listSpells } from "@/spells/spell.ts";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { EMPTY_TASKS, nextTask } from "@/tasks/tasks.ts";
import {
  changeTasksAction,
  runChatCommandAction,
  undoTasksChangeAction,
} from "@/tasks/tasks-actions.ts";
import { readTasksState } from "@/tasks/tasks-store.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";
import { QUEST_NOTES_COPY } from "@/ui/copy/notes.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { ProgressTimeline } from "./progress-timeline.tsx";

const SECTIONS = [
  { id: "tasks", label: TASKS_COPY.heading },
  { id: "ideas", label: IDEAS_COPY.heading },
  { id: "notes", label: QUEST_NOTES_COPY.heading },
  { id: "progress", label: QUEST_OVERVIEW_COPY.progress },
  { id: "spells", label: QUEST_OVERVIEW_COPY.spellsAndStatus },
  { id: "members", label: QUEST_MEMBERS_COPY.heading },
  { id: "days", label: QUEST_SIDEBAR_COPY.dayGrid },
] as const;

const TASK_ACTIONS: TasksActions = {
  change: changeTasksAction,
  undo: undoTasksChangeAction,
  command: runChatCommandAction,
};

async function QuestOverview({
  quest,
  viewer,
  section,
}: {
  readonly quest: Quest;
  readonly viewer: UserId;
  readonly section: string | readonly string[] | undefined;
}): Promise<JSX.Element> {
  const sections = SECTIONS.filter(
    (item) => item.id !== "days" || quest.dailies,
  );
  const current = sections.find((item) => item.id === section);
  const path = `/quests/${quest.id}`;
  const [chat, tasks, ideas, notes, milestones, people, record] =
    await Promise.all([
      findConversation(viewer, quest.id),
      readTasksState(viewer, quest.id),
      listIdeas(viewer, quest.id),
      listNotes(viewer, quest.id),
      listMilestones(viewer, quest.id),
      listQuestPeople(viewer, quest.id),
      quest.dailies && readDailiesRecord(viewer, quest.id),
    ]);
  const days = record || undefined;
  let spell: SpellSnapshot | undefined;
  if (chat?.spellStartedAt !== undefined) {
    spell = chat.activeSpell;
    if (spell === undefined && chat.spell !== undefined) {
      spell = getSpell(chat.spell);
    }
  }
  const openTaskCount =
    tasks?.tasks.items.filter((task) => !task.done).length ?? 0;
  const summaries = {
    tasks: QUEST_OVERVIEW_COPY.openTasks(openTaskCount),
    ideas: QUEST_OVERVIEW_COPY.saved(ideas.length),
    notes: QUEST_OVERVIEW_COPY.saved(notes.length),
    progress: QUEST_OVERVIEW_COPY.milestones(milestones.length),
    spells: `${spell?.name ?? QUEST_OVERVIEW_COPY.noSpell} · ${QUEST_STATUS_COPY.labels[quest.status]}`,
    members: QUEST_OVERVIEW_COPY.people(1 + (people?.members.length ?? 0)),
    days: undefined,
  };
  let content: JSX.Element | false;
  switch (current?.id) {
    case "tasks":
      content = <TaskRows />;
      break;
    case "ideas":
      content = <QuestIdeas questId={quest.id} embedded={true} ideas={ideas} />;
      break;
    case "notes":
      content = <QuestNotes quest={quest} notes={notes} />;
      break;
    case "progress":
      content = <ProgressTimeline milestones={milestones} />;
      break;
    case "members":
      content = people !== undefined && (
        <QuestMembers quest={quest} viewer={viewer} people={people} />
      );
      break;
    case "spells": {
      const ownSpells = await listOwnSpells(viewer);
      content = (
        <>
          <h3 className="font-heading text-lg">{QUEST_SIDEBAR_COPY.spells}</h3>
          <SpellPicker
            questId={quest.id}
            spells={[...listSpells(), ...ownSpells]}
            activeSpell={spell}
          />
          <h3 className="font-heading text-lg">{QUEST_SIDEBAR_COPY.status}</h3>
          <QuestStatusControls quest={quest} />
        </>
      );
      break;
    }
    case "days":
      content = <DayGrid />;
      break;
    default:
      content = (
        <>
          {quest.dailies === false && (
            <section
              className="quest-next-task"
              aria-label={QUEST_SIDEBAR_COPY.nextTask}
            >
              <h3 className="text-muted text-sm">
                {QUEST_SIDEBAR_COPY.nextTask}
              </h3>
              <p className="wrap-anywhere font-heading text-lg">
                {nextTask(tasks?.tasks ?? EMPTY_TASKS)?.text ??
                  QUEST_SIDEBAR_COPY.noNextTask}
              </p>
            </section>
          )}
          {days !== undefined && quest.status === "active" && (
            <StartDay
              questId={quest.id}
              chatId={chat?.id}
              lastStartedAt={days.days.at(-1)?.startedAt}
              undoable={days.undoable}
            />
          )}
          {quest.dailies && quest.status !== "active" && (
            <p className="text-muted">{QUEST_SIDEBAR_COPY.restoreDay}</p>
          )}
          <nav aria-label={QUEST_OVERVIEW_COPY.sections}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {sections.map(({ id, label }) => (
                <li key={id}>
                  <Link
                    className="quest-overview-link flex flex-col justify-center rounded-control border border-line bg-field px-3 py-2 hover:text-primary"
                    href={`${path}?section=${id}`}
                  >
                    <strong>{label}</strong>
                    <span className="wrap-anywhere text-muted text-sm">
                      {summaries[id]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      );
  }
  let conversation: JSX.Element | undefined;
  if (chat !== undefined && spell !== undefined) {
    const [messages, stoppedReplyId] = await Promise.all([
      listMessages(viewer, chat.id, chat.spellStartedAt),
      readStoppedReply(viewer, chat.id, chat.spellStartedAt),
    ]);
    conversation = (
      <section
        aria-label={QUEST_OVERVIEW_COPY.conversation}
        className="workspace-content"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-heading">
            {QUEST_OVERVIEW_COPY.conversation}
          </h2>
          <StopSpell questId={quest.id} name={spell.name} />
        </div>
        <ChatScreen
          conversation={chat}
          messages={messages}
          stoppedReplyId={stoppedReplyId}
          viewer={viewer}
          workspace={true}
        />
      </section>
    );
  }
  return (
    <ConversationPanel
      title={TIMER_COPY.heading}
      labels={TIMER_COPY.panel}
      panel={<QuestTimer />}
    >
      <QuestTasks
        key={quest.id}
        questId={quest.id}
        state={tasks}
        days={days?.days}
        actions={TASK_ACTIONS}
      >
        <QuestWorkspace conversation={conversation}>
          {current !== undefined && (
            <Button asChild={true} variant="quiet" className="self-start">
              <Link href={path}>{QUEST_OVERVIEW_COPY.back}</Link>
            </Button>
          )}
          <h2 className="section-heading">
            {current?.label ?? QUEST_OVERVIEW_COPY.heading}
          </h2>
          {quest.status !== "active" && (
            <Notice>{QUEST_STATUS_COPY.effects}</Notice>
          )}
          {content}
        </QuestWorkspace>
      </QuestTasks>
    </ConversationPanel>
  );
}

export { QuestOverview };
