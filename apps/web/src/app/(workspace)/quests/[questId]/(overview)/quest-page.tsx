import type { Route } from "next";
import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import { DayGrid } from "@/components/day-grid.tsx";
import { ListPage } from "@/components/list-page.tsx";
import { MessageComposer } from "@/components/performance-controls.tsx";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import { QuestFolio } from "@/components/quest-folio.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestPanel } from "@/components/quest-panel.tsx";
import { QuestSharingMark } from "@/components/quest-sharing-mark.tsx";
import { QuestSidePanel } from "@/components/quest-side-panel.tsx";
import {
  QuestStatusControls,
  QuestStatusFeedback,
} from "@/components/quest-status-controls.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { getConstruct } from "@/constructs/index.ts";
import type { QuestId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import { readListItems, readNextTasks } from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import {
  listPerformances,
  readPerformanceMessages,
} from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { listRites } from "@/rites/rite-store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import { readQuestTallies } from "@/tallies/tally-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const SECTION = z.enum(["settings", "members", "days"]);
type Section = z.infer<typeof SECTION>;

function sectionPath(id: QuestId, section?: Section | ListId): Route {
  if (section === undefined) {
    return `/quests/${id}`;
  }
  return `/quests/${id}?section=${section}`;
}

// The quest's overview, in the page's frame: its title, status and
// summary, then the add box and each list's section. While a performance
// runs it comes after the title, and the sections have no rite button.
async function overviewOf({
  user,
  quest,
  lists,
  history,
  runningContent,
}: {
  readonly user: User["id"];
  readonly quest: Quest;
  readonly lists: readonly List[];
  readonly history: TaskHistory | undefined;
  readonly runningContent: ReactNode;
}): Promise<JSX.Element> {
  let talliesRead: ReturnType<typeof readQuestTallies> | undefined;
  if (lists.some(({ type }) => type === "tally")) {
    talliesRead = readQuestTallies(user, quest.id);
  }
  const [contents, nextTasks, rites, tallies] = await Promise.all([
    Promise.all(lists.map(({ id }) => readListItems(user, quest.id, id))),
    readNextTasks(user, quest.id, 1),
    listRites(user),
    talliesRead,
  ]);
  let sectionRites: typeof rites | undefined = rites;
  if (runningContent !== undefined) {
    sectionRites = undefined;
  }
  return (
    <div className="page-workspace quest-folio">
      <header className="quest-focus-head">
        <div className="quest-focus-line">
          <h2
            data-quest-overview-heading=""
            className="quest-focus-title"
            tabIndex={-1}
          >
            {quest.name}
          </h2>
          <p className="quest-overview-meta">
            <span className="quest-status-mark">
              {QUEST_STATUS_COPY.labels[quest.status]}
            </span>
            {quest.sharing.kind === "private" && (
              <span>{QUEST_OVERVIEW_COPY.private}</span>
            )}
            <QuestSharingMark sharing={quest.sharing} />
          </p>
        </div>
        {quest.startingContext !== undefined &&
          quest.startingContext !== "" && (
            <p className="quest-overview-summary">{quest.startingContext}</p>
          )}
      </header>
      {quest.status !== "active" && (
        <Notice>{QUEST_STATUS_COPY.effects}</Notice>
      )}
      {runningContent}
      <QuestFolio
        questId={quest.id}
        lists={lists.map((list, index) => ({
          list,
          contents: contents[index] ?? [],
          href: sectionPath(quest.id, list.id),
        }))}
        history={history}
        tallies={tallies}
        next={nextTasks[0]?.id}
        rites={sectionRites}
      />
    </div>
  );
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
  const running = performances.find(({ endedAt }) => endedAt === null);
  let listPage: JSX.Element | undefined;
  if (list !== undefined) {
    let talliesRead: ReturnType<typeof readQuestTallies> | undefined;
    if (list.type === "tally") {
      talliesRead = readQuestTallies(user, quest.id);
    }
    const [contents, nextTasks, rites, tallies] = await Promise.all([
      readListItems(user, quest.id, list.id),
      readNextTasks(user, quest.id, 1),
      listRites(user),
      talliesRead,
    ]);
    let listRitesShown: typeof rites | undefined = rites;
    if (running !== undefined) {
      listRitesShown = undefined;
    }
    listPage = (
      <ListPage
        key={list.id}
        questId={quest.id}
        quest={quest.name}
        back={sectionPath(quest.id)}
        list={list}
        contents={contents}
        destinations={lists.filter(({ id }) => id !== list.id)}
        history={history}
        tallies={tallies}
        next={nextTasks[0]?.id}
        rites={listRitesShown}
      />
    );
  }
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
    overview = await overviewOf({
      user,
      quest,
      lists,
      history,
      runningContent,
    });
  }
  let settings: JSX.Element | undefined;
  if (current === "settings") {
    let membersLabel: string = QUEST_MEMBERS_COPY.heading;
    if (people !== undefined) {
      membersLabel = QUEST_OVERVIEW_COPY.members(1 + people.members.length);
    }
    settings = (
      <section
        aria-label={QUEST_OVERVIEW_COPY.settings}
        className="quest-section-body"
      >
        <h2 className="quest-overview-title">{QUEST_OVERVIEW_COPY.settings}</h2>
        <ul className="quest-settings-links">
          <li>
            <Link
              href={sectionPath(quest.id, "members")}
              className="quest-settings-link"
            >
              <span>{membersLabel}</span>
              <Icon name="chevron-right" />
            </Link>
          </li>
          <li>
            <Link
              href={sectionPath(quest.id, "days")}
              className="quest-settings-link"
            >
              <span>{QUEST_SIDEBAR_COPY.dayGrid}</span>
              <Icon name="chevron-right" />
            </Link>
          </li>
        </ul>
        {!quest.life && (
          <>
            <h3 className="font-heading font-semibold">
              {QUEST_OVERVIEW_COPY.status}
            </h3>
            <QuestStatusControls quest={quest} />
          </>
        )}
      </section>
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
      title={quest.name}
      labels={QUEST_OVERVIEW_COPY.panel}
      panel={<QuestPanel questId={quest.id} />}
    >
      <div className="quest-workspace quest-overview">
        <QuestStatusFeedback>
          {overview}
          {quest.status !== "active" && !onOverview && (
            <Notice>{QUEST_STATUS_COPY.effects}</Notice>
          )}
          {listPage}
          {current === "settings" && (
            <Button asChild={true} variant="quiet">
              <Link href={sectionPath(quest.id)}>
                <Icon name="arrow-left" />
                {QUEST_OVERVIEW_COPY.back}
              </Link>
            </Button>
          )}
          {(current === "members" || current === "days") && (
            <Button asChild={true} variant="quiet">
              <Link href={sectionPath(quest.id, "settings")}>
                <Icon name="arrow-left" />
                {QUEST_OVERVIEW_COPY.backToSettings}
              </Link>
            </Button>
          )}
          {settings}
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
