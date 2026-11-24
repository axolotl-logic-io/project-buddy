import { expect, test } from "vitest";
import {
  markQuestDayTask,
  readQuestDays,
  readStreakQuests,
  startQuestDay,
  undoQuestDay,
} from "@/dailies/quest-day-store.ts";
import { getDb } from "@/db/client.ts";
import { questMembers } from "@/db/tables/quest-members.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { readListItems, writeListContents } from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import {
  listPerformances,
  PERFORMANCE_MESSAGE,
  readPerformanceMessages,
  sendMessage,
  startPerformance,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createOrResumeQuest, listQuests } from "@/quests/store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const FIRST_DATE = "2026-10-20";
const SECOND_DATE = "2026-10-21";

async function dailies(): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly quest: Awaited<ReturnType<typeof createOrResumeQuest>>["quest"];
  readonly first: Awaited<ReturnType<typeof readLists>>[number];
  readonly second: Awaited<ReturnType<typeof readLists>>[number];
}> {
  const owner = await testUser();
  const { quest } = await createOrResumeQuest(
    owner.id,
    QUEST_NAME.parse("Morning"),
    { dailies: true },
  );
  const [first, second] = await readLists(owner.id, quest.id);
  if (first === undefined || second === undefined) {
    throw new Error("Starting lists were not saved");
  }
  return { owner, quest, first, second };
}

test("use_case_start_day", async () => {
  const { owner, quest, first, second } = await dailies();
  expect(
    await startQuestDay(owner.id, quest.id, {
      localDate: FIRST_DATE,
      emptyLists: [],
    }),
  ).toBe(true);
  const added = await writeListContents(owner.id, quest.id, first.id, {
    kind: "add",
    text: "Feed the cat",
  });
  const [task] = added.list?.listItems ?? [];
  if (task === undefined) {
    throw new Error("The task was not saved");
  }
  await writeListContents(owner.id, quest.id, first.id, {
    kind: "recurring",
    id: task.id,
    recurring: true,
  });
  await writeListContents(owner.id, quest.id, first.id, {
    kind: "check",
    id: task.id,
    checkedOff: true,
  });
  const performance = await startPerformance(owner.id, quest.id, {
    riteId: "capture",
    listId: second.id,
  });
  if (performance === undefined) {
    throw new Error("Performance did not start");
  }
  await sendMessage(
    owner.id,
    quest.id,
    PERFORMANCE_MESSAGE.parse({
      id: crypto.randomUUID(),
      performanceId: performance.id,
      text: "Bread for lunch",
    }),
  );
  const experience = await readExperience(owner.id);
  const outsider = await testUser();
  expect(
    await startQuestDay(outsider.id, quest.id, {
      localDate: SECOND_DATE,
      emptyLists: [],
    }),
  ).toBe(false);
  const { quest: named } = await createOrResumeQuest(
    owner.id,
    QUEST_NAME.parse("Dailies"),
    {},
  );
  expect(
    await startQuestDay(owner.id, named.id, {
      localDate: SECOND_DATE,
      emptyLists: [],
    }),
  ).toBe(false);
  expect(
    await startQuestDay(owner.id, quest.id, {
      localDate: SECOND_DATE,
      emptyLists: [second.id],
    }),
  ).toBe(true);
  expect(await readListItems(owner.id, quest.id, second.id)).toEqual([]);
  expect((await readListItems(owner.id, quest.id, first.id))[0]).toMatchObject({
    id: task.id,
    checkedOff: false,
    recurring: true,
  });
  expect(await listPerformances(owner.id, quest.id)).toMatchObject([
    { id: performance.id, endedAt: expect.any(Date) },
  ]);
  expect(await readQuestDays(owner.id, quest.id)).toMatchObject({
    undoable: true,
    days: [
      { date: FIRST_DATE, tasks: [{ text: "Feed the cat", done: true }] },
      { date: SECOND_DATE },
    ],
  });
  expect(await readExperience(owner.id)).toEqual(experience);
});

test("use_case_undo_start_day", async () => {
  const { owner, quest, second } = await dailies();
  const performance = await startPerformance(owner.id, quest.id, {
    riteId: "capture",
    listId: second.id,
  });
  if (performance === undefined) {
    throw new Error("Performance did not start");
  }
  await sendMessage(
    owner.id,
    quest.id,
    PERFORMANCE_MESSAGE.parse({
      id: crypto.randomUUID(),
      performanceId: performance.id,
      text: "Before the day",
    }),
  );
  const start = { localDate: FIRST_DATE, emptyLists: [second.id] };
  await startQuestDay(owner.id, quest.id, start);
  await writeListContents(owner.id, quest.id, second.id, {
    kind: "add",
    text: "Added by hand",
  });
  const outsider = await testUser();
  expect(await undoQuestDay(outsider.id, quest.id)).toBe(false);
  const experience = await readExperience(owner.id);
  expect(await undoQuestDay(owner.id, quest.id)).toBe(true);
  expect(await readExperience(owner.id)).toEqual(experience);
  expect(
    (await readListItems(owner.id, quest.id, second.id)).map(
      ({ text }) => text,
    ),
  ).toEqual(["Before the day", "Added by hand"]);
  expect(await listPerformances(owner.id, quest.id)).toMatchObject([
    { id: performance.id, endedAt: null },
  ]);
  expect(await readPerformanceMessages(owner.id, performance.id)).toMatchObject(
    [{ text: "Before the day" }],
  );
  expect(await readQuestDays(owner.id, quest.id)).toEqual({
    days: [],
    undoable: false,
  });

  await startQuestDay(owner.id, quest.id, start);
  const replacement = await startPerformance(owner.id, quest.id, {
    riteId: "capture",
    listId: second.id,
  });
  if (replacement === undefined) {
    throw new Error("Performance did not restart");
  }
  await sendMessage(
    owner.id,
    quest.id,
    PERFORMANCE_MESSAGE.parse({
      id: crypto.randomUUID(),
      performanceId: replacement.id,
      text: "After the day",
    }),
  );
  expect(await undoQuestDay(owner.id, quest.id)).toBe(false);
});

