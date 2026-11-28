import type { Route } from "next";
import type { JSX, ReactNode } from "react";
import { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import { ListPage } from "@/components/list-page.tsx";
import type { NewListZotero } from "@/components/new-list-zotero.ts";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import { QuestFolio } from "@/components/quest-folio.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestPanel } from "@/components/quest-panel.tsx";
import { QuestSharingMark } from "@/components/quest-sharing-mark.tsx";
import { QuestSidePanel } from "@/components/quest-side-panel.tsx";
import {
  PerformanceSlot,
  PerformanceStarts,
  RunningPerformance,
} from "@/components/running-performance.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { ZoteroListPage } from "@/components/zotero/zotero-list-page.tsx";
import { ZoteroSetupPanel } from "@/components/zotero/zotero-setup.tsx";
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
import { readZoteroSetup } from "@/zotero/zotero-connection.ts";
import {
  readZoteroLists,
  type ZoteroList,
} from "@/zotero/zotero-list-store.ts";

const SECTION = z.enum(["members", "zotero"]);
// What Zotero answered when it sent the owner back to setup or a list.
const ZOTERO_OUTCOME = z.enum(["connected", "failed"]);
type Section = z.infer<typeof SECTION>;

function sectionPath(id: QuestId, section?: Section | ListId): Route {
  if (section === undefined) {
    return `/quests/${id}`;
  }
  return `/quests/${id}?section=${section}`;
}

// The quest's overview, in the page's frame: its title, status and
// summary, then the add box and each list's section. While a performance
// runs it comes after the sections, which have no rite button, so starting
// one adds it where nothing follows it to move.
async function overviewOf({
  user,
  quest,
  lists,
  history,
  runningContent,
  performing,
  zoteroLists,
  newListZotero,
}: {
  readonly user: User["id"];
  readonly quest: Quest;
  readonly lists: readonly List[];
  readonly history: TaskHistory | undefined;
  readonly runningContent: ReactNode;
  readonly performing: boolean;
  readonly zoteroLists: readonly ZoteroList[];
  readonly newListZotero: NewListZotero | undefined;
}): Promise<JSX.Element> {
  let talliesRead: ReturnType<typeof readQuestTallies> | undefined;
  if (lists.some(({ type }) => type === "tally")) {
    talliesRead = readQuestTallies(user, quest.id);
  }
  const [contents, nextTasks, rites, tallies] = await Promise.all([
    Promise.all(
      lists.map(({ id, type }) => {
        if (type === "zotero-collection") {
          return [];
        }
        return readListItems(user, quest.id, id);
      }),
    ),
    readNextTasks(user, quest.id, 1),
    listRites(user),
    talliesRead,
  ]);
  let sectionRites: typeof rites | undefined = rites;
  if (performing) {
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
      <QuestFolio
        questId={quest.id}
        lists={lists.map((list, index) => ({
          list,
          contents: contents[index] ?? [],
          href: sectionPath(quest.id, list.id),
          zotero: zoteroLists.find(({ list: { id } }) => id === list.id),
        }))}
        history={history}
        tallies={tallies}
        next={nextTasks[0]?.id}
        rites={sectionRites}
        newListZotero={newListZotero}
      />
      {runningContent}
    </div>
  );
}

async function questPage(
  viewer: User,
  questId: string,
  section: unknown,
  zoteroOutcome?: unknown,
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
  const zoteroLists = await readZoteroLists(
    user,
    quest.id,
    lists.flatMap(({ id, type }) => {
      if (type === "zotero-collection") {
        return [id];
      }
      return [];
    }),
  );
  const owner = quest.sharing.kind !== "joined";
  const listId = LIST_ID.safeParse(section).data;
  const list = lists.find(({ id }) => id === listId);
  const runningPerformance = performances.find(
    ({ endedAt }) => endedAt === null,
  );
  let listPage: JSX.Element | undefined;
  const zotero = zoteroLists.find(({ list: { id } }) => id === list?.id);
  if (zotero !== undefined) {
    listPage = (
      <ZoteroListPage
        key={zotero.list.id}
        questId={quest.id}
        quest={quest.name}
        back={sectionPath(quest.id)}
        zotero={zotero}
        owner={owner}
      />
    );
  } else if (list !== undefined && list.type !== "zotero-collection") {
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
    if (runningPerformance !== undefined) {
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
        destinations={lists.filter(
          ({ id, type }) => id !== list.id && type !== "zotero-collection",
        )}
        history={history}
        tallies={tallies}
        next={nextTasks[0]?.id}
        rites={listRitesShown}
      />
    );
  }
  const construct = getConstruct(quest.constructId);
  const stage = {
    questId: quest.id,
    viewer: user,
    author: viewer.name ?? PERFORMANCE_COPY.unnamed,
    construct,
  };
  let running: ReactNode;
  if (runningPerformance !== undefined) {
    const entries = await readPerformanceMessages(user, runningPerformance.id);
    running = (
      <RunningPerformance
        key={runningPerformance.id}
        performance={runningPerformance}
        stage={stage}
        answered={entries.map(({ id }) => id)}
        given={entries.flatMap(({ replyIndex }) => replyIndex ?? [])}
      >
        <PerformanceTranscript
          performance={runningPerformance}
          entries={entries}
          construct={construct}
        />
      </RunningPerformance>
    );
  }
  const runningContent = <PerformanceSlot>{running}</PerformanceSlot>;
  const current = SECTION.safeParse(section).data;

  // Zotero setup is the owner's alone, in the New list dialog on the
  // overview, which opens on it there; members see the overview.
  const onOverview =
    (current === undefined || current === "zotero") && list === undefined;
  let newListZotero: NewListZotero | undefined;
  if (owner) {
    let setup: JSX.Element | undefined;
    if (current === "zotero") {
      setup = (
        <ZoteroSetupPanel
          questId={quest.id}
          setup={await readZoteroSetup(user)}
          outcome={ZOTERO_OUTCOME.safeParse(zoteroOutcome).data}
          shared={quest.sharing.kind === "shared"}
        />
      );
    }
    newListZotero = {
      href: sectionPath(quest.id, "zotero"),
      back: sectionPath(quest.id),
      setup,
    };
  }
  let overview: JSX.Element | undefined;
  if (onOverview) {
    overview = await overviewOf({
      user,
      quest,
      lists,
      history,
      runningContent,
      performing: runningPerformance !== undefined,
      zoteroLists,
      newListZotero,
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
      <PerformanceStarts stage={stage}>
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
      </PerformanceStarts>
    </QuestSidePanel>
  );
}

export { questPage };
