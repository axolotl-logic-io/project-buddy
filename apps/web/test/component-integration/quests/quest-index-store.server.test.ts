// "use_case_life", "use_case_view_quests" and "use_case_find_quest" in
// use-cases/quests.md, against the test database: the Life every user
// has, its Suggested task, picked only from Life's own recurring tasks not
// yet done in their period, and what Quests lists and finds.

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { ListId } from "@/lists/list.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import { readListItems, writeListContents } from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import { finderQuests } from "@/quests/quest-finder-entries.ts";
import { readLife, readQuestEntries } from "@/quests/quest-index-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import {
  ensureLife,
  LIFE_NAME,
  listQuests,
  type Quest,
} from "@/quests/store.ts";
import type { Cadence } from "@/streaks/streaks.ts";
import { searchTasks } from "@/tasks/task-search-store.ts";
import { QUEST_FINDER_COPY } from "@/ui/copy/quests.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

// The user's Life, made if they have none.
async function lifeOf(user: User): Promise<Quest> {
  await ensureLife(user.id);
  const life = (await listQuests(user.id)).find((quest) => quest.life);
  if (life === undefined) {
    throw new Error("No Life was made");
  }
  return life;
}

// The quest's Tasks list.
async function tasksOf(user: User, quest: Quest): Promise<ListId> {
  const [tasks] = await readLists(user.id, quest.id);
  if (tasks === undefined) {
    throw new Error("The quest has no Tasks list");
  }
  return tasks.id;
}

// Adds a task to the quest's Tasks list, repeating with the cadence when
// given, and returns it.
async function addTask(
  user: User,
  quest: Quest,
  text: string,
  cadence?: Cadence,
): Promise<ListItem> {
  const tasks = { id: await tasksOf(user, quest) };
  await writeListContents(user.id, quest.id, tasks.id, { kind: "add", text });
  const added = (await readListItems(user.id, quest.id, tasks.id)).find(
    (item) => item.text === text,
  );
  if (added === undefined) {
    throw new Error("The task was not saved");
  }
  if (cadence !== undefined) {
    await writeListContents(user.id, quest.id, tasks.id, {
      kind: "recurring",
      id: added.id,
      cadence,
    });
  }
  return added;
}

async function checkOff(
  user: User,
  quest: Quest,
  task: ListItem,
): Promise<void> {
  await writeListContents(user.id, quest.id, await tasksOf(user, quest), {
    kind: "check",
    id: task.id,
    checkedOff: true,
  });
}

describe("use_case_life", () => {
  test("each user gets one Life, with a Tasks and an Ideas list, however often it is asked for", async () => {
    const user = await testUser();

    await Promise.all([ensureLife(user.id), ensureLife(user.id)]);
    await ensureLife(user.id);

    const quests = await listQuests(user.id);
    expect(quests).toMatchObject([
      { name: LIFE_NAME, life: true, status: "active" },
    ]);
    const [life] = quests;
    if (life === undefined) {
      throw new Error("No Life was made");
    }
    expect(
      (await readLists(user.id, life.id)).map(({ name, type }) => ({
        name,
        type,
      })),
    ).toEqual([
      { name: "Tasks", type: "task" },
      { name: "Ideas", type: "plain" },
    ]);
  });

  test("suggests only Life's own recurring tasks not done in their period, and counts them", async () => {
    const user = await testUser();
    const life = await lifeOf(user);
    const other = await testData(user).quest("Garden");
    const stretch = await addTask(user, life, "Stretch", "daily");
    const sweep = await addTask(user, life, "Sweep", "weekly");
    await addTask(user, life, "Call the bank");
    await addTask(user, other, "Water the roses", "daily");
    await checkOff(user, life, sweep);

    const summary = await readLife(user.id);

    expect(summary).toMatchObject({
      quest: { id: life.id, name: LIFE_NAME },
      recurring: 2,
      doneNow: 1,
      waiting: [{ id: stretch.id, cadence: "daily", streak: 0 }],
      suggestion: { id: stretch.id, text: "Stretch" },
    });
  });

  test("with every recurring task done, suggests none", async () => {
    const user = await testUser();
    const life = await lifeOf(user);
    const stretch = await addTask(user, life, "Stretch", "monthly");
    await checkOff(user, life, stretch);

    expect(await readLife(user.id)).toMatchObject({
      recurring: 1,
      doneNow: 1,
      waiting: [],
      suggestion: undefined,
    });
  });

  test("a user without a Life has none to read", async () => {
    const user = await testUser();

    expect(await readLife(user.id)).toBeUndefined();
  });

  test("Life cannot be completed", async () => {
    const user = await testUser();
    const life = await lifeOf(user);

    expect(
      await changeQuestStatus(user.id, {
        questId: life.id,
        fromStatus: "active",
        toStatus: "completed",
        revision: life.statusRevision,
      }),
    ).toBeUndefined();
    expect((await lifeOf(user)).status).toBe("active");
  });
});

