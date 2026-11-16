// Experience in the test database: the points each ability gains from the
// stores that save tasks, ideas, Quick Notes and quest status, the points
// reopening and undo take back, and the points Start Day and removal keep.

import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import type { AbilityPoints } from "@/experience/experience.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { changeIdea, listIdeas } from "@/ideas/idea-store.ts";
import type { QuestId } from "@/ids.ts";
import { saveNote } from "@/notes/note-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import type { TasksUndoOperation } from "@/tasks/tasks.ts";
import {
  changeTasks,
  startTasksDay,
  undoTasksChange,
} from "@/tasks/tasks-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

// Makes the change to the quest's Tasks as user and answers its version.
async function change(
  user: User,
  questId: QuestId,
  operations: readonly TasksUndoOperation[],
): Promise<number> {
  const outcome = await changeTasks(
    user.id,
    { questId, author: "person" },
    operations,
  );
  if (outcome?.kind !== "changed") {
    throw new Error(`Changing Tasks answered ${outcome?.kind}`);
  }
  return outcome.change.version;
}

async function pointsOf(user: User): Promise<AbilityPoints> {
  return (await readExperience(user.id)).points;
}

async function questOf(user: User): Promise<QuestId> {
  return (await testData(user).quest()).id;
}

const ADD_TWO: readonly TasksUndoOperation[] = [
  { op: "add", text: "Wedge the clay" },
  { op: "add", text: "Throw the bowl" },
];

describe("use_case_experience", () => {
  test("a new user is in the first circle with no points", async () => {
    const user = await testUser();
    expect(await readExperience(user.id)).toMatchObject({
      experience: 0,
      circle: 1,
      title: "Initiate",
      nextCircleStart: 5,
    });
  });

  test("each ability gains a point for each thing done, weighted into experience", async () => {
    const user = await testUser();
    const questId = await questOf(user);
    await change(user, questId, ADD_TWO);
    await change(user, questId, [{ op: "complete", task: 1 }]);
    await changeIdea(user.id, { op: "add", questId, text: "A lidded jar" });
    await saveNote(user.id, { questId, text: "The kiln runs hot" });
    await changeQuestStatus(user.id, {
      questId,
      fromStatus: "active",
      toStatus: "completed",
      revision: 0,
    });
    expect(await readExperience(user.id)).toMatchObject({
      points: {
        "adding-tasks": 2,
        ideating: 1,
        noting: 1,
        "completing-tasks": 1,
        "completing-quests": 1,
      },
      experience: 16,
      circle: 3,
    });
  });

  test("reopening a task or undoing its completion takes the point back", async () => {
    const user = await testUser();
    const questId = await questOf(user);
    await change(user, questId, ADD_TWO);
    await change(user, questId, [{ op: "complete", task: 1 }]);
    await change(user, questId, [{ op: "reopen", task: 1 }]);
    expect(await pointsOf(user)).toMatchObject({ "completing-tasks": 0 });
    const completed = await change(user, questId, [
      { op: "complete", task: 2 },
    ]);
    expect(await pointsOf(user)).toMatchObject({ "completing-tasks": 1 });
    await undoTasksChange(user.id, { questId, author: "person" }, completed);
    expect(await pointsOf(user)).toMatchObject({
      "adding-tasks": 2,
      "completing-tasks": 0,
    });
  });

  test("Start Day keeps a recurring task's points, so completing it again gains more, and its undo gains none", async () => {
    const user = await testUser();
    const questId = await questOf(user);
    await change(user, questId, ADD_TWO);
    await change(user, questId, [
      { op: "recur", task: 1, recurring: true },
      { op: "complete", task: 1 },
    ]);
    const { version } = await startTasksDay(user.id, questId, getDb(), false);
    expect(await pointsOf(user)).toMatchObject({ "completing-tasks": 1 });
    if (version === undefined) {
      throw new Error("Start Day reopened nothing");
    }
    await undoTasksChange(user.id, { questId, author: "person" }, version, {
      database: getDb(),
      points: false,
    });
    expect(await pointsOf(user)).toMatchObject({ "completing-tasks": 1 });
    await startTasksDay(user.id, questId, getDb(), false);
    await change(user, questId, [{ op: "complete", task: 1 }]);
    expect(await pointsOf(user)).toMatchObject({ "completing-tasks": 2 });
  });

  test("removing a task or idea keeps its points, and restoring gains none", async () => {
    const user = await testUser();
    const questId = await questOf(user);
    await change(user, questId, ADD_TWO);
    const removed = await change(user, questId, [{ op: "remove", task: 1 }]);
    await undoTasksChange(user.id, { questId, author: "person" }, removed);
    await changeIdea(user.id, { op: "add", questId, text: "A lidded jar" });
    const [idea] = await listIdeas(user.id, questId);
    if (idea === undefined) {
      throw new Error("The idea wasn't saved");
    }
    await changeIdea(user.id, { op: "remove", questId, id: idea.id });
    expect(await pointsOf(user)).toMatchObject({
      "adding-tasks": 2,
      ideating: 1,
    });
  });

  test("a member gains their own points, and reopening takes back whoever's completion it was", async () => {
    const owner = await testUser();
    const member = await testUser();
    const questId = await questOf(owner);
    await addMember(owner, questId, member);
    await change(member, questId, ADD_TWO);
    await change(owner, questId, [{ op: "complete", task: 1 }]);
    expect(await pointsOf(member)).toMatchObject({ "adding-tasks": 2 });
    expect(await pointsOf(owner)).toMatchObject({
      "adding-tasks": 0,
      "completing-tasks": 1,
    });
    await change(member, questId, [{ op: "reopen", task: 1 }]);
    expect(await pointsOf(owner)).toMatchObject({ "completing-tasks": 0 });
  });

  test("reopening a completed quest takes its point back", async () => {
    const user = await testUser();
    const questId = await questOf(user);
    const completed = await changeQuestStatus(user.id, {
      questId,
      fromStatus: "active",
      toStatus: "completed",
      revision: 0,
    });
    if (completed === undefined) {
      throw new Error("The quest wasn't completed");
    }
    expect(await pointsOf(user)).toMatchObject({ "completing-quests": 1 });
    await changeQuestStatus(user.id, {
      ...completed,
      fromStatus: "completed",
      toStatus: "active",
    });
    expect(await pointsOf(user)).toMatchObject({ "completing-quests": 0 });
  });
});
