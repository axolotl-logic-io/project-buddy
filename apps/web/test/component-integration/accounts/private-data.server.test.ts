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
  conjurationOpenTo,
  eventOwnedBy,
  murmlingOpenTo,
  opensQuest,
  performanceOpenTo,
  questDayOwnedBy,
  questInvitationOpenTo,
  questInvitationTo,
  questMemberOpenTo,
  questOpenTo,
  questOwnedBy,
  questPendingFor,
  spaceChangeOpenTo,
  spaceOpenTo,
} from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import QuestsPage from "@/app/(workspace)/quests/(list)/page.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { getDb } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { conjurations, performances } from "@/db/tables/performances.ts";
import { questDays } from "@/db/tables/quest-days.ts";
import { questInvitations, questMembers } from "@/db/tables/quest-members.ts";
import { quests } from "@/db/tables/quests.ts";
import { spaceChanges } from "@/db/tables/space-changes.ts";
import { murmlings, spaces } from "@/db/tables/spaces.ts";
import { readExperience } from "@/experience/experience-store.ts";
import type { UserId } from "@/ids.ts";
import {
  conjureAction,
  startPerformanceAction,
  stopPerformanceAction,
} from "@/performances/performance-actions.ts";
import {
  CONJURATION,
  conjure,
  listPerformances,
  readConjurations,
  startPerformance,
} from "@/performances/performance-store.ts";
import { removeFromQuest } from "@/quests/membership-store.ts";
import { getQuest, listQuests, type Quest } from "@/quests/store.ts";
import type { MurmlingChange } from "@/spaces/murmling.ts";
import { changeMurmlingAction } from "@/spaces/murmling-actions.ts";
import {
  listMurmlings,
  readNextMurmling,
  readSpaceContents,
  writeSpaceContents,
} from "@/spaces/murmling-store.ts";
import {
  listQuickNoteQuests,
  saveQuickNote,
} from "@/spaces/quick-note-actions.ts";
import { saveSpaceAction } from "@/spaces/space-actions.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";
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

// A Dailies day's date, for the day row the test writes itself.
const DAY = "2026-11-02";

