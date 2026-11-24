// "use_case_tally_lists" in use-cases/lists.md and "use_case_home_tallies"
// in use-cases/home.md, against the test database: Increment adds to a
// tally's today, a day's total can be set on the last seven days, amounts
// keep every digit, and only the quest's people can read or change them.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { writeListContents } from "@/lists/list-item-store.ts";
import { type List, saveList } from "@/lists/list-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import type { Quest } from "@/quests/store.ts";
import { addDays } from "@/streaks/streaks.ts";
import { TALLY_DAYS, type Tally } from "@/tallies/tally.ts";
import {
  incrementTally,
  readQuestTallies,
  readTallyQuests,
  setTallyDay,
} from "@/tallies/tally-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "../quests/quest-members-test-kit.ts";

interface Writing {
  readonly owner: User;
  readonly quest: Quest;
  readonly list: List;
  readonly words: Tally;
}

// The owner's quest with a tally list counting words written.
async function writing(name = "Novel"): Promise<Writing> {
  const owner = await testUser();
  const quest = await testData(owner).quest(name);
  const list = await saveList(owner.id, quest.id, {
    name: "Counts",
    type: "tally",
  });
  if (list === undefined || list === "invalid-text") {
    throw new Error("The tally list was not saved");
  }
  await writeListContents(owner.id, quest.id, list.id, {
    kind: "add",
    text: "Words written",
  });
  const [words] = (await readQuestTallies(owner.id, quest.id))?.tallies ?? [];
  if (words === undefined) {
    throw new Error("The tally was not saved");
  }
  return { owner, quest, list, words };
}

async function tallyOf(user: User, quest: Quest): Promise<Tally | undefined> {
  return (await readQuestTallies(user.id, quest.id))?.tallies[0];
}

