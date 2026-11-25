// use_case_private_data and use_case_quest_member_access against the test
// database. On the pages, another user's quest page is not found, exactly
// as an unknown id's is, and Quests lists each user only the quests open to
// them. Below the pages, one shared quest is tried by each of the five
// roles: its owner, an accepted member, a pending invitee, a removed member
// and a stranger. The access predicates of src/accounts/owner-scope.ts open
// its rows to the owner and the member alone, and the stores and Server
// Actions built on them let the owner and the member read and change it,
// while the other three read nothing and change nothing.

import { and, eq, type SQL } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import {
  checkOffInQuestOpenTo,
  eventOwnedBy,
  listChangeOpenTo,
  listItemOpenTo,
  listOpenTo,
  performanceMessageOpenTo,
  performanceOpenTo,
  questInvitationOpenTo,
  questInvitationTo,
  questMemberOpenTo,
  questOpenTo,
  questOwnedBy,
  questPendingFor,
  tallyDayOpenTo,
} from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import QuestsPage from "@/app/(workspace)/quests/(list)/page.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { getDb } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { listChanges } from "@/db/tables/list-changes.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { performanceMessages, performances } from "@/db/tables/performances.ts";
import { questInvitations, questMembers } from "@/db/tables/quest-members.ts";
import { quests } from "@/db/tables/quests.ts";
import { tallyDays } from "@/db/tables/tallies.ts";
import { readExperience } from "@/experience/experience-store.ts";
import type { UserId } from "@/ids.ts";
import { saveListAction } from "@/lists/list-actions.ts";
import type { ListItemChange } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import {
  countListItems,
  readListContents,
  readListItems,
  readNextTasks,
  writeListContents,
} from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import { listQuickAddQuests, saveQuickAdd } from "@/lists/quick-add-actions.ts";
import {
  sendMessageAction,
  startPerformanceAction,
  stopPerformanceAction,
} from "@/performances/performance-actions.ts";
import {
  listPerformances,
  PERFORMANCE_MESSAGE,
  readPerformanceMessages,
  sendMessage,
  startPerformance,
} from "@/performances/performance-store.ts";
import { removeFromQuest } from "@/quests/membership-store.ts";
import { getQuest, listQuests, type Quest } from "@/quests/store.ts";
import { markTaskPeriodAction } from "@/streaks/streak-actions.ts";
import { readStreakQuests } from "@/streaks/streak-store.ts";
import { addDays, localDate } from "@/streaks/streaks.ts";
import {
  incrementTallyAction,
  setTallyDayAction,
} from "@/tallies/tally-actions.ts";
import { readQuestTallies, readTallyQuests } from "@/tallies/tally-store.ts";
import { readTaskQuests } from "@/tasks/task-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addInvitee, addMember } from "../quests/quest-members-test-kit.ts";
import { formOf } from "../test-database/form-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

// What a page component is called with: its route's params, and no search
// parameters.
interface PageArgs<Params> {
  readonly params: Promise<Params>;
  readonly searchParams: Promise<Record<string, never>>;
}

// A page that shows the row with this id.
type IdPage = (id: string) => Promise<unknown>;

function pageArgs<Params>(params: Params): PageArgs<Params> {
  return { params: Promise.resolve(params), searchParams: Promise.resolve({}) };
}

function questPage(questId: string): Promise<unknown> {
  return QuestPage(pageArgs({ questId }));
}

// The signed-in user's Quests page, as HTML.
async function questsHtml(): Promise<string> {
  return renderToStaticMarkup(
    await QuestsPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    }),
  );
}

// The page is not found for the unknown id, and then for the id.
async function expectNotFoundAsUnknown(
  page: IdPage,
  id: string,
  unknownId: string,
): Promise<void> {
  await expectNotFound(() => page(unknownId));
  await expectNotFound(() => page(id));
}

// The names of the quests that the HTML holds.
function questsIn(html: string, list: readonly Quest[]): string[] {
  return list.flatMap(({ name }) => {
    if (html.includes(name)) {
      return [name];
    }
    return [];
  });
}

