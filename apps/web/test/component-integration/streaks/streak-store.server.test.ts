// "use_case_recurring_tasks" and "use_case_daily_streaks" in
// use-cases/tasks.md, against the test database: a recurring task checked
// off before midnight in its quest owner's time zone reads unchecked after
// it, and the quest's history gives each task's check-off dates in that
// time zone.

import { and, eq, sql } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { saveTimeZone } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { listItems } from "@/db/tables/lists.ts";
import { readExperience } from "@/experience/experience-store.ts";
import type { ListItem } from "@/lists/list-item-store.ts";
import {
  readListItems,
  readNextTask,
  writeListContents,
} from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import type { Quest } from "@/quests/store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import { localDate } from "@/streaks/streaks.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";

interface Morning {
  readonly owner: User;
  readonly quest: Quest;
  readonly tasks: Awaited<ReturnType<typeof readLists>>[number];
  readonly stretch: ListItem;
  readonly water: ListItem;
}

// The owner's quest with two tasks checked off today: Stretch, recurring,
// and Water, a one-off.
async function morning(): Promise<Morning> {
  const owner = await testUser();
  const quest = await testData(owner).quest("Morning");
  const [tasks] = await readLists(owner.id, quest.id);
  if (tasks === undefined) {
    throw new Error("The starting lists were not saved");
  }
  // Added one after the other, so Stretch takes the first task number.
  await writeListContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Stretch",
  });
  await writeListContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Water the plants",
  });
  const [stretch, water] = await readListItems(owner.id, quest.id, tasks.id);
  if (stretch === undefined || water === undefined) {
    throw new Error("The tasks were not saved");
  }
  await writeListContents(owner.id, quest.id, tasks.id, {
    kind: "recurring",
    id: stretch.id,
    recurring: true,
  });
  await Promise.all(
    [stretch, water].map(({ id }) =>
      writeListContents(owner.id, quest.id, tasks.id, {
        kind: "check",
        id,
        checkedOff: true,
      }),
    ),
  );
  return { owner, quest, tasks, stretch, water };
}

const DAY_MS = 86_400_000;

// Moves the quest's check-offs, and the dates they were saved on, a day
// back, as though midnight had passed since.
async function passMidnight(quest: Quest): Promise<void> {
  const db = getDb();
  await db
    .update(listItems)
    .set({
      checkedOffOn: sql`${listItems.checkedOffOn} - 1`,
    })
    .where(eq(listItems.questId, quest.id));
  await db
    .update(events)
    .set({ gainedAt: sql`${events.gainedAt} - interval '1 day'` })
    .where(and(eq(events.questId, quest.id), eq(events.event, "checking-off")));
}

describe("use_case_recurring_tasks", () => {
  test("after midnight a recurring task reads unchecked and is the next task, and keeps its experience", async () => {
    const { owner, quest, tasks, stretch, water } = await morning();
    expect(
      (await readListItems(owner.id, quest.id, tasks.id)).map(
        ({ text, checkedOff }) => ({ text, checkedOff }),
      ),
    ).toEqual([
      { text: "Stretch", checkedOff: true },
      { text: "Water the plants", checkedOff: true },
    ]);
    expect(await readNextTask(owner.id, quest.id)).toBeUndefined();
    const experience = await readExperience(owner.id);

    await passMidnight(quest);

    expect(await readListItems(owner.id, quest.id, tasks.id)).toMatchObject([
      { id: stretch.id, checkedOff: false, recurring: true },
      { id: water.id, checkedOff: true, recurring: false },
    ]);
    expect(await readNextTask(owner.id, quest.id)).toMatchObject({
      id: stretch.id,
    });
    expect(await readExperience(owner.id)).toEqual(experience);

    // Checking it off again counts for today.
    await writeListContents(owner.id, quest.id, tasks.id, {
      kind: "check",
      id: stretch.id,
      checkedOff: true,
    });
    expect(
      (await readListItems(owner.id, quest.id, tasks.id))[0],
    ).toMatchObject({ checkedOff: true });
  });

  test("midnight comes in the owner's time zone", async () => {
    const { owner, quest, tasks } = await morning();
    // Kiritimati is 14 hours ahead of UTC, so from 10:00 UTC its today is
    // UTC's tomorrow, and the task checked off on UTC's today reads
    // unchecked.
    expect(await saveTimeZone(owner.id, "Pacific/Kiritimati")).toBe(true);
    const ahead = localDate(new Date(), "Pacific/Kiritimati");
    const [stretch] = await readListItems(owner.id, quest.id, tasks.id);
    expect(stretch?.checkedOff).toBe(ahead === localDate(new Date(), "UTC"));
  });
});

describe("use_case_daily_streaks", () => {
  test("the history gives each task's check-off dates, and today, in the owner's time zone", async () => {
    const { owner, quest, tasks, stretch } = await morning();
    await passMidnight(quest);
    await writeListContents(owner.id, quest.id, tasks.id, {
      kind: "check",
      id: stretch.id,
      checkedOff: true,
    });
    const today = localDate(new Date(), "UTC");
    const yesterday = localDate(new Date(Date.now() - DAY_MS), "UTC");

    const history = await readTaskHistory(owner.id, quest.id);

    expect(history).toEqual({
      today,
      timeZone: "UTC",
      checkOffs: expect.arrayContaining([
        { number: stretch.taskNumber, dates: [yesterday, today] },
      ]),
    });
    expect(await readRecurringTasks(owner.id, quest.id)).toEqual([
      {
        number: stretch.taskNumber,
        text: "Stretch",
        done: true,
        createdAt: stretch.createdAt,
      },
    ]);
  });

  test("a member reads the owner's history, with the member's check-offs, and a stranger reads none", async () => {
    const { owner, quest, tasks } = await morning();
    const [member, stranger] = [await testUser(), await testUser()];
    await addMember(owner, quest.id, member);
    await passMidnight(quest);
    const [stretch] = await readListItems(member.id, quest.id, tasks.id);
    if (stretch === undefined) {
      throw new Error("The member can't read the task");
    }
    await writeListContents(member.id, quest.id, tasks.id, {
      kind: "check",
      id: stretch.id,
      checkedOff: true,
    });

    const history = await readTaskHistory(member.id, quest.id);
    expect(history?.checkOffs).toContainEqual({
      number: stretch.taskNumber,
      dates: [
        localDate(new Date(Date.now() - DAY_MS), "UTC"),
        localDate(new Date(), "UTC"),
      ],
    });
    expect(await readTaskHistory(stranger.id, quest.id)).toBeUndefined();
    expect(await readRecurringTasks(stranger.id, quest.id)).toEqual([]);
  });
});