describe("use_case_tally_lists", () => {
  test("Increment adds to today's total, and the total sums every day", async () => {
    const { owner, quest, words } = await writing();
    const experience = await readExperience(owner.id);
    const read = await readQuestTallies(owner.id, quest.id);
    const today = read?.today ?? "";
    expect(read).toMatchObject({
      quest: { id: quest.id, name: "Novel" },
      tallies: [{ id: words.id, text: "Words written", days: [], sum: "0" }],
    });

    expect(
      await incrementTally(owner.id, quest.id, { id: words.id, amount: "500" }),
    ).toBe("saved");
    expect(
      await incrementTally(owner.id, quest.id, {
        id: words.id,
        amount: "250.25",
      }),
    ).toBe("saved");
    expect(
      await setTallyDay(owner.id, quest.id, {
        id: words.id,
        date: addDays(today, -2),
        total: "-0.5",
      }),
    ).toBe("saved");

    const tally = await tallyOf(owner, quest);
    expect(tally?.days).toEqual([
      { date: addDays(today, -2), total: "-0.500000" },
      { date: today, total: "750.250000" },
    ]);
    expect(tally?.sum).toBe("749.750000");
    // Changing a tally earns nothing.
    expect(await readExperience(owner.id)).toEqual(experience);

    // Edit today replaces today's total.
    await setTallyDay(owner.id, quest.id, {
      id: words.id,
      date: today,
      total: "123456789012.123456",
    });
    expect((await tallyOf(owner, quest))?.days.at(-1)?.total).toBe(
      "123456789012.123456",
    );
  });

  test("only the last seven days change, and a day's total stays below a trillion", async () => {
    const { owner, quest, words } = await writing();
    const today = (await readQuestTallies(owner.id, quest.id))?.today ?? "";
    function set(date: string, total: string): ReturnType<typeof setTallyDay> {
      return setTallyDay(owner.id, quest.id, { id: words.id, date, total });
    }

    expect(await set(addDays(today, 1), "1")).toBe("out-of-range");
    expect(await set(addDays(today, -TALLY_DAYS), "1")).toBe("out-of-range");
    expect(await set(addDays(today, 1 - TALLY_DAYS), "1")).toBe("saved");

    expect(await set(today, "999999999999")).toBe("saved");
    expect(
      await incrementTally(owner.id, quest.id, { id: words.id, amount: "1" }),
    ).toBe("too-large");
    expect((await tallyOf(owner, quest))?.days.at(-1)?.total).toBe(
      "999999999999.000000",
    );
    expect(
      await incrementTally(owner.id, quest.id, {
        id: words.id,
        amount: "-999999999999",
      }),
    ).toBe("saved");
    expect((await tallyOf(owner, quest))?.days.at(-1)?.total).toBe("0.000000");
  });

  test("a removed tally restored by Undo has its counts again", async () => {
    const { owner, quest, list, words } = await writing();
    await incrementTally(owner.id, quest.id, { id: words.id, amount: "3" });
    const removed = await writeListContents(owner.id, quest.id, list.id, {
      kind: "remove",
      id: words.id,
    });
    const version = removed.list?.version;
    if (version === undefined) {
      throw new Error("The tally was not removed");
    }
    expect((await readQuestTallies(owner.id, quest.id))?.tallies).toEqual([]);
    expect(
      await incrementTally(owner.id, quest.id, { id: words.id, amount: "1" }),
    ).toBe("missing");

    await writeListContents(owner.id, quest.id, list.id, {
      kind: "undo",
      version,
    });

    expect((await tallyOf(owner, quest))?.sum).toBe("3.000000");
  });

  test("the quest's people share its tallies, and no one else can read or change them", async () => {
    const { owner, quest, words } = await writing();
    const [member, pending, removed, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
      testUser(),
    ]);
    await addMember(owner, quest.id, member);
    await addInvitee(owner, quest.id, pending);
    await addRemovedMember(owner, quest.id, removed);
    const today = (await readQuestTallies(owner.id, quest.id))?.today ?? "";

    expect(
      await incrementTally(member.id, quest.id, { id: words.id, amount: "2" }),
    ).toBe("saved");
    expect((await tallyOf(member, quest))?.days).toEqual([
      { date: today, total: "2.000000" },
    ]);

    const outsiders = [pending, removed, stranger];
    const tried = await Promise.all(
      outsiders.map(async ({ id }) => [
        await readQuestTallies(id, quest.id),
        await readTallyQuests(id),
        await incrementTally(id, quest.id, { id: words.id, amount: "1" }),
        await setTallyDay(id, quest.id, {
          id: words.id,
          date: today,
          total: "9",
        }),
      ]),
    );
    expect(tried).toEqual(
      outsiders.map(() => [undefined, [], "missing", "missing"]),
    );
    expect((await tallyOf(owner, quest))?.sum).toBe("2.000000");
  });

  test("a tally can't be changed through another quest or list type", async () => {
    const { owner, words } = await writing();
    const other = await testData(owner).quest("Other");
    expect(
      await incrementTally(owner.id, other.id, { id: words.id, amount: "1" }),
    ).toBe("missing");
    // The starting task list's tasks aren't tallies.
    const tasks = await readQuestTallies(owner.id, other.id);
    expect(tasks?.tallies).toEqual([]);
  });
});

describe("use_case_home_tallies", () => {
  test("Home lists each Active quest open to the user that has a tally, oldest first", async () => {
    const first = await writing("First");
    const { owner } = first;
    const empty = await testData(owner).quest("No tallies");
    const second = await testData(owner).quest("Second");
    const list = await saveList(owner.id, second.id, {
      name: "Reading",
      type: "tally",
    });
    if (list === undefined || list === "invalid-text") {
      throw new Error("The tally list was not saved");
    }
    await writeListContents(owner.id, second.id, list.id, {
      kind: "add",
      text: "Books read",
    });
    const shared = await writing("Shared");
    await addMember(shared.owner, shared.quest.id, owner);

    const quests = await readTallyQuests(owner.id);
    expect(quests.map(({ quest }) => quest.name)).toEqual([
      "First",
      "Second",
      "Shared",
    ]);
    expect(quests.map(({ quest }) => quest.id)).not.toContain(empty.id);

    await changeQuestStatus(owner.id, {
      questId: second.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: second.statusRevision,
    });
    expect(
      (await readTallyQuests(owner.id)).map(({ quest }) => quest.name),
    ).toEqual(["First", "Shared"]);
  });
});
