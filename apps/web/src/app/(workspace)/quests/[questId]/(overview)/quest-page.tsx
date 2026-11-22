import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { z } from "zod";
import { listMessages, readStoppedReply } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { ConstructAvatar } from "@/components/constructs/construct-visual.tsx";
import { ConversationPanel } from "@/components/conversation-panel.tsx";
import { DayGrid } from "@/components/dailies/day-grid.tsx";
import { LocalTime } from "@/components/local-time.tsx";
import { NextTask } from "@/components/next-task.tsx";
import { Conjure, PerformRite } from "@/components/performance-controls.tsx";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { QuestPerformances } from "@/components/quest-performances.tsx";
import { QuestSharingMark } from "@/components/quest-sharing-mark.tsx";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import { QuestTasks } from "@/components/quest-tasks.tsx";
import { SpaceMurmlings } from "@/components/space-murmlings.tsx";
import { SpaceSettings } from "@/components/space-settings.tsx";
import { SpellPicker } from "@/components/spell-picker.tsx";
import { StartDay } from "@/components/start-day.tsx";
import { TaskRows } from "@/components/tasks/task-rows.tsx";
import type { TasksActions } from "@/components/tasks/use-tasks.ts";
import { QuestTimer } from "@/components/timer/quest-timer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import { findConversation } from "@/conversations/conversation-store.ts";
import type { DailiesRecord } from "@/dailies/dailies.ts";
import { readDailiesRecord } from "@/dailies/day-store.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { listNotes } from "@/notes/note-store.ts";
import {
  listPerformances,
  readConjurations,
} from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { listRites } from "@/rites/rite-store.ts";
import { listMurmlings } from "@/spaces/murmling-store.ts";
import { SPACE_ID } from "@/spaces/space.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { listOwnSpells } from "@/spells/own-spell-store.ts";
import { getSpell, listSpells } from "@/spells/spell.ts";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { doneTasks, EMPTY_TASKS, openTasks } from "@/tasks/tasks.ts";
import {
  changeTasksAction,
  runChatCommandAction,
  undoTasksChangeAction,
} from "@/tasks/tasks-actions.ts";
import { readTasksState } from "@/tasks/tasks-store.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";
import { QUEST_NOTES_COPY } from "@/ui/copy/notes.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { ProgressTimeline } from "./progress-timeline.tsx";

const SECTION = z.enum([
  "tasks",
  "ideas",
  "notes",
  "progress",
  "spells",
  "members",
  "days",
]);
type Section = z.infer<typeof SECTION>;

interface SectionLink {
  readonly label: string;
  readonly icon: Parameters<typeof Icon>[0]["name"];
  readonly summary: string;
  readonly content: ReactNode;
}

const TASK_ACTIONS: TasksActions = {
  change: changeTasksAction,
  undo: undoTasksChangeAction,
  command: runChatCommandAction,
};

function sectionPath(id: QuestId, section?: Section): Route {
  if (section === undefined) {
    return `/quests/${id}`;
  }
  return `/quests/${id}?section=${section}`;
}

function dayControls(
  quest: Quest,
  record: DailiesRecord | undefined,
  today: Date,
  chatId: ChatId | undefined,
): JSX.Element {
  const gridLink = (
    <Button asChild={true} variant="quiet">
      <Link href={sectionPath(quest.id, "days")}>
        {QUEST_SIDEBAR_COPY.dayGrid}
        <Icon name="chevron-right" />
      </Link>
    </Button>
  );
  let controls = (
    <>
      <p className="text-muted">{QUEST_SIDEBAR_COPY.restoreDay}</p>
      {gridLink}
    </>
  );
  if (quest.status === "active") {
    controls = (
      <StartDay
        questId={quest.id}
        chatId={chatId}
        lastStartedAt={record?.days.at(-1)?.startedAt}
        undoable={record?.undoable === true}
      >
        {gridLink}
      </StartDay>
    );
  }
  return (
    <section
      aria-label={QUEST_SIDEBAR_COPY.day}
      className="quest-overview-feature"
    >
      <h3 className="quest-overview-label">{QUEST_OVERVIEW_COPY.day}</h3>
      <p className="font-heading font-semibold text-lg">
        <LocalTime dateTime={today} detail="day" />
      </p>
      {controls}
    </section>
  );
}