// The owner's quest shared with a member, with a pending invitee and a
// removed member, and a stranger beside it: two tasks in its Tasks space,
// the change version of the second, an active performance on Ideas with a
// conjuration the removed member made before their removal, and a day.
async function sharedQuest(): Promise<{
  readonly users: Readonly<Record<Role, User>>;
  readonly quest: Quest;
  readonly otherQuest: Quest;
  readonly tasks: Awaited<ReturnType<typeof listSpaces>>[number];
  readonly ideas: Awaited<ReturnType<typeof listSpaces>>[number];
  readonly first: Awaited<ReturnType<typeof listMurmlings>>[number];
  readonly second: Awaited<ReturnType<typeof listMurmlings>>[number];
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
  const [tasks, ideas] = await listSpaces(owner.id, quest.id);
  if (tasks === undefined || ideas === undefined) {
    throw new Error("The starting spaces were not saved");
  }
  await writeSpaceContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Wedge clay",
  });
  const { space } = await writeSpaceContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Throw bowls",
  });
  const [first, second] = space?.murmlings ?? [];
  if (space === undefined || first === undefined || second === undefined) {
    throw new Error("The tasks were not saved");
  }
  const performance = await startPerformance(owner.id, quest.id, {
    spaceId: ideas.id,
    riteId: "capture",
  });
  if (performance === undefined) {
    throw new Error("The performance did not start");
  }
  const kept = await conjure(
    removed.id,
    quest.id,
    CONJURATION.parse({
      id: crypto.randomUUID(),
      performanceId: performance.id,
      text: "Bisque first",
    }),
  );
  if (kept === undefined) {
    throw new Error("The member's conjuration was not saved");
  }
  if (
    !(await removeFromQuest(owner.id, {
      questId: quest.id,
      person: removed.id,
    }))
  ) {
    throw new Error("The member was not removed");
  }
  // Only Start Day writes a day, and only in a Dailies quest, which can't
  // be shared, so the test writes one to show members can't reach it.
  await getDb().insert(questDays).values({ questId: quest.id, localDate: DAY });
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
    version: space.version,
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
    opensQuest: (user: UserId): Promise<boolean> =>
      questRow(quest.id, opensQuest(user, quest.id)),
    questPendingFor: (user: UserId): Promise<boolean> =>
      questRow(quest.id, questPendingFor(user)),
    spaceOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: spaces.id })
          .from(spaces)
          .where(and(eq(spaces.questId, quest.id), spaceOpenTo(user))),
      ),
    murmlingOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: murmlings.id })
          .from(murmlings)
          .where(and(eq(murmlings.questId, quest.id), murmlingOpenTo(user))),
      ),
    spaceChangeOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: spaceChanges.id })
          .from(spaceChanges)
          .where(
            and(eq(spaceChanges.spaceId, tasks.id), spaceChangeOpenTo(user)),
          ),
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
    conjurationOpenTo: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: conjurations.id })
          .from(conjurations)
          .where(
            and(
              eq(conjurations.performanceId, performanceId),
              conjurationOpenTo(user),
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
    questDayOwnedBy: (user: UserId): Promise<boolean> =>
      finds(
        db
          .select({ id: questDays.id })
          .from(questDays)
          .where(and(eq(questDays.questId, quest.id), questDayOwnedBy(user))),
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
  opensQuest: OPEN_TO_OWNER_AND_MEMBER,
  questPendingFor: ["pending invitee"],
  spaceOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  murmlingOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  spaceChangeOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  performanceOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  conjurationOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  questMemberOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  questInvitationOpenTo: OPEN_TO_OWNER_AND_MEMBER,
  questInvitationTo: ["pending invitee"],
  questDayOwnedBy: ["owner"],
  eventOwnedBy: ["owner"],
};

// Everything of the shared quest, as its owner reads it.
function ownerView(shared: Shared): Promise<unknown> {
  const { users, quest, tasks, ideas, performanceId } = shared;
  const owner = users.owner.id;
  return Promise.all([
    getQuest(owner, quest.id),
    listSpaces(owner, quest.id),
    listMurmlings(owner, quest.id, tasks.id),
    listMurmlings(owner, quest.id, ideas.id),
    listPerformances(owner, quest.id),
    readConjurations(owner, performanceId),
    readExperience(owner),
  ]);
}

// The Space settings form for a space of the quest, or a new one.
function spaceForm(shared: Shared, spaceId?: string): FormData {
  const form = formOf({
    questId: shared.quest.id,
    name: "Firings",
    singular: "firing",
    plural: "firings",
    checkOff: "Fire",
    uncheck: "Unload",
    newType: "task",
  });
  if (spaceId !== undefined) {
    form.set("spaceId", spaceId);
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
      await readConjurations(shared.users.owner.id, shared.performanceId),
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
          listSpaces(outsider.id, quest.id),
          listMurmlings(outsider.id, quest.id, tasks.id),
          readSpaceContents(outsider.id, quest.id, tasks.id),
          readNextMurmling(outsider.id, quest.id),
          listPerformances(outsider.id, quest.id),
          readConjurations(outsider.id, performanceId),
          listQuickNoteQuests(),
        ]),
      ).toEqual([[], undefined, [], [], undefined, undefined, [], [], []]);

      expect(
        await startPerformanceAction({
          questId: quest.id,
          spaceId: tasks.id,
          riteId: "capture",
        }),
      ).toBe(PERFORMANCE_COPY.unavailable);
      expect(
        await stopPerformanceAction({ questId: quest.id, performanceId }),
      ).toBe(PERFORMANCE_COPY.unavailable);
      expect(
        await conjureAction({
          questId: quest.id,
          performanceId,
          id: crypto.randomUUID(),
          text: "Glaze it blue",
        }),
      ).toBe(PERFORMANCE_COPY.required);

      const changes: readonly MurmlingChange[] = [
        { kind: "add", text: "Sweep the studio" },
        { kind: "edit", id: first.id, text: "Wedge porcelain" },
        { kind: "type", id: first.id, type: "plain" },
        { kind: "check", id: first.id, checkedOff: true },
        { kind: "recurring", id: first.id, recurring: true },
        { kind: "move", id: first.id, destination: ideas.id },
        { kind: "place", id: second.id, before: first.id },
        { kind: "reorder", id: first.id, direction: "down" },
        { kind: "remove", id: second.id },
        { kind: "undo", version },
      ];
      expect(
        await Promise.all(
          changes.map((change) =>
            changeMurmlingAction({
              questId: quest.id,
              spaceId: tasks.id,
              change,
            }),
          ),
        ),
      ).toEqual(
        changes.map(() => ({
          kind: "problem",
          text: SPACES_COPY.changeProblems.missing,
        })),
      );

      expect(
        await Promise.all([
          saveSpaceAction({}, spaceForm(shared)),
          saveSpaceAction({}, spaceForm(shared, tasks.id)),
        ]),
      ).toMatchObject([
        { error: SPACES_COPY.unavailable },
        { error: SPACES_COPY.unavailable },
      ]);
      expect(
        await saveQuickNote({
          questId: quest.id,
          spaceId: tasks.id,
          text: "Order more cones",
        }),
      ).toEqual({ kind: "problem", text: QUICK_NOTE_COPY.spaceUnavailable });

      expect(await ownerView(shared)).toEqual(before);
    },
  );

  test.each(["owner", "member"] as const)(
    "the %s performs, conjures and changes the quest's spaces",
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
          spaceId: ideas.id,
          riteId: "capture",
        }),
      ).toBeUndefined();
      const [active, stopped] = await listPerformances(user.id, quest.id);
      if (active === undefined) {
        throw new Error("The performance was not listed");
      }
      expect([active, stopped]).toMatchObject([
        { spaceId: ideas.id, endedAt: null },
        { id: shared.performanceId, endedAt: expect.any(Date) },
      ]);
      expect(
        await conjureAction({
          questId: quest.id,
          performanceId: active.id,
          id: crypto.randomUUID(),
          text: "Glaze it blue",
        }),
      ).toBeUndefined();
      expect(await readConjurations(user.id, active.id)).toMatchObject([
        { text: "Glaze it blue", added: 1 },
      ]);
      expect(
        await stopPerformanceAction({
          questId: quest.id,
          performanceId: active.id,
        }),
      ).toBeUndefined();

      function change(
        body: MurmlingChange,
      ): ReturnType<typeof changeMurmlingAction> {
        return changeMurmlingAction({
          questId: quest.id,
          spaceId: tasks.id,
          change: body,
        });
      }
      const saved = { kind: "saved" };
      expect(
        await change({ kind: "edit", id: first.id, text: "Wedge porcelain" }),
      ).toMatchObject(saved);
      expect(
        await change({ kind: "type", id: second.id, type: "plain" }),
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
      expect(await listMurmlings(user.id, quest.id, tasks.id)).toMatchObject([
        { id: second.id, type: "plain" },
        { id: first.id, text: "Wedge porcelain" },
      ]);

      expect(await saveSpaceAction({}, spaceForm(shared))).toEqual({
        saved: true,
      });
      expect(
        (await listSpaces(shared.users.owner.id, quest.id)).map(
          ({ name }) => name,
        ),
      ).toEqual(["Tasks", "Ideas", "Firings"]);
    },
  );
});
