import type { Route } from "next";
import type { JSX, ReactNode } from "react";
import { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import { ListPage } from "@/components/list-page.tsx";
import { MessageComposer } from "@/components/performance-controls.tsx";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import { QuestFolio } from "@/components/quest-folio.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestPanel } from "@/components/quest-panel.tsx";
import { QuestSharingMark } from "@/components/quest-sharing-mark.tsx";
import { QuestSidePanel } from "@/components/quest-side-panel.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
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
import { readTaskHistory } from "@/streaks/streak-store.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import { readQuestTallies } from "@/tallies/tally-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const SECTION = z.enum(["members"]);
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
          performance={running}
          viewer={user}
          author={viewer.name ?? PERFORMANCE_COPY.unnamed}
          construct={construct}
          answered={entries.map(({ id }) => id)}
          given={entries.flatMap(({ replyIndex }) => replyIndex ?? [])}
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
  return (
    <QuestSidePanel
      title={quest.name}
      labels={QUEST_OVERVIEW_COPY.panel}
      panel={
        <QuestPanel quest={quest} people={1 + (people?.members.length ?? 0)} />
      }
    >
      <div className="quest-workspace quest-overview">
        {overview}
        {quest.status !== "active" && !onOverview && (
          <Notice>{QUEST_STATUS_COPY.effects}</Notice>
        )}
        {listPage}
        {current === "members" && people !== undefined && (
          <QuestMembers
            viewer={user}
            people={people}
            quest={quest}
            back={sectionPath(quest.id)}
          />
        )}
        {!onOverview && runningContent}
      </div>
    </QuestSidePanel>
  );
}

export { questPage };
