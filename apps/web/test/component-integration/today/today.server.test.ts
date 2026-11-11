// What Home reads to offer Continue, against the test database: the
// Active quest whose conversation was most recently active, with its next
// step and whether it is unread for the viewer. "use_case_today_on_landing".
import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { markChatUnreadFor } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, ProjectId, UserId } from "@/ids.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { saveMemory } from "@/memory/memory-store.ts";
import { changeQuestStatus } from "@/projects/quest-status-store.ts";
import { readHomeSummary } from "@/today/today-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formerMemberQuest } from "../accounts/former-member-quest-test-kit.ts";

// Explicit start times, oldest first, decide the order of conversations
// with no messages; a message saved now is newer than any of them.
const STARTED_AT = [
  new Date("2026-01-01T00:00:00Z"),
  new Date("2026-01-02T00:00:00Z"),
  new Date("2026-01-03T00:00:00Z"),
] as const;

const HELLO = [
  { message: "Hello", reply: [{ type: "text", text: "Hi!" }] },
] as const;

async function setStartedAt(
  owner: UserId,
  id: ChatId,
  createdAt: Date,
): Promise<void> {
  await getDb()
    .update(chats)
    .set({ createdAt })
    .where(and(eq(chats.id, id), chatOpenTo(owner)));
}

async function saveText(
  owner: UserId,
  projectId: ProjectId,
  text: string,
): Promise<void> {
  await saveMemory(owner, {
    projectId,
    text,
    basedOn: EMPTY_MEMORY.version,
    author: "user",
  });
}

describe("use_case_today_on_landing", () => {
  test("a new user has nothing to continue, on their first visit", async () => {
    const user = await testUser();

    expect(await readHomeSummary(user.id)).toEqual({
      latestQuest: undefined,
      firstVisit: true,
    });
  });

  test("continues the quest whose conversation was most recently active, with its next step", async () => {
    const [user, other] = await Promise.all([testUser(), testUser()]);
    const data = testData(user);
    const [turtle, garden, idle] = await Promise.all([
      data.project("Sea turtle model"),
      data.project("Garden planner"),
      data.project("Idle project"),
    ]);
    const [turtleChat, gardenChat, idleChat] = await Promise.all([
      data.chat(turtle),
      data.chat(garden),
      data.chat(idle),
    ]);
    const otherData = testData(other);
    await otherData.chat(await otherData.project("Private project"));
    await Promise.all([
      setStartedAt(user.id, idleChat.id, STARTED_AT[0]),
      setStartedAt(user.id, turtleChat.id, STARTED_AT[1]),
      setStartedAt(user.id, gardenChat.id, STARTED_AT[2]),
      saveText(user.id, turtle.id, "# Turtle\n\nNext step: retopo the flipper"),
    ]);
    expect((await readHomeSummary(user.id)).latestQuest?.project.id).toBe(
      garden.id,
    );

    // A message makes the turtle's conversation the most recently active.
    await data.exchanges(turtleChat, HELLO);

    expect(await readHomeSummary(user.id)).toEqual({
      latestQuest: {
        project: { id: turtle.id, name: "Sea turtle model" },
        nextStep: "retopo the flipper",
        unread: false,
      },
      firstVisit: false,
    });
  });

  test("marks the quest unread for the viewer alone", async () => {
    const quest = await formerMemberQuest();
    await markChatUnreadFor(quest.chat.id, [quest.member.id]);

    const [owner, member] = await Promise.all([
      readHomeSummary(quest.owner.id),
      readHomeSummary(quest.member.id),
    ]);

    expect(owner.latestQuest?.unread).toBe(false);
    expect(member.latestQuest).toBeUndefined();
  });

  test("Chat alone is no quest to continue, and no first visit", async () => {
    const user = await testUser();
    await privateChat(user.id);

    expect(await readHomeSummary(user.id)).toEqual({
      latestQuest: undefined,
      firstVisit: false,
    });
  });
});

test("Home continues only the owner's active quests", async () => {
  const quest = await formerMemberQuest();
  const other = await testUser();
  const data = testData(quest.owner);
  const completed = await data.project("Finished");
  await data.chat(completed);
  await changeQuestStatus(quest.owner.id, {
    projectId: completed.id,
    fromStatus: "active",
    toStatus: "completed",
    revision: 0,
  });
  expect((await readHomeSummary(quest.owner.id)).latestQuest?.project.id).toBe(
    quest.project.id,
  );
  for (const summary of await Promise.all(
    [quest.member, other].map((user) => readHomeSummary(user.id)),
  )) {
    expect(summary.latestQuest).toBeUndefined();
  }
  await changeQuestStatus(quest.owner.id, {
    projectId: quest.project.id,
    fromStatus: "active",
    toStatus: "abandoned",
    revision: 0,
  });
  expect((await readHomeSummary(quest.owner.id)).latestQuest).toBeUndefined();
});

test("Home ignores a former membership and keeps first-visit semantics for completed quests", async () => {
  const quest = await formerMemberQuest();
  expect(await readHomeSummary(quest.member.id)).toEqual({
    latestQuest: undefined,
    firstVisit: true,
  });
  await changeQuestStatus(quest.owner.id, {
    projectId: quest.project.id,
    fromStatus: "active",
    toStatus: "completed",
    revision: 0,
  });
  expect(await readHomeSummary(quest.owner.id)).toEqual({
    latestQuest: undefined,
    firstVisit: false,
  });
});
