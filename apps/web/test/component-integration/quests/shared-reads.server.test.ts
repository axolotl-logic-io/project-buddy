// Kept reads of a shared quest against the test database
// (src/db/read-cache.ts). A change one person makes expires what every
// other person it is open to has kept of it, so each sees it on their next
// render: a member's task in the owner's lists, the owner's rename in the
// member's Quests, a removal or invitation in the reader's own Quests, a
// name in the Members tab, and the owner's day in every member's counts.
// Reads that count today are kept no later than the next midnight.

import { describe, expect, test, vi } from "vitest";
import { saveTimeZone, saveUserName } from "@/accounts/users-store.ts";
import { readExperience } from "@/experience/experience-store.ts";
import type { UserId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import { readListItems, writeListContents } from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import {
  listPendingQuests,
  listQuestPeople,
  removeFromQuest,
} from "@/quests/membership-store.ts";
import { readQuestEntries } from "@/quests/quest-index-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import {
  getQuest,
  listQuests,
  type Quest,
  renameQuest,
} from "@/quests/store.ts";
import { readStreakQuests } from "@/streaks/streak-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  type CacheLifeProfile,
  lifetimesOf,
  writeExpiresRead,
} from "../test-database/read-cache-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";
import { addInvitee, addMember } from "./quest-members-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

const SECONDS_IN_A_DAY = 86_400;

// The Tasks list of the quest, as user reads it.
async function tasksListOf(user: UserId, quest: Quest): Promise<ListId> {
  const [tasks] = await readLists(user, quest.id);
  if (tasks === undefined) {
    throw new Error("The quest has no Tasks list");
  }
  return tasks.id;
}

// Whether the lifetime ends within a day, as one kept to midnight does.
function endsByTomorrow(profile: CacheLifeProfile): boolean {
  if (typeof profile !== "object") {
    return false;
  }
  return profile.expire !== undefined && profile.expire <= SECONDS_IN_A_DAY;
}

describe("a shared quest's kept reads", () => {
  test("a member's task expires the owner's lists and Quests", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);
    const listId = await tasksListOf(member.id, quest);

    expect(
      await writeExpiresRead(
        () =>
          Promise.all([
            readListItems(owner.id, quest.id, listId),
            readQuestEntries(owner.id),
          ]),
        () =>
          writeListContents(member.id, quest.id, listId, {
            kind: "add",
            text: "Sweep",
          }),
      ),
    ).toBe(true);
    expect(
      (await readListItems(owner.id, quest.id, listId)).map(({ text }) => text),
    ).toEqual(["Sweep"]);
  });

  test("the owner's rename expires the member's quest and Quests", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);

    expect(
      await writeExpiresRead(
        () =>
          Promise.all([getQuest(member.id, quest.id), listQuests(member.id)]),
        () => renameQuest(owner.id, quest.id, QUEST_NAME.parse("Owl roost")),
      ),
    ).toBe(true);
    expect((await getQuest(member.id, quest.id))?.name).toBe("Owl roost");
  });

  test("a removal expires the removed member's reads, which then find nothing", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);
    const listId = await tasksListOf(member.id, quest);

    expect(
      await writeExpiresRead(
        () =>
          Promise.all([
            getQuest(member.id, quest.id),
            listQuests(member.id),
            readListItems(member.id, quest.id, listId),
          ]),
        () =>
          removeFromQuest(owner.id, { questId: quest.id, person: member.id }),
      ),
    ).toBe(true);
    expect(await getQuest(member.id, quest.id)).toBeUndefined();
    expect((await listQuests(member.id)).map(({ id }) => id)).not.toContain(
      quest.id,
    );
    expect(await readListItems(member.id, quest.id, listId)).toEqual([]);
  });

  test("an invitation expires the invitee's pending quests, and opens nothing else", async () => {
    const [owner, invitee] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");

    expect(
      await writeExpiresRead(
        () => listPendingQuests(invitee.id),
        () => addInvitee(owner, quest.id, invitee),
      ),
    ).toBe(true);
    expect(
      (await listPendingQuests(invitee.id)).map(({ questId }) => questId),
    ).toEqual([quest.id]);
    expect(await getQuest(invitee.id, quest.id)).toBeUndefined();
    expect(await listQuestPeople(invitee.id, quest.id)).toBeUndefined();
  });

  test("a member's new name expires the owner's Members tab", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);

    expect(
      await writeExpiresRead(
        () => listQuestPeople(owner.id, quest.id),
        () => saveUserName(member.id, "Wren"),
      ),
    ).toBe(true);
    expect(
      (await listQuestPeople(owner.id, quest.id))?.members.map(
        ({ displayName }) => displayName,
      ),
    ).toEqual(["Wren"]);
  });

  test("the owner's time zone expires the member's counts of today", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);

    expect(
      await writeExpiresRead(
        () =>
          Promise.all([
            readQuestEntries(member.id),
            readStreakQuests(member.id),
          ]),
        () => saveTimeZone(owner.id, "Asia/Tokyo"),
      ),
    ).toBe(true);
  });

  test("taking back a check-off expires the experience of whoever gained it", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);
    const task = await testData(owner).task(quest, "Sweep");
    const listId = await tasksListOf(owner.id, quest);
    await writeListContents(member.id, quest.id, listId, {
      kind: "check",
      id: task.id,
      checkedOff: true,
    });

    expect(
      await writeExpiresRead(
        () => readExperience(member.id),
        () =>
          writeListContents(owner.id, quest.id, listId, {
            kind: "check",
            id: task.id,
            checkedOff: false,
          }),
      ),
    ).toBe(true);
    expect((await readExperience(member.id)).counts["checking-off"]).toBe(0);
  });

  test("reads that count today are kept no later than the next midnight", async () => {
    const [owner, member] = [await testUser(), await testUser()];
    const quest = await testData(owner).quest("Fox den");
    await addMember(owner, quest.id, member);

    const lifetimes = await lifetimesOf(() =>
      Promise.all([readQuestEntries(member.id), readStreakQuests(member.id)]),
    );
    expect(lifetimes).toHaveLength(2);
    expect(lifetimes.every(endsByTomorrow)).toBe(true);
  });
});
