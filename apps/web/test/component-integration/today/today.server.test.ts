// What the landing page's Today section reads, against the test database:
// the owner's most recently active projects with their next steps and
// latest chats, and their other recent chats. "use_case_today_on_landing".
import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, ProjectId, UserId } from "@/ids.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { saveMemory } from "@/memory/memory-store.ts";
import { removeProjectMember } from "@/projects/members-store.ts";
import { changeQuestStatus } from "@/projects/quest-status-store.ts";
import { hasToday } from "@/today/today.ts";
import { readHomeSummary, readToday } from "@/today/today-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { teamProject } from "../projects/team-project-test-kit.ts";

// Explicit start times, oldest first, decide the order of chats with no
// messages; a message saved now is newer than any of them.
const STARTED_AT = [
  new Date("2026-01-01T00:00:00Z"),
  new Date("2026-01-02T00:00:00Z"),
  new Date("2026-01-03T00:00:00Z"),
  new Date("2026-01-04T00:00:00Z"),
  new Date("2026-01-05T00:00:00Z"),
  new Date("2026-01-06T00:00:00Z"),
] as const;

// One more chat than Today lists.
const MORE_THAN_TODAY_LISTS = 4;

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
  test("a new user has nothing waiting", async () => {
    const user = await testUser();
    const today = await readToday(user.id);
    expect(await readHomeSummary(user.id)).toEqual({
      latestQuest: today.projects[0],
      firstVisit: today.projects.length === 0 && today.chats.length === 0,
    });
    expect(today).toEqual({ projects: [], chats: [] });
    expect(hasToday(today)).toBe(false);
  });

  test("lists the most recently active projects with their next steps and latest chats", async () => {
    const [user, other] = await Promise.all([testUser(), testUser()]);
    const data = testData(user);
    const [turtle, garden, fox, idle] = await Promise.all([
      data.project("Sea turtle model"),
      data.project("Garden planner"),
      data.project("Low-poly fox"),
      data.project("Idle project"),
    ]);
    const [turtleOld, turtleNew, gardenChat, foxChat, idleChat] =
      await Promise.all([
        data.chat(turtle),
        data.chat(turtle),
        data.chat(garden),
        data.chat(fox),
        data.chat(idle),
      ]);
    const otherData = testData(other);
    const foreign = await otherData.project("Private project");
    await otherData.chat(foreign);
    await Promise.all([
      setStartedAt(user.id, idleChat.id, STARTED_AT[0]),
      setStartedAt(user.id, turtleOld.id, STARTED_AT[1]),
      setStartedAt(user.id, foxChat.id, STARTED_AT[2]),
      setStartedAt(user.id, turtleNew.id, STARTED_AT[3]),
      setStartedAt(user.id, gardenChat.id, STARTED_AT[4]),
      saveText(user.id, turtle.id, "# Turtle\n\nNext step: retopo the flipper"),
      saveText(user.id, garden.id, "Goal: a vegetable garden."),
    ]);
    // A message makes the oldest turtle chat the most recently active chat.
    await data.exchanges(turtleOld, HELLO);

    const today = await readToday(user.id);
    expect(await readHomeSummary(user.id)).toEqual({
      latestQuest: today.projects[0],
      firstVisit: today.projects.length === 0 && today.chats.length === 0,
    });

    expect(today.projects).toEqual([
      {
        project: { id: turtle.id, name: "Sea turtle model" },
        nextStep: "retopo the flipper",
        latestChat: turtleOld.id,
      },
      {
        project: { id: garden.id, name: "Garden planner" },
        nextStep: undefined,
        latestChat: gardenChat.id,
      },
      {
        project: { id: fox.id, name: "Low-poly fox" },
        nextStep: undefined,
        latestChat: foxChat.id,
      },
    ]);
    // The chats a Continue link opens aren't repeated.
    expect(today.chats.map(({ id }) => id)).toEqual([
      turtleNew.id,
      idleChat.id,
    ]);
    expect(hasToday(today)).toBe(true);
  });

  test("lists standalone chats, at most three, and never another user's", async () => {
    const [user, other] = await Promise.all([testUser(), testUser()]);
    const standalone = await Promise.all(
      STARTED_AT.slice(0, MORE_THAN_TODAY_LISTS).map(() =>
        privateChat(user.id),
      ),
    );
    await privateChat(other.id);
    await Promise.all(
      standalone.map((chat, index) =>
        setStartedAt(user.id, chat.id, STARTED_AT[index] ?? STARTED_AT[0]),
      ),
    );

    const today = await readToday(user.id);
    expect(await readHomeSummary(user.id)).toEqual({
      latestQuest: today.projects[0],
      firstVisit: today.projects.length === 0 && today.chats.length === 0,
    });

    expect(today.projects).toEqual([]);
    expect(today.chats.map(({ id }) => id)).toEqual(
      standalone
        .slice(1)
        .reverse()
        .map(({ id }) => id),
    );
    expect(today.chats.every(({ project }) => project === undefined)).toBe(
      true,
    );
  });
});

test("Home continues only active quests for owners and members", async () => {
  const team = await teamProject();
  const other = await testUser();
  const data = testData(team.owner);
  const completed = await data.project("Finished");
  await data.chat(completed);
  await changeQuestStatus(team.owner.id, {
    projectId: completed.id,
    fromStatus: "active",
    toStatus: "completed",
    revision: 0,
  });
  const active = await Promise.all(
    [team.owner, team.member].map((user) => readToday(user.id)),
  );
  for (const today of active) {
    expect(today.projects.map(({ project }) => project.id)).toEqual([
      team.project.id,
    ]);
  }
  expect((await readToday(other.id)).projects).toEqual([]);
  await changeQuestStatus(team.owner.id, {
    projectId: team.project.id,
    fromStatus: "active",
    toStatus: "abandoned",
    revision: 0,
  });
  const finished = await Promise.all(
    [team.owner, team.member].map((user) => readToday(user.id)),
  );
  for (const today of finished) {
    expect(today.projects).toEqual([]);
  }
});

test("Home forgets membership immediately and keeps first-visit semantics for completed quests", async () => {
  const team = await teamProject();
  expect((await readHomeSummary(team.member.id)).latestQuest?.project.id).toBe(
    team.project.id,
  );
  await removeProjectMember(team.owner.id, team.project.id, team.member.id);
  expect(await readHomeSummary(team.member.id)).toEqual({
    latestQuest: undefined,
    firstVisit: true,
  });
  await changeQuestStatus(team.owner.id, {
    projectId: team.project.id,
    fromStatus: "active",
    toStatus: "completed",
    revision: 0,
  });
  expect(await readHomeSummary(team.owner.id)).toEqual({
    latestQuest: undefined,
    firstVisit: false,
  });
});
