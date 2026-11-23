import { expect, test, vi } from "vitest";
import { NO_EVENTS } from "@/experience/experience.ts";
import { readExperience } from "@/experience/experience-store.ts";
import {
  CONJURATION,
  conjure,
  startPerformance,
} from "@/performances/performance-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { writeSpaceContents } from "@/spaces/murmling-store.ts";
import { saveQuickNote } from "@/spaces/quick-note-actions.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

// The experience the first circle ends at, where the second starts.
const SECOND_CIRCLE_START = 5;

// A new user's quest and its two starting spaces.
async function ownQuest(): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly quest: Awaited<ReturnType<ReturnType<typeof testData>["quest"]>>;
  readonly tasks: Awaited<ReturnType<typeof listSpaces>>[number];
  readonly ideas: Awaited<ReturnType<typeof listSpaces>>[number];
}> {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const [tasks, ideas] = await listSpaces(owner.id, quest.id);
  if (tasks === undefined || ideas === undefined) {
    throw new Error("Missing spaces");
  }
  return { owner, quest, tasks, ideas };
}

test("use_case_experience", async () => {
  const [owner, member] = await Promise.all([testUser(), testUser()]);
  const quest = await testData(owner).quest();
  await addMember(owner, quest.id, member);
  const [space] = await listSpaces(member.id, quest.id);
  if (space === undefined) {
    throw new Error("Missing space");
  }
  const added = await writeSpaceContents(member.id, quest.id, space.id, {
    kind: "add",
    text: "Pack lunch",
  });
  const task = added.space?.murmlings[0];
  if (task === undefined) {
    throw new Error("Missing task");
  }
  await writeSpaceContents(owner.id, quest.id, space.id, {
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
  await writeSpaceContents(member.id, quest.id, space.id, {
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

test("use_case_experience: removing a murmling keeps its event", async () => {
  const { owner, quest, tasks } = await ownQuest();
  const added = await writeSpaceContents(owner.id, quest.id, tasks.id, {
    kind: "add",
    text: "Sweep the studio",
  });
  const [murmling] = added.space?.murmlings ?? [];
  if (murmling === undefined) {
    throw new Error("Missing murmling");
  }

  expect(
    await writeSpaceContents(owner.id, quest.id, tasks.id, {
      kind: "remove",
      id: murmling.id,
    }),
  ).toMatchObject({ result: "saved", space: { murmlings: [] } });
  expect((await readExperience(owner.id)).counts.adding).toBe(1);
});

test("use_case_experience: a Quick Note and a conjuration each earn Adding", async () => {
  const { owner, quest, tasks, ideas } = await ownQuest();
  await signIn(owner);

  expect(
    await saveQuickNote({
      questId: quest.id,
      spaceId: tasks.id,
      text: "Order cones",
    }),
  ).toEqual({ kind: "saved" });
  expect((await readExperience(owner.id)).counts.adding).toBe(1);

  const performance = await startPerformance(owner.id, quest.id, {
    spaceId: ideas.id,
    riteId: "capture",
  });
  if (performance === undefined) {
    throw new Error("The performance did not start");
  }
  expect(
    await conjure(
      owner.id,
      quest.id,
      CONJURATION.parse({
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