function sectionLinks(
  id: QuestId,
  sections: Record<Section, SectionLink>,
): JSX.Element {
  return (
    <nav aria-label={QUEST_OVERVIEW_COPY.sections}>
      <h2 className="section-heading">{QUEST_OVERVIEW_COPY.sections}</h2>
      <ul className="quest-overview-links">
        {SECTION.options
          .filter((section) => section !== "days")
          .map((section) => {
            const { icon, label, summary } = sections[section];
            return (
              <li key={section}>
                <Link
                  href={sectionPath(id, section)}
                  className="quest-overview-link"
                >
                  <Icon name={icon} />
                  <span className="min-w-0">
                    <strong className="font-heading text-lg">{label}</strong>
                    <span className="block text-muted text-sm">{summary}</span>
                  </span>
                  <Icon name="chevron-right" />
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}

async function questPage(
  user: UserId,
  questId: string,
  section: unknown,
  performanceParam?: unknown,
): Promise<JSX.Element | undefined> {
  const quest = await getQuest(user, questId);
  if (quest === undefined) {
    return undefined;
  }
  const [conversation, tasks, ideas, notes, milestones, people, days, spaces] =
    await Promise.all([
      findConversation(user, quest.id),
      readTasksState(user, quest.id),
      listIdeas(user, quest.id),
      listNotes(user, quest.id),
      listMilestones(user, quest.id),
      listQuestPeople(user, quest.id),
      quest.dailies && readDailiesRecord(user, quest.id),
      listSpaces(user, quest.id),
    ]);
  const spaceId = SPACE_ID.safeParse(section).data;
  const space = spaces.find(({ id }) => id === spaceId);
  let contents: Awaited<ReturnType<typeof listMurmlings>> = [];
  if (space !== undefined) {
    contents = await listMurmlings(user, quest.id, space.id);
  }
  const performances = await listPerformances(user, quest.id);
  const running = performances.find(({ endedAt }) => endedAt === null);
  const selected = performances.find(({ id }) => id === performanceParam);
  const construct =
    conversation?.construct ?? getConstruct(DEFAULT_CONSTRUCT_ID);
  let runningContent: ReactNode;
  if (running !== undefined) {
    runningContent = (
      <section aria-label={running.rite.name} className="quest-section-body">
        <h2 className="section-heading">{running.rite.name}</h2>
        <PerformanceTranscript
          performance={running}
          entries={await readConjurations(user, running.id)}
          construct={construct}
        />
        <Conjure
          key={running.id}
          questId={quest.id}
          performanceId={running.id}
        />
      </section>
    );
  }
  let historyContent: ReactNode;
  if (section === "performances") {
    historyContent = (
      <QuestPerformances questId={quest.id} performances={performances} />
    );
    if (selected !== undefined) {
      historyContent = (
        <PerformanceTranscript
          performance={selected}
          entries={await readConjurations(user, selected.id)}
          construct={construct}
        />
      );
    }
  }
  const record = days || undefined;
  const today = new Date();
  let current = SECTION.safeParse(section).data;
  if (current === "days" && !quest.dailies) {
    current = undefined;
  }

  let spell: SpellSnapshot | undefined;
  if (conversation?.spellStartedAt !== undefined) {
    spell = conversation.activeSpell;
    if (spell === undefined && conversation.spell !== undefined) {
      spell = getSpell(conversation.spell);
    }
  }
  let active: JSX.Element | undefined;
  if (conversation !== undefined && spell !== undefined) {
    const [messages, stoppedReplyId] = await Promise.all([
      listMessages(user, conversation.id, conversation.spellStartedAt),
      readStoppedReply(user, conversation.id, conversation.spellStartedAt),
    ]);
    active = (
      <ChatScreen
        conversation={conversation}
        messages={messages}
        stoppedReplyId={stoppedReplyId}
        viewer={user}
        spellOnly={true}
      />
    );
  }

  let spellSummary = QUEST_OVERVIEW_COPY.spellOptions;
  if (spell !== undefined) {
    spellSummary = QUEST_OVERVIEW_COPY.activeSpell(spell.name);
  }
  let membersSummary = QUEST_OVERVIEW_COPY.onlyYou;
  if (people !== undefined && people.members.length > 0) {
    membersSummary = QUEST_OVERVIEW_COPY.people(people.members.length + 1);
  }

  let riteContent: ReactNode;
  if (section === "rites") {
    riteContent = (
      <section
        aria-label={PERFORMANCE_COPY.ritesAndStatus}
        className="quest-section-body"
      >
        <h2 className="section-heading">{PERFORMANCE_COPY.ritesAndStatus}</h2>
        <PerformRite
          questId={quest.id}
          rites={await listRites(user)}
          spaces={spaces}
        />
        <h3 className="section-heading">{QUEST_OVERVIEW_COPY.status}</h3>
        <QuestStatusControls quest={quest} />
      </section>
    );
  }
  const onOverview =
    current === undefined &&
    space === undefined &&
    section !== "performances" &&
    section !== "rites";
  const shownTasks = tasks?.tasks ?? EMPTY_TASKS;
  let spellsContent: ReactNode;
  if (current === "spells") {
    const own = await listOwnSpells(user);
    spellsContent = (
      <>
        <h3 data-quest-spells="" tabIndex={-1} className="section-heading">
          {QUEST_SIDEBAR_COPY.spells}
        </h3>
        <SpellPicker
          questId={quest.id}
          spells={[...listSpells(), ...own]}
          activeSpell={spell}
        />
        <h3 className="section-heading">{QUEST_OVERVIEW_COPY.status}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="quest-status-mark">
            {QUEST_STATUS_COPY.labels[quest.status]}
          </span>
          <QuestStatusControls quest={quest} />
        </div>
      </>
    );
  }
  const sections: Record<Section, SectionLink> = {
    tasks: {
      label: TASKS_COPY.heading,
      icon: "checklist",
      summary: QUEST_OVERVIEW_COPY.tasks(
        openTasks(shownTasks).length,
        doneTasks(shownTasks).length,
      ),
      content: <TaskRows />,
    },
    ideas: {
      label: IDEAS_COPY.heading,
      icon: "sparkle",
      summary: QUEST_OVERVIEW_COPY.ideas(ideas.length),
      content: <QuestIdeas questId={quest.id} ideas={ideas} embedded={true} />,
    },
    notes: {
      label: QUEST_NOTES_COPY.heading,
      icon: "note",
      summary: QUEST_OVERVIEW_COPY.notes(notes.length),
      content: <QuestNotes notes={notes} quest={quest} />,
    },
    progress: {
      label: QUEST_OVERVIEW_COPY.progressLabel,
      icon: "flag",
      summary: QUEST_OVERVIEW_COPY.progress(milestones.length),
      content: <ProgressTimeline milestones={milestones} questId={quest.id} />,
    },
    spells: {
      label: QUEST_OVERVIEW_COPY.spells,
      icon: "sparkle",
      summary: spellSummary,
      content: spellsContent,
    },
    members: {
      label: QUEST_MEMBERS_COPY.heading,
      icon: "people",
      summary: membersSummary,
      content: people !== undefined && (
        <QuestMembers viewer={user} people={people} quest={quest} />
      ),
    },
    days: {
      label: QUEST_SIDEBAR_COPY.dayGrid,
      icon: "sun",
      summary: "",
      content: <DayGrid />,
    },
  };
  return (
    <ConversationPanel
      title={TIMER_COPY.heading}
      icon="hourglass"
      labels={TIMER_COPY.panel}
      panel={<QuestTimer />}
    >
      <QuestTasks
        key={quest.id}
        questId={quest.id}
        state={tasks}
        days={record?.days}
        actions={TASK_ACTIONS}
      >
        <div className="quest-workspace quest-overview">
          <QuestStatusFeedback>
            {onOverview === true && (
              <section className="quest-overview-hero" aria-label={quest.name}>
                <div className="quest-overview-heading">
                  <div className="min-w-0">
                    <div className="quest-overview-meta">
                      <span className="quest-status-mark">
                        {QUEST_STATUS_COPY.labels[quest.status]}
                      </span>
                      {quest.sharing.kind === "personal" && (
                        <span>{QUEST_OVERVIEW_COPY.personal}</span>
                      )}
                      <QuestSharingMark sharing={quest.sharing} />
                    </div>
                    <h2
                      data-quest-overview-heading=""
                      className="quest-overview-title"
                      tabIndex={-1}
                    >
                      {quest.name}
                    </h2>
                  </div>
                  {conversation !== undefined && (
                    <ConstructAvatar construct={conversation.construct} />
                  )}
                </div>
                {quest.startingContext !== undefined &&
                  quest.startingContext !== "" && (
                    <p className="quest-overview-summary">
                      {quest.startingContext}
                    </p>
                  )}
                {quest.dailies === true &&
                  dayControls(quest, record, today, conversation?.id)}
                {!quest.dailies && <NextTask />}
              </section>
            )}
            {current !== undefined && (
              <div>
                <Button asChild={true} variant="quiet">
                  <Link href={sectionPath(quest.id)}>
                    <Icon name="arrow-left" />
                    {QUEST_OVERVIEW_COPY.back}
                  </Link>
                </Button>
                <h2
                  data-quest-overview-heading=""
                  tabIndex={-1}
                  className="quest-overview-title"
                >
                  {sections[current].label}
                </h2>
              </div>
            )}
            {quest.status !== "active" && (
              <Notice>{QUEST_STATUS_COPY.effects}</Notice>
            )}
            {active}
            {onOverview === true && (
              <>
                <nav aria-label={SPACES_COPY.heading}>
                  <h2 className="section-heading">{SPACES_COPY.heading}</h2>
                  <ul className="quest-overview-links">
                    {spaces.map((entry) => (
                      <li key={entry.id}>
                        <Link
                          href={`/quests/${quest.id}?section=${entry.id}`}
                          className="quest-overview-link"
                        >
                          {entry.name}
                          <Icon name="chevron-right" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <SpaceSettings questId={quest.id} />
                </nav>
                <ul className="quest-overview-links">
                  <li>
                    <Link
                      href={`/quests/${quest.id}?section=rites`}
                      className="quest-overview-link"
                    >
                      {PERFORMANCE_COPY.ritesAndStatus}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/quests/${quest.id}?section=performances`}
                      className="quest-overview-link"
                    >
                      {PERFORMANCE_COPY.heading}
                    </Link>
                  </li>
                </ul>
                {sectionLinks(quest.id, sections)}
              </>
            )}
            {space !== undefined && (
              <section className="quest-section-body" aria-label={space.name}>
                <Button asChild={true} variant="quiet">
                  <Link href={sectionPath(quest.id)}>
                    <Icon name="arrow-left" />
                    {QUEST_OVERVIEW_COPY.back}
                  </Link>
                </Button>
                <h2 className="quest-overview-title">{space.name}</h2>
                <SpaceMurmlings
                  key={space.id}
                  space={space}
                  questId={quest.id}
                  contents={contents}
                  destinations={spaces.filter(({ id }) => id !== space.id)}
                />
                <SpaceSettings
                  key={space.id}
                  questId={quest.id}
                  space={space}
                />
              </section>
            )}
            {current !== undefined && (
              <section
                className="quest-section-body"
                aria-label={sections[current].label}
              >
                {sections[current].content}
              </section>
            )}
            {(section === "rites" || section === "performances") && (
              <Button asChild={true} variant="quiet">
                <Link href={sectionPath(quest.id)}>
                  {QUEST_OVERVIEW_COPY.back}
                </Link>
              </Button>
            )}
            {riteContent}
            {historyContent !== undefined && (
              <section
                aria-label={PERFORMANCE_COPY.heading}
                className="quest-section-body"
              >
                <h2 className="section-heading">{PERFORMANCE_COPY.heading}</h2>
                {historyContent}
              </section>
            )}
            {section !== "performances" && runningContent}
          </QuestStatusFeedback>
        </div>
      </QuestTasks>
    </ConversationPanel>
  );
}

export { questPage };
