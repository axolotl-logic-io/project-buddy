import { expect, test, vi } from "vitest";
import { NO_EVENTS } from "@/experience/experience.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { writeListContents } from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import { saveQuickAdd } from "@/lists/quick-add-actions.ts";
import {
  PERFORMANCE_MESSAGE,
  sendMessage,
  startPerformance,
} from "@/performances/performance-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

// The experience the first circle ends at, where the second starts.
const SECOND_CIRCLE_START = 5;

// A new user's quest and its two starting lists.
async function ownQuest(): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly quest: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  readonly tasks: Awaited<ReturnType<typeof readLists>>[number];
  readonly ideas: Awaited<ReturnType<typeof readLists>>[number];
}> {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const [tasks, ideas] = await readLists(owner.id, quest.id);
  if (tasks === undefined || ideas === undefined) {
    throw new Error("Missing lists");
  }
  return { owner, quest, tasks, ideas };
}

test("use_case_experience", async () => {
  const [owner, member] = await Promise.all([testUser(), testUser()]);
  const quest = await testData(owner).quest();
  await addMember(owner, quest.id, member);
  const [list] = await readLists(member.id, quest.id);
  if (list === undefined) {
    throw new Error("Missing list");
  }
  const added = await writeListContents(member.id, quest.id, list.id, {
    kind: "add",
    text: "Pack lunch",
  });
  const task = added.list?.listItems[0];
  if (task === undefined) {
    throw new Error("Missing task");
  }
  await writeListContents(owner.id, quest.id, list.id, {
    kind: "check",
    id: task.id,
    checkedOff: true,
  });
  await changeQuestStatus(member.id, {
    questId: quest.id,
    fromStatus: "active",
    toStatus: "completed",
    revision: 0,
  });
  expect((await readExperience(member.id)).counts).toMatchObject({
    adding: 1,
    "completing-quests": 1,
  });
  expect((await readExperience(owner.id)).counts["checking-off"]).toBe(1);
  await writeListContents(member.id, quest.id, list.id, {
    kind: "check",
    id: task.id,
    checkedOff: false,
  });
  await changeQuestStatus(owner.id, {
    questId: quest.id,
    fromStatus: "completed",
    toStatus: "active",
    revision: 1,
  });
  expect((await readExperience(member.id)).experience).toBe(1);
  expect((await readExperience(owner.id)).experience).toBe(0);
});

test("use_case_experience: a new user starts at Circle 1 · Initiate with no events", async () => {
  const user = await testUser();

  expect(await readExperience(user.id)).toEqual({
    counts: NO_EVENTS,
    experience: 0,
    circle: 1,
    title: "Initiate",
    circleStart: 0,
    nextCircleStart: SECOND_CIRCLE_START,
  });
});

test("use_case_experience: removing a list item keeps its event", async () => {
  const { owner, quest, tasks } = await ownQuest();
  const added = await writeListContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Sweep the studio",
  });
  const [listItem] = added.list?.listItems ?? [];
  if (listItem === undefined) {
    throw new Error("Missing list item");
  }

  expect(
    await writeListContents(owner.id, quest.id, tasks.id, {
      kind: "remove",
      id: listItem.id,
    }),
  ).toMatchObject({ result: "saved", list: { listItems: [] } });
  expect((await readExperience(owner.id)).counts.adding).toBe(1);
});

test("use_case_experience: Quick Add and a message each earn Adding", async () => {
  const { owner, quest, tasks, ideas } = await ownQuest();
  await signIn(owner);

  expect(
    await saveQuickAdd({
      questId: quest.id,
      listId: tasks.id,
      text: "Order cones",
    }),
  ).toEqual({ kind: "saved" });
  expect((await readExperience(owner.id)).counts.adding).toBe(1);

  const performance = await startPerformance(owner.id, quest.id, {
    listId: ideas.id,
    riteId: "capture",
  });
  if (performance === undefined) {
    throw new Error("The performance did not start");
  }
  expect(
    await sendMessage(
      owner.id,
      quest.id,
      PERFORMANCE_MESSAGE.parse({
        id: crypto.randomUUID(),
        performanceId: performance.id,
        text: "Try a celadon glaze",
      }),
    ),
  ).toMatchObject({ added: 1 });
  expect((await readExperience(owner.id)).counts).toEqual({
    ...NO_EVENTS,
    adding: 2,
  });
});