test("use_case_dailies: starting Dailies twice at once makes one quest, and each user has their own", async () => {
  const [owner, other] = await Promise.all([testUser(), testUser()]);
  const name = QUEST_NAME.parse("Dailies");
  const started = await Promise.all(
    [owner, owner, other].map((user) =>
      createOrResumeQuest(user.id, name, { dailies: true }),
    ),
  );
  const [first, second, theirs] = started.map(({ quest }) => quest.id);
  if (first === undefined) {
    throw new Error("Dailies did not start");
  }

  expect(second).toBe(first);
  expect(theirs).not.toBe(first);
  expect(started.map(({ resumed }) => resumed).sort()).toEqual([
    false,
    false,
    true,
  ]);
  const [ownQuests, otherQuests, lists] = await Promise.all([
    listQuests(owner.id),
    listQuests(other.id),
    readLists(owner.id, first),
  ]);
  expect(ownQuests).toMatchObject([{ id: first, dailies: true }]);
  expect(otherQuests).toMatchObject([{ id: theirs, dailies: true }]);
  expect(lists.map(({ name: listName }) => listName)).toEqual([
    "Tasks",
    "Ideas",
  ]);
});

test("use_case_home_streaks: the owner reads their streaks and changes an ended day's mark", async () => {
  const { owner, quest, first } = await dailies();
  const added = await writeListContents(owner.id, quest.id, first.id, {
    kind: "add",
    text: "Feed the cat",
  });
  const [task] = added.list?.listItems ?? [];
  if (task === undefined || task.taskNumber === null) {
    throw new Error("The task was not saved");
  }
  const number = task.taskNumber;
  await writeListContents(owner.id, quest.id, first.id, {
    kind: "recurring",
    id: task.id,
    recurring: true,
  });
  await startQuestDay(owner.id, quest.id, {
    localDate: FIRST_DATE,
    emptyLists: [],
  });
  await writeListContents(owner.id, quest.id, first.id, {
    kind: "check",
    id: task.id,
    checkedOff: true,
  });
  await startQuestDay(owner.id, quest.id, {
    localDate: SECOND_DATE,
    emptyLists: [],
  });
  const [member, stranger] = await Promise.all([testUser(), testUser()]);
  // A Dailies quest can't be shared, so the test adds the member itself to
  // show a member still has no streaks there.
  await getDb()
    .insert(questMembers)
    .values({ questId: quest.id, userId: member.id });

  expect(await readStreakQuests(owner.id)).toEqual([
    {
      quest: { id: quest.id, name: "Morning" },
      days: [
        {
          date: FIRST_DATE,
          startedAt: expect.any(Date),
          tasks: [{ number, text: "Feed the cat", done: true }],
        },
        { date: SECOND_DATE, startedAt: expect.any(Date), tasks: undefined },
      ],
      tasks: {
        items: [
          {
            id: task.id,
            listId: first.id,
            number,
            text: "Feed the cat",
            done: false,
            recurring: true,
          },
        ],
      },
    },
  ]);
  expect(await readStreakQuests(member.id)).toEqual([]);
  expect(await readStreakQuests(stranger.id)).toEqual([]);

  const unmark = { localDate: FIRST_DATE, number, done: false };
  expect(await markQuestDayTask(member.id, quest.id, unmark)).toBe(false);
  expect(await markQuestDayTask(stranger.id, quest.id, unmark)).toBe(false);
  expect(
    await markQuestDayTask(owner.id, quest.id, { ...unmark, number: 99 }),
  ).toBe(false);
  // The day still going is the task's own check, not a recorded day.
  expect(
    await markQuestDayTask(owner.id, quest.id, {
      ...unmark,
      localDate: SECOND_DATE,
    }),
  ).toBe(false);
  expect((await readQuestDays(owner.id, quest.id)).days[0]?.tasks).toEqual([
    { number, text: "Feed the cat", done: true },
  ]);

  expect(await markQuestDayTask(owner.id, quest.id, unmark)).toBe(true);
  expect((await readQuestDays(owner.id, quest.id)).days[0]?.tasks).toEqual([
    { number, text: "Feed the cat", done: false },
  ]);
});
