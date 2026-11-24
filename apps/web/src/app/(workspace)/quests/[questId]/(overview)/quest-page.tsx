import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import { ConstructAvatar } from "@/components/constructs/construct-visual.tsx";
import { DayGrid } from "@/components/day-grid.tsx";
import { ListItems } from "@/components/list-items.tsx";
import { ListSettings } from "@/components/list-settings.tsx";
import { NextTask } from "@/components/next-task.tsx";
import {
  MessageComposer,
  PerformRite,
} from "@/components/performance-controls.tsx";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestSharingMark } from "@/components/quest-sharing-mark.tsx";
import { QuestSidePanel } from "@/components/quest-side-panel.tsx";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import { QuestTimer } from "@/components/timer/quest-timer.tsx";
import { TodayTasks } from "@/components/today-tasks.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { getConstruct } from "@/constructs/index.ts";
import type { QuestId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import {
  countListItems,
  readListItems,
  readNextTasks,
} from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import {
  listPerformances,
  readPerformanceMessages,
} from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest } from "@/quests/store.ts";
import { listRites } from "@/rites/rite-store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

const SECTION = z.enum(["members", "days"]);
type Section = z.infer<typeof SECTION>;

// How many open tasks the overview names: the next task and those after it.
const NEXT_TASKS = 3;

function sectionPath(id: QuestId, section?: Section | ListId): Route {
  if (section === undefined) {
    return `/quests/${id}`;
  }
  return `/quests/${id}?section=${section}`;
}

async function questPage(
  viewer: User,
  questId: string,
  section: unknown,
): Promise<JSX.Element | undefined> {
  const user = viewer.id;
  const quest = await getQuest(user, questId);
  if (quest === undefined) {
    return undefined;
  }
  const [people, history, lists, performances] = await Promise.all([
    listQuestPeople(user, quest.id),
    readTaskHistory(user, quest.id),
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
  const current = SECTION.safeParse(section).data;

  const onOverview = current === undefined && list === undefined;
  let overview: JSX.Element | undefined;
  if (onOverview) {
    const [next, counts, rites, recurring] = await Promise.all([
      readNextTasks(user, quest.id, NEXT_TASKS),
      countListItems(user, quest.id),
      listRites(user),
      readRecurringTasks(user, quest.id),
    ]);
    let membersLabel: string = QUEST_MEMBERS_COPY.heading;
    if (people !== undefined) {
      membersLabel = QUEST_OVERVIEW_COPY.members(1 + people.members.length);
    }
    overview = (
      <>
        <section className="quest-focus-head" aria-label={quest.name}>
          <div className="min-w-0">
            <p className="quest-overview-meta">
              <span>{QUEST_OVERVIEW_COPY.quest}</span>
              <span className="quest-status-mark">
                {QUEST_STATUS_COPY.labels[quest.status]}
              </span>
              {quest.sharing.kind === "private" && (
                <span>{QUEST_OVERVIEW_COPY.private}</span>
              )}
              <QuestSharingMark sharing={quest.sharing} />
            </p>
            <h2
              data-quest-overview-heading=""
              className="quest-focus-title"
              tabIndex={-1}
            >
              {quest.name}
            </h2>
            {quest.startingContext !== undefined &&
              quest.startingContext !== "" && (
                <p className="quest-overview-summary">
                  {quest.startingContext}
                </p>
              )}
          </div>
          <ConstructAvatar construct={construct} />
        </section>
        {quest.status !== "active" && (
          <Notice>{QUEST_STATUS_COPY.effects}</Notice>
        )}
        <NextTask questId={quest.id} tasks={next} />
        {history !== undefined && recurring.length > 0 && (
          <TodayTasks questId={quest.id} history={history} tasks={recurring} />
        )}
        {runningContent ?? (
          <section
            aria-label={QUEST_OVERVIEW_COPY.performRite}
            className="quest-section-body"
          >
            <h3 className="quest-overview-label">
              {QUEST_OVERVIEW_COPY.performRite}
            </h3>
            <PerformRite questId={quest.id} rites={rites} lists={lists} />
          </section>
        )}
        <nav aria-label={LISTS_COPY.heading} className="quest-section-body">
          <h3 className="sr-only">{LISTS_COPY.heading}</h3>
          <ul className="quest-list-rows">
            {lists.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={sectionPath(quest.id, entry.id)}
                  className="quest-list-row"
                >
                  <span className="wrap-anywhere">{entry.name}</span>
                  <span className="text-muted text-sm">
                    {QUEST_OVERVIEW_COPY.listSize(
                      entry.type,
                      counts.get(entry.id) ?? { total: 0, open: 0 },
                    )}
                  </span>
                  <Icon name="chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
          <ListSettings questId={quest.id} />
        </nav>
        <details
          className="quest-section-body quest-settings"
          open={quest.status !== "active"}
        >
          <summary>{QUEST_OVERVIEW_COPY.settings}</summary>
          <ul className="quest-list-rows">
            <li>
              <Link
                href={sectionPath(quest.id, "members")}
                className="quest-list-row"
              >
                <span>{membersLabel}</span>
                <Icon name="chevron-right" />
              </Link>
            </li>
            <li>
              <Link
                href={sectionPath(quest.id, "days")}
                className="quest-list-row"
              >
                <span>{QUEST_SIDEBAR_COPY.dayGrid}</span>
                <Icon name="chevron-right" />
              </Link>
            </li>
          </ul>
          <h4 className="font-semibold">{QUEST_OVERVIEW_COPY.status}</h4>
          <QuestStatusControls quest={quest} />
        </details>
      </>
    );
  }
  let dayGrid: JSX.Element | undefined;
  if (current === "days" && history !== undefined) {
    dayGrid = (
      <section aria-label={QUEST_SIDEBAR_COPY.dayGrid}>
        <DayGrid
          history={history}
          tasks={await readRecurringTasks(user, quest.id)}
        />
      </section>
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
          {overview}
          {quest.status !== "active" && !onOverview && (
            <Notice>{QUEST_STATUS_COPY.effects}</Notice>
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
                history={history}
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
          {!onOverview && runningContent}
        </QuestStatusFeedback>
      </div>
    </QuestSidePanel>
  );
}

export { questPage };
