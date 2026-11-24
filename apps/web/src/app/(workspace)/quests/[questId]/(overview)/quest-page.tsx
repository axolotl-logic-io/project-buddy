import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import { ConstructAvatar } from "@/components/constructs/construct-visual.tsx";
import { DayGrid } from "@/components/dailies/day-grid.tsx";
import { ListItems } from "@/components/list-items.tsx";
import { ListSettings } from "@/components/list-settings.tsx";
import { LocalTime } from "@/components/local-time.tsx";
import { NextTask } from "@/components/next-task.tsx";
import {
  MessageComposer,
  PerformRite,
} from "@/components/performance-controls.tsx";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestPerformances } from "@/components/quest-performances.tsx";
import { QuestSharingMark } from "@/components/quest-sharing-mark.tsx";
import { QuestSidePanel } from "@/components/quest-side-panel.tsx";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import { StartDay } from "@/components/start-day.tsx";
import { QuestTimer } from "@/components/timer/quest-timer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { getConstruct } from "@/constructs/index.ts";
import type { DailiesRecord } from "@/dailies/dailies.ts";
import {
  readQuestDays,
  readRecurringTasks,
} from "@/dailies/quest-day-store.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { LIST_ID } from "@/lists/list.ts";
import { readListItems, readNextTask } from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import {
  listPerformances,
  readPerformanceMessages,
} from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { listRites } from "@/rites/rite-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

const SECTION = z.enum(["members", "days", "rites", "performances"]);
type Section = z.infer<typeof SECTION>;

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
  lists: readonly List[],
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
        lists={lists}
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

function dailiesRecord(
  user: UserId,
  quest: Quest,
): Promise<DailiesRecord | undefined> {
  if (quest.dailies) {
    return readQuestDays(user, quest.id);
  }
  return Promise.resolve(undefined);
}

async function questPage(
  viewer: User,
  questId: string,
  section: unknown,
  performanceParam?: unknown,
): Promise<JSX.Element | undefined> {
  const user = viewer.id;
  const quest = await getQuest(user, questId);
  if (quest === undefined) {
    return undefined;
  }
  const [people, record, lists, performances] = await Promise.all([
    listQuestPeople(user, quest.id),
    dailiesRecord(user, quest),
    readLists(user, quest.id),
    listPerformances(user, quest.id),
  ]);
  const listId = LIST_ID.safeParse(section).data;
  const list = lists.find(({ id }) => id === listId);
  let contents: Awaited<ReturnType<typeof readListItems>> = [];
  if (list !== undefined) {
    contents = await readListItems(user, quest.id, list.id);
  }
  const running = performances.find(({ endedAt }) => endedAt === null);
  const selected = performances.find(({ id }) => id === performanceParam);
  const construct = getConstruct(quest.constructId);
  let runningContent: ReactNode;
  if (running !== undefined) {
    const entries = await readPerformanceMessages(user, running.id);
    runningContent = (
      <section aria-label={running.rite.name} className="quest-section-body">
        <h2 className="section-heading">{running.rite.name}</h2>
        <MessageComposer
          key={running.id}
          questId={quest.id}
          performanceId={running.id}
          viewer={user}
          author={viewer.name ?? PERFORMANCE_COPY.unnamed}
          construct={construct}
          answered={entries.map(({ id }) => id)}
        >
          <PerformanceTranscript
            performance={running}
            entries={entries}
            construct={construct}
          />
        </MessageComposer>
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
          entries={await readPerformanceMessages(user, selected.id)}
          construct={construct}
        />
      );
    }
  }
  const today = new Date();
  let current = SECTION.safeParse(section).data;
  if (current === "days" && !quest.dailies) {
    current = undefined;
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
          lists={lists}
        />
        <h3 className="section-heading">{QUEST_OVERVIEW_COPY.status}</h3>
        <QuestStatusControls quest={quest} />
      </section>
    );
  }
  const onOverview =
    current === undefined &&
    list === undefined &&
    section !== "performances" &&
    section !== "rites";
  let nextTask: Awaited<ReturnType<typeof readNextTask>>;
  if (onOverview && !quest.dailies) {
    nextTask = await readNextTask(user, quest.id);
  }
  let dayGrid: JSX.Element | undefined;
  if (current === "days" && record !== undefined) {
    dayGrid = (
      <DayGrid
        days={record.days}
        tasks={await readRecurringTasks(user, quest.id)}
      />
    );
  }
  return (
    <QuestSidePanel
      title={TIMER_COPY.heading}
      icon="hourglass"
      labels={TIMER_COPY.panel}
      panel={<QuestTimer />}
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
                <ConstructAvatar construct={construct} />
              </div>
              {quest.startingContext !== undefined &&
                quest.startingContext !== "" && (
                  <p className="quest-overview-summary">
                    {quest.startingContext}
                  </p>
                )}
              {quest.dailies === true &&
                dayControls(quest, record, today, lists)}
              {!quest.dailies && <NextTask task={nextTask} />}
            </section>
          )}
          {quest.status !== "active" && (
            <Notice>{QUEST_STATUS_COPY.effects}</Notice>
          )}
          {onOverview === true && (
            <>
              <nav aria-label={LISTS_COPY.heading}>
                <h2 className="section-heading">{LISTS_COPY.heading}</h2>
                <ul className="quest-overview-links">
                  {lists.map((entry) => (
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
                <ListSettings questId={quest.id} />
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
              <Link
                href={sectionPath(quest.id, "members")}
                className="quest-overview-link"
              >
                {QUEST_MEMBERS_COPY.heading}
              </Link>
            </>
          )}
          {list !== undefined && (
            <section className="quest-section-body" aria-label={list.name}>
              <Button asChild={true} variant="quiet">
                <Link href={sectionPath(quest.id)}>
                  <Icon name="arrow-left" />
                  {QUEST_OVERVIEW_COPY.back}
                </Link>
              </Button>
              <h2 className="quest-overview-title">{list.name}</h2>
              <ListItems
                key={list.id}
                list={list}
                questId={quest.id}
                contents={contents}
                days={record?.days}
                destinations={lists.filter(({ id }) => id !== list.id)}
              />
              <ListSettings key={list.id} questId={quest.id} list={list} />
            </section>
          )}
          {current !== undefined && (
            <Button asChild={true} variant="quiet">
              <Link href={sectionPath(quest.id)}>
                <Icon name="arrow-left" />
                {QUEST_OVERVIEW_COPY.back}
              </Link>
            </Button>
          )}
          {current === "members" && people !== undefined && (
            <QuestMembers viewer={user} people={people} quest={quest} />
          )}
          {dayGrid}
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
    </QuestSidePanel>
  );
}

export { questPage };