describe("use_case_private_data", () => {
  test("another user's quest page can't be found", async () => {
    const { her, herData, other } = await twoUsers();
    const hers = await herData.quest();
    await signIn(other);

    await expectNotFoundAsUnknown(questPage, hers.id, questIdFixture());

    await signIn(her);
    await expect(questPage(hers.id)).resolves.toBeDefined();
  });

  test("each sees only their own quests", async () => {
    const { herData, other, otherData } = await twoUsers();
    const both = [
      await herData.quest("Glaze notes"),
      await otherData.quest("Evening sketches"),
    ];
    const [hers, theirs] = both.map(({ name }) => name);

    expect(questsIn(await questsHtml(), both)).toEqual([hers]);
    await signIn(other);
    expect(questsIn(await questsHtml(), both)).toEqual([theirs]);
  });
});

// The five ways a user can stand toward a quest.
const ROLES = [
  "owner",
  "member",
  "pending invitee",
  "removed member",
  "stranger",
] as const;
type Role = (typeof ROLES)[number];

// The roles the quest is closed to.
const OUTSIDERS = ["pending invitee", "removed member", "stranger"] as const;

// The owner's quest shared with a member, with a pending invitee and a
// removed member, and a stranger beside it: two tasks in its Tasks list,
// the change version of the second, an active performance on Ideas with a
// message the removed member made before their removal, and the member's
// check-off of the first task.
async function sharedQuest(): Promise<{
  readonly users: Readonly<Record<Role, User>>;
  readonly quest: Quest;
  readonly otherQuest: Quest;
  readonly tasks: Awaited<ReturnType<typeof readLists>>[number];
  readonly ideas: Awaited<ReturnType<typeof readLists>>[number];
  readonly first: Awaited<ReturnType<typeof readListItems>>[number];
  readonly second: Awaited<ReturnType<typeof readListItems>>[number];
  readonly version: number;
  readonly performanceId: Awaited<
    ReturnType<typeof listPerformances>
  >[number]["id"];
}> {
  const [owner, member, pending, removed, stranger] = await Promise.all(
    ROLES.map(() => testUser()),
  );
  if (
    owner === undefined ||
    member === undefined ||
    pending === undefined ||
    removed === undefined ||
    stranger === undefined
  ) {
    throw new Error("The users were not made");
  }
  const data = testData(owner);
  const [quest, otherQuest] = await Promise.all([
    data.quest("Kiln log"),
    data.quest("Glaze notes"),
  ]);
  await Promise.all([
    addMember(owner, quest.id, member),
    addMember(owner, quest.id, removed),
    addInvitee(owner, quest.id, pending),
  ]);
  const [tasks, ideas] = await readLists(owner.id, quest.id);
  if (tasks === undefined || ideas === undefined) {
    throw new Error("The starting lists were not saved");
  }
  await writeListContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Wedge clay",
  });
  const { list } = await writeListContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Throw bowls",
  });
  const [first, second] = list?.listItems ?? [];
  if (list === undefined || first === undefined || second === undefined) {
    throw new Error("The tasks were not saved");
  }
  const performance = await startPerformance(owner.id, quest.id, {
    listId: ideas.id,
    riteId: "capture",
  });
  if (performance === undefined) {
    throw new Error("The performance did not start");
  }
  const kept = await sendMessage(
    removed.id,
    quest.id,
    PERFORMANCE_MESSAGE.parse({
      id: crypto.randomUUID(),
      performanceId: performance.id,
      text: "Bisque first",
    }),
  );
  if (kept === undefined) {
    throw new Error("The member's message was not saved");
  }
  if (
    !(await removeFromQuest(owner.id, {
      questId: quest.id,
      person: removed.id,
    }))
  ) {
    throw new Error("The member was not removed");
  }
  // The test writes the member's check-off itself, so the tasks stay as
  // they are for the tests that change them.
  await getDb().insert(events).values({
    userId: member.id,
    event: "checking-off",
    questId: quest.id,
    source: "1",
  });
  // A day's total, written directly, so the lists stay as they are.
  await getDb().insert(tallyDays).values({
    questId: quest.id,
    listItemId: first.id,
    localDate: "2026-11-24",
    total: "3",
  });
  return {
    users: {
      owner,
      member,
      "pending invitee": pending,
      "removed member": removed,
      stranger,
    },
    quest,
    otherQuest,
    tasks,
    ideas,
    first,
    second,
    version: list.version,
    performanceId: performance.id,
  };
}

