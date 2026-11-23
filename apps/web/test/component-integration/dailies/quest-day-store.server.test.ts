import { expect, test } from "vitest";
import {
  readQuestDays,
  startQuestDay,
  undoQuestDay,
} from "@/dailies/quest-day-store.ts";
import { readExperience } from "@/experience/experience-store.ts";
import {
  CONJURATION,
  conjure,
  listPerformances,
  readConjurations,
  startPerformance,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createOrResumeQuest } from "@/quests/store.ts";
import { listMurmlings, writeSpaceContents } from "@/spaces/murmling-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const FIRST_DATE = "2026-10-20";
const SECOND_DATE = "2026-10-21";

async function dailies(): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly quest: Awaited<ReturnType<typeof createOrResumeQuest>>["quest"];
  readonly first: Awaited<ReturnType<typeof listSpaces>>[number];
  readonly second: Awaited<ReturnType<typeof listSpaces>>[number];
}> {
  const owner = await testUser();
  const { quest } = await createOrResumeQuest(
    owner.id,
    QUEST_NAME.parse("Morning"),
    { dailies: true },
  );
  const [first, second] = await listSpaces(owner.id, quest.id);
  if (first === undefined || second === undefined) {
    throw new Error("Starting spaces were not saved");
  }
  return { owner, quest, first, second };
}

test("use_case_start_day", async () => {
  const { owner, quest, first, second } = await dailies();
  expect(
    await startQuestDay(owner.id, quest.id, {
      localDate: FIRST_DATE,
      emptySpaces: [],
    }),
  ).toBe(true);
  const added = await writeSpaceContents(owner.id, quest.id, first.id, {
    kind: "add",
    text: "Feed the cat",
  });
  const [task] = added.space?.murmlings ?? [];
  if (task === undefined) {
    throw new Error("The task was not saved");
  }
  await writeSpaceContents(owner.id, quest.id, first.id, {
    kind: "recurring",
    id: task.id,
    recurring: true,
  });
  await writeSpaceContents(owner.id, quest.id, first.id, {
    kind: "check",
    id: task.id,
    checkedOff: true,
  });
  const performance = await startPerformance(owner.id, quest.id, {
    riteId: "capture",
    spaceId: second.id,
  });
  if (performance === undefined) {
    throw new Error("Performance did not start");
  }
  await conjure(
    owner.id,
    quest.id,
    CONJURATION.parse({
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
      emptySpaces: [],
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
      emptySpaces: [],
    }),
  ).toBe(false);
  expect(
    await startQuestDay(owner.id, quest.id, {
      localDate: SECOND_DATE,
      emptySpaces: [second.id],
    }),
  ).toBe(true);
  expect(await listMurmlings(owner.id, quest.id, second.id)).toEqual([]);
  expect((await listMurmlings(owner.id, quest.id, first.id))[0]).toMatchObject({
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
    spaceId: second.id,
  });
  if (performance === undefined) {
    throw new Error("Performance did not start");
  }
  await conjure(
    owner.id,
    quest.id,
    CONJURATION.parse({
      id: crypto.randomUUID(),
      performanceId: performance.id,
      text: "Before the day",
    }),
  );
  const start = { localDate: FIRST_DATE, emptySpaces: [second.id] };
  await startQuestDay(owner.id, quest.id, start);
  await writeSpaceContents(owner.id, quest.id, second.id, {
    kind: "add",
    text: "Added by hand",
  });
  const outsider = await testUser();
  expect(await undoQuestDay(outsider.id, quest.id)).toBe(false);
  expect(await undoQuestDay(owner.id, quest.id)).toBe(true);
  expect(
    (await listMurmlings(owner.id, quest.id, second.id)).map(
      ({ text }) => text,
    ),
  ).toEqual(["Before the day", "Added by hand"]);
  expect(await listPerformances(owner.id, quest.id)).toMatchObject([
    { id: performance.id, endedAt: null },
  ]);
  expect(await readConjurations(owner.id, performance.id)).toMatchObject([
    { text: "Before the day" },
  ]);
  expect(await readQuestDays(owner.id, quest.id)).toEqual({
    days: [],
    undoable: false,
  });

  await startQuestDay(owner.id, quest.id, start);
  const replacement = await startPerformance(owner.id, quest.id, {
    riteId: "capture",
    spaceId: second.id,
  });
  if (replacement === undefined) {
    throw new Error("Performance did not restart");
  }
  await conjure(
    owner.id,
    quest.id,
    CONJURATION.parse({
      id: crypto.randomUUID(),
      performanceId: replacement.id,
      text: "After the day",
    }),
  );
  expect(await undoQuestDay(owner.id, quest.id)).toBe(false);
});