describe("use_case_view_quests", () => {
  test("lists each quest with its open tasks, newest activity first", async () => {
    const user = await testUser();
    const older = await testData(user).quest("Older");
    const newer = await testData(user).quest("Newer");
    const done = await addTask(user, older, "Prune");
    await addTask(user, older, "Plant");
    await checkOff(user, older, done);

    const entries = await readQuestEntries(user.id);

    expect(
      entries.map(({ quest, openTasks }) => ({ id: quest.id, openTasks })),
    ).toEqual([
      { id: older.id, openTasks: 1 },
      { id: newer.id, openTasks: 0 },
    ]);
  });

  test("counts each quest's check-offs this week, but not one taken back", async () => {
    const user = await testUser();
    const busy = await testData(user).quest("Busy");
    const idle = await testData(user).quest("Idle");
    const [prune, plant] = await Promise.all([
      addTask(user, busy, "Prune"),
      addTask(user, busy, "Plant"),
    ]);
    await checkOff(user, busy, prune);
    await checkOff(user, busy, plant);
    await writeListContents(user.id, busy.id, await tasksOf(user, busy), {
      kind: "check",
      id: plant.id,
      checkedOff: false,
    });

    const entries = await readQuestEntries(user.id);
    const rows = finderQuests(entries, new Date());

    expect(
      entries.map(({ quest, doneThisWeek }) => ({
        id: quest.id,
        doneThisWeek,
      })),
    ).toEqual(
      expect.arrayContaining([
        { id: busy.id, doneThisWeek: 1 },
        { id: idle.id, doneThisWeek: 0 },
      ]),
    );
    expect(rows.find(({ quest }) => quest.id === busy.id)?.activity).toBe(
      `${QUEST_FINDER_COPY.active(QUEST_FINDER_COPY.justNow)} · ${QUEST_FINDER_COPY.doneThisWeek(1)}`,
    );
    expect(rows.find(({ quest }) => quest.id === idle.id)?.activity).toBe(
      QUEST_FINDER_COPY.active(QUEST_FINDER_COPY.justNow),
    );
  });
});

describe("use_case_find_quest", () => {
  test("finds tasks of Active quests by text, ignoring case, with how a recurring one repeats", async () => {
    const user = await testUser();
    const garden = await testData(user).quest("Garden");
    const weed = await addTask(user, garden, "Weed the beds", "weekly");
    const fence = await addTask(user, garden, "Mend the BED frame");
    const finished = await testData(user).quest("Old garden");
    await addTask(user, finished, "Weed the old beds");
    await changeQuestStatus(user.id, {
      questId: finished.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: finished.statusRevision,
    });

    const found = await searchTasks(user.id, "bed");

    expect(found).toHaveLength(2);
    expect(found).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: weed.id,
          quest: { id: garden.id, name: "Garden", shared: false },
          repeats: { cadence: "weekly", streak: 0 },
          done: false,
        }),
        expect.objectContaining({ id: fence.id, repeats: undefined }),
      ]),
    );
  });

  test("takes % and _ as themselves, and never finds another user's tasks", async () => {
    const [user, stranger] = await Promise.all([testUser(), testUser()]);
    const quest = await testData(user).quest();
    const theirs = await testData(stranger).quest();
    const percent = await addTask(user, quest, "Save 10% of pay");
    await addTask(user, quest, "Save 100 of pay");
    await addTask(stranger, theirs, "Save 10% too");

    expect((await searchTasks(user.id, "10%")).map(({ id }) => id)).toEqual([
      percent.id,
    ]);
    expect(await searchTasks(user.id, "_")).toEqual([]);
  });

  test("a one-off task checked off is done, and not yet earlier", async () => {
    const user = await testUser();
    const quest = await testData(user).quest();
    const task = await addTask(user, quest, "Buy seeds");
    await checkOff(user, quest, task);

    expect(await searchTasks(user.id, "seeds")).toMatchObject([
      { id: task.id, done: true, earlier: false },
    ]);
  });
});