type Shared = Awaited<ReturnType<typeof sharedQuest>>;

// Whether the query finds any row.
async function finds(rows: Promise<readonly unknown[]>): Promise<boolean> {
  return (await rows).length > 0;
}

// For each predicate, whether it opens the shared quest's rows of its table
// to the user.
function predicateProbes(
  shared: Shared,
): Readonly<Record<string, (user: UserId) => Promise<boolean>>> {
  const db = getDb();
  const { quest, otherQuest, tasks, first, performanceId, users } = shared;
  function questRow(id: Quest["id"], where: SQL | undefined): Promise<boolean> {
    return finds(
      db
        .select({ id: quests.id })
        .from(quests)
        .where(and(eq(quests.id, id), where)),
    );
  }
  return {
    questOwnedBy: (user: UserId): Promise<boolean> =>
      questRow(quest.id, questOwnedBy(user)),
    questOpenTo: (user: UserId): Promise<boolean> =>
      questRow(quest.id, questOpenTo(user)),
    "questOpenTo, the owner's other quest": (user: UserId): Promise<boolean> =>
      questRow(otherQuest.id, questOpenTo(user)),
    questPendingFor: (user: UserId): Promise<boolean> =>
      questRow(quest.id, questPendingFor(user)),
    listOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: lists.id })
          .from(lists)
          .where(and(eq(lists.questId, quest.id), listOpenTo(user))),
      ),
    listItemOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: listItems.id })
          .from(listItems)
          .where(and(eq(listItems.questId, quest.id), listItemOpenTo(user))),
      ),
    listChangeOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: listChanges.id })
          .from(listChanges)
          .where(and(eq(listChanges.listId, tasks.id), listChangeOpenTo(user))),
      ),
    performanceOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: performances.id })
          .from(performances)
          .where(
            and(eq(performances.questId, quest.id), performanceOpenTo(user)),
          ),
      ),
    performanceMessageOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: performanceMessages.id })
          .from(performanceMessages)
          .where(
            and(
              eq(performanceMessages.performanceId, performanceId),
              performanceMessageOpenTo(user),
            ),
          ),
      ),
    questMemberOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: questMembers.userId })
          .from(questMembers)
          .where(
            and(eq(questMembers.questId, quest.id), questMemberOpenTo(user)),
          ),
      ),
    questInvitationOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: questInvitations.id })
          .from(questInvitations)
          .where(
            and(
              eq(questInvitations.questId, quest.id),
              questInvitationOpenTo(user),
            ),
          ),
      ),
    questInvitationTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: questInvitations.id })
          .from(questInvitations)
          .where(
            and(
              eq(questInvitations.questId, quest.id),
              questInvitationTo(user),
            ),
          ),
      ),
    // The member's check-off, which streaks read for everyone in the quest.
    checkOffInQuestOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: events.id })
          .from(events)
          .where(
            and(eq(events.questId, quest.id), checkOffInQuestOpenTo(user)),
          ),
      ),
    tallyDayOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: tallyDays.listItemId })
          .from(tallyDays)
          .where(and(eq(tallyDays.questId, quest.id), tallyDayOpenTo(user))),
      ),
    // The owner's event for adding the first task.
    eventOwnedBy: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.questId, quest.id),
              eq(events.userId, users.owner.id),
              eq(events.source, first.id),
              eventOwnedBy(user),
            ),
          ),
      ),
  };
}

// Who each predicate opens the shared quest's rows to: the owner and
// accepted members, unless the predicate says otherwise.
const OPEN_TO_OWNER_AND_MEMBER: readonly Role[] = ["owner", "member"];
const EXPECTED_REACH: Readonly<Record<string, readonly Role[]>> = {
  questOwnedBy: ["owner"],
  questOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  "questOpenTo, the owner's other quest": ["owner"],
  questPendingFor: ["pending invitee"],
  listOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  listItemOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  listChangeOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  performanceOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  performanceMessageOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  questMemberOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  questInvitationOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  questInvitationTo: ["pending invitee"],
  checkOffInQuestOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  tallyDayOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  eventOwnedBy: ["owner"],
};

