import { expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { changeQuestStatusAction } from "@/app/(stream)/(site)/(workspace)/quests/status-actions.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { readLists } from "@/lists/list-store.ts";
import {
  listPerformances,
  startPerformance,
} from "@/performances/performance-store.ts";
import type { QuestStatus, StatusActionState } from "@/quests/quest-status.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/form-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "./quest-members-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const INVALID: StatusActionState = {
  kind: "invalid",
  message: QUEST_STATUS_COPY.failed,
};

// Asks, as the signed-in user, to move the quest from one status to
// another at the revision their page shows, as the quest panel and its Undo
// do.
function askStatus(
  quest: Quest,
  fromStatus: QuestStatus,
  toStatus: QuestStatus,
  revision: number,
): ReturnType<typeof changeQuestStatusAction> {
  return changeQuestStatusAction(
    { kind: "idle" },
    formOf({
      questId: quest.id,
      fromStatus,
      toStatus,
      revision: String(revision),
    }),
  );
}

test("use_case_change_quest_status", async () => {
  const [owner, member, outsider] = await Promise.all([
    testUser(),
    testUser(),
    testUser(),
  ]);
  const quest = await testData(owner).quest();
  const before = await readLists(owner.id, quest.id);
  await addMember(owner, quest.id, member);
  await signIn(member);
  const finished = await changeQuestStatusAction(
    { kind: "idle" },
    formOf({
      questId: quest.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: "0",
    }),
  );
  expect(finished).toMatchObject({ kind: "saved", change: { revision: 1 } });
  expect((await getQuest(owner.id, quest.id))?.status).toBe("completed");
  expect(await readLists(member.id, quest.id)).toEqual(before);
  expect(await getQuest(outsider.id, quest.id)).toBeUndefined();
  expect(
    await changeQuestStatus(member.id, {
      questId: quest.id,
      fromStatus: "completed",
      toStatus: "active",
      revision: 0,
    }),
  ).toBeUndefined();
});

test("use_case_restore_quest", async () => {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const before = await readLists(owner.id, quest.id);
  await changeQuestStatus(owner.id, {
    questId: quest.id,
    fromStatus: "active",
    toStatus: "completed",
    revision: 0,
  });
  expect((await readExperience(owner.id)).counts["completing-quests"]).toBe(1);
  await signIn(owner);
  expect(
    await changeQuestStatusAction(
      { kind: "idle" },
      formOf({
        questId: quest.id,
        fromStatus: "completed",
        toStatus: "active",
        revision: "1",
      }),
    ),
  ).toMatchObject({ kind: "saved", change: { revision: 2 } });
  expect(await readLists(owner.id, quest.id)).toEqual(before);
  expect((await readExperience(owner.id)).counts["completing-quests"]).toBe(0);
});

test("use_case_change_quest_status: Abandon keeps the work and earns nothing", async () => {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const before = await readLists(owner.id, quest.id);
  await signIn(owner);

  expect(await askStatus(quest, "active", "abandoned", 0)).toEqual({
    kind: "saved",
    change: {
      questId: quest.id,
      fromStatus: "active",
      toStatus: "abandoned",
      revision: 1,
    },
    message: QUEST_STATUS_COPY.saved.abandoned,
  });
  expect(await getQuest(owner.id, quest.id)).toMatchObject({
    status: "abandoned",
    statusRevision: 1,
  });
  expect(await readLists(owner.id, quest.id)).toEqual(before);
  expect((await readExperience(owner.id)).experience).toBe(0);

  expect(await askStatus(quest, "abandoned", "active", 1)).toMatchObject({
    kind: "saved",
    change: { toStatus: "active", revision: 2 },
  });
  expect((await getQuest(owner.id, quest.id))?.status).toBe("active");
});

test("use_case_change_quest_status: Undo of a completion is refused once the quest is abandoned", async () => {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  await signIn(owner);
  const completed = await askStatus(quest, "active", "completed", 0);
  expect(completed).toMatchObject({ kind: "saved", change: { revision: 1 } });

  expect(await askStatus(quest, "completed", "abandoned", 1)).toMatchObject({
    kind: "saved",
    change: { revision: 2 },
  });
  expect((await readExperience(owner.id)).counts["completing-quests"]).toBe(0);

  // Undo sends the completion back: from Completed to Active at revision 1.
  expect(await askStatus(quest, "completed", "active", 1)).toEqual(INVALID);
  expect(await getQuest(owner.id, quest.id)).toMatchObject({
    status: "abandoned",
    statusRevision: 2,
  });
});

test.each([
  ["pending invitee", addInvitee],
  ["removed member", addRemovedMember],
  ["stranger", (): Promise<void> => Promise.resolve()],
] as const)(
  "use_case_change_quest_status: a %s's status change is invalid and changes nothing",
  async (_role, join) => {
    const [owner, outsider] = await Promise.all([testUser(), testUser()]);
    const quest = await testData(owner).quest();
    await join(owner, quest.id, outsider);
    await signIn(outsider);

    expect(await askStatus(quest, "active", "completed", 0)).toEqual(INVALID);
    expect(await askStatus(quest, "active", "abandoned", 0)).toEqual(INVALID);
    expect(await getQuest(owner.id, quest.id)).toMatchObject({
      status: "active",
      statusRevision: 0,
    });
    expect((await readExperience(outsider.id)).experience).toBe(0);
  },
);

test.each(["owner", "member"] as const)(
  "use_case_change_quest_status: the %s changes status during an active performance",
  async (role) => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const quest = await testData(owner).quest();
    await addMember(owner, quest.id, member);
    const users: Readonly<Record<typeof role, User>> = { owner, member };
    const [list] = await readLists(owner.id, quest.id);
    if (list === undefined) {
      throw new Error("Missing list");
    }
    const performance = await startPerformance(owner.id, quest.id, {
      listId: list.id,
      riteId: "capture",
    });
    if (performance === undefined) {
      throw new Error("The performance did not start");
    }
    await signIn(users[role]);

    expect(await askStatus(quest, "active", "completed", 0)).toMatchObject({
      kind: "saved",
      change: { revision: 1 },
    });
    expect(await askStatus(quest, "completed", "active", 1)).toMatchObject({
      kind: "saved",
      change: { revision: 2 },
    });
    expect(await askStatus(quest, "active", "abandoned", 2)).toMatchObject({
      kind: "saved",
      change: { revision: 3 },
    });
    expect(await listPerformances(owner.id, quest.id)).toMatchObject([
      { id: performance.id, endedAt: null },
    ]);
  },
);