// Everything of the shared quest, as its owner reads it.
function ownerView(shared: Shared): Promise<unknown> {
  const { users, quest, tasks, ideas, performanceId } = shared;
  const owner = users.owner.id;
  return Promise.all([
    getQuest(owner, quest.id),
    readLists(owner, quest.id),
    readListItems(owner, quest.id, tasks.id),
    readListItems(owner, quest.id, ideas.id),
    listPerformances(owner, quest.id),
    readPerformanceMessages(owner, performanceId),
    readExperience(owner),
  ]);
}

// The List settings form for a list of the quest, or a new one.
function listForm(shared: Shared, listId?: string): FormData {
  const form = formOf({
    questId: shared.quest.id,
    name: "Firings",
    type: "task",
  });
  if (listId !== undefined) {
    form.set("listId", listId);
  }
  return form;
}

describe("use_case_quest_member_access", () => {
  test("the access predicates open the quest to its owner and member alone", async () => {
    const shared = await sharedQuest();
    const probes = predicateProbes(shared);
    const reach = Object.fromEntries(
      await Promise.all(
        Object.entries(probes).map(async ([name, probe]) => {
          const opened = await Promise.all(
            ROLES.map(async (role) => ({
              role,
              open: await probe(shared.users[role].id),
            })),
          );
          return [
            name,
            opened.filter(({ open }) => open).map(({ role }) => role),
          ];
        }),
      ),
    );

    expect(reach).toEqual(EXPECTED_REACH);
    expect(
      await readPerformanceMessages(
        shared.users.owner.id,
        shared.performanceId,
      ),
    ).toMatchObject([{ text: "Bisque first", added: 1 }]);
  });

  test.each(OUTSIDERS)(
    "a %s reads nothing of the quest and changes nothing in it",
    async (role) => {
      const shared = await sharedQuest();
      const { quest, tasks, ideas, first, second, version, performanceId } =
        shared;
      const outsider = shared.users[role];
      const before = await ownerView(shared);
      await signIn(outsider);

      expect(
        await Promise.all([
          listQuests(outsider.id),
          getQuest(outsider.id, quest.id),
          readLists(outsider.id, quest.id),
          readListItems(outsider.id, quest.id, tasks.id),
          readListContents(outsider.id, quest.id, tasks.id),
          readNextTasks(outsider.id, quest.id, 1),
          countListItems(outsider.id, quest.id),
          listPerformances(outsider.id, quest.id),
          readPerformanceMessages(outsider.id, performanceId),
          listQuickAddQuests(),
          readStreakQuests(outsider.id),
          readTallyQuests(outsider.id),
          readQuestTallies(outsider.id, quest.id),
          readTaskQuests(outsider.id),
        ]),
      ).toEqual([
        [],
        undefined,
        [],
        [],
        undefined,
        [],
        new Map(),
        [],
        [],
        [],
        [],
        [],
        undefined,
        [],
      ]);
      expect(
        await markTaskPeriodAction({
          questId: quest.id,
          localDate: addDays(localDate(new Date(), "UTC"), -1),
          number: 1,
          done: true,
        }),
      ).toEqual({ kind: "problem", text: HOME_COPY.markUnavailable });
      const tallyMissing = {
        kind: "problem",
        text: TALLIES_COPY.problems.missing,
      };
      expect(
        await incrementTallyAction({
          questId: quest.id,
          id: first.id,
          amount: "1",
        }),
      ).toEqual(tallyMissing);
      expect(
        await setTallyDayAction({
          questId: quest.id,
          id: first.id,
          date: "2026-11-24",
          total: "1",
        }),
      ).toEqual(tallyMissing);

      expect(
        await startPerformanceAction({
          questId: quest.id,
          listId: tasks.id,
          riteId: "capture",
        }),
      ).toBe(PERFORMANCE_COPY.unavailable);
      expect(
        await stopPerformanceAction({ questId: quest.id, performanceId }),
      ).toBe(PERFORMANCE_COPY.unavailable);
      expect(
        await sendMessageAction({
          questId: quest.id,
          performanceId,
          id: crypto.randomUUID(),
          text: "Glaze it blue",
        }),
      ).toBe(PERFORMANCE_COPY.required);

      const changes: readonly ListItemChange[] = [
        { kind: "add", text: "Sweep the studio" },
        { kind: "edit", id: first.id, text: "Wedge porcelain" },
        { kind: "check", id: first.id, checkedOff: true },
        { kind: "recurring", id: first.id, cadence: "daily" },
        { kind: "move", id: first.id, destination: ideas.id },
        { kind: "place", id: second.id, before: first.id },
        { kind: "reorder", id: first.id, direction: "down" },
        { kind: "remove", id: second.id },
        { kind: "undo", version },
      ];
      expect(
        await Promise.all(
          changes.map((change) =>
            changeListItemAction({
              questId: quest.id,
              listId: tasks.id,
              change,
            }),
          ),
        ),
      ).toEqual(
        changes.map(() => ({
          kind: "problem",
          text: LISTS_COPY.changeProblems.missing,
        })),
      );

      expect(
        await Promise.all([
          saveListAction({}, listForm(shared)),
          saveListAction({}, listForm(shared, tasks.id)),
        ]),
      ).toMatchObject([
        { error: LISTS_COPY.unavailable },
        { error: LISTS_COPY.unavailable },
      ]);
      expect(
        await saveQuickAdd({
          questId: quest.id,
          listId: tasks.id,
          text: "Order more cones",
        }),
      ).toEqual({ kind: "problem", text: QUICK_ADD_COPY.listUnavailable });

      expect(await ownerView(shared)).toEqual(before);
    },
  );

  test.each(["owner", "member"] as const)(
    "the %s performs, sends messages and changes the quest's lists",
    async (role) => {
      const shared = await sharedQuest();
      const { quest, tasks, ideas, first, second } = shared;
      const user = shared.users[role];
      await signIn(user);

      expect((await listQuests(user.id)).map(({ id }) => id)).toContain(
        quest.id,
      );
      expect(
        await startPerformanceAction({
          questId: quest.id,
          listId: ideas.id,
          riteId: "capture",
        }),
      ).toBeUndefined();
      const [active, stopped] = await listPerformances(user.id, quest.id);
      if (active === undefined) {
        throw new Error("The performance was not listed");
      }
      expect([active, stopped]).toMatchObject([
        { listId: ideas.id, endedAt: null },
        { id: shared.performanceId, endedAt: expect.any(Date) },
      ]);
      expect(
        await sendMessageAction({
          questId: quest.id,
          performanceId: active.id,
          id: crypto.randomUUID(),
          text: "Glaze it blue",
        }),
      ).toBeUndefined();
      expect(await readPerformanceMessages(user.id, active.id)).toMatchObject([
        { text: "Glaze it blue", added: 1 },
      ]);
      expect(
        await stopPerformanceAction({
          questId: quest.id,
          performanceId: active.id,
        }),
      ).toBeUndefined();

      function change(
        body: ListItemChange,
      ): ReturnType<typeof changeListItemAction> {
        return changeListItemAction({
          questId: quest.id,
          listId: tasks.id,
          change: body,
        });
      }
      const saved = { kind: "saved" };
      expect(
        await change({ kind: "edit", id: first.id, text: "Wedge porcelain" }),
      ).toMatchObject(saved);
      expect(
        await change({ kind: "reorder", id: first.id, direction: "down" }),
      ).toMatchObject(saved);
      const moved = await change({
        kind: "move",
        id: second.id,
        destination: ideas.id,
      });
      if (moved.kind !== "saved" || moved.undoVersion === undefined) {
        throw new Error("The move offered no Undo");
      }
      expect(
        await change({ kind: "undo", version: moved.undoVersion }),
      ).toMatchObject(saved);
      expect(await readListItems(user.id, quest.id, tasks.id)).toMatchObject([
        { id: second.id, taskNumber: second.taskNumber },
        { id: first.id, text: "Wedge porcelain" },
      ]);

      expect(await saveListAction({}, listForm(shared))).toEqual({
        saved: true,
      });
      expect(
        (await readLists(shared.users.owner.id, quest.id)).map(
          ({ name }) => name,
        ),
      ).toEqual(["Tasks", "Ideas", "Firings"]);
    },
  );
});
