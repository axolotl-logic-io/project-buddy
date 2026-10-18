// Issue #479: query-only regressions. Page composition, URL fallback and
// visual coverage belong to the later chats-page composition issue.
import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { createCentralChat } from "@/chats/central-chat.ts";
import { getChat } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { projectIdFixture } from "../id-fixtures.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const OLDEST_AT = new Date("2026-01-01T00:00:00Z");
const TIED_AT = new Date("2026-01-02T00:00:00Z");
const LATER_AT = new Date("2026-01-03T00:00:00Z");
const NEWEST_AT = new Date("2026-01-04T00:00:00Z");

interface AllChatsFixture {
  readonly owner: UserId;
  readonly other: UserId;
  readonly donut: Project;
  readonly fox: Project;
  readonly foreignProject: Project;
  readonly donutChats: readonly [ChatId, ChatId];
  readonly foxChat: ChatId;
  readonly standaloneChats: readonly [ChatId, ChatId];
  readonly foreignChats: readonly ChatId[];
  readonly newestFirst: readonly ChatId[];
}

// Explicit times, rather than insert speed, decide the order. The two tied
// rows deliberately cross project and standalone chat kinds.
async function setCreatedAt(
  owner: UserId,
  id: ChatId,
  createdAt: Date,
): Promise<void> {
  await getDb()
    .update(chats)
    .set({ createdAt })
    .where(and(eq(chats.id, id), chatOwnedBy(owner)));
}

async function twoUsersChats(): Promise<AllChatsFixture> {
  const [user, otherUser] = await Promise.all([testUser(), testUser()]);
  const ownData = testData(user);
  const otherData = testData(otherUser);
  const [donut, fox, foreignProject] = await Promise.all([
    ownData.project("Donut"),
    ownData.project("Fox"),
    otherData.project("Private project"),
  ]);
  const [firstCentral, donutOlder, secondCentral, foxChat, donutNewer] =
    await Promise.all([
      createCentralChat(user.id),
      ownData.chat(donut),
      createCentralChat(user.id),
      ownData.chat(fox),
      ownData.chat(donut),
    ]);
  const [foreignProjectChat, foreignCentral] = await Promise.all([
    otherData.chat(foreignProject),
    createCentralChat(otherUser.id),
  ]);
  await Promise.all([
    setCreatedAt(user.id, firstCentral.id, OLDEST_AT),
    setCreatedAt(user.id, donutOlder.id, TIED_AT),
    setCreatedAt(user.id, secondCentral.id, TIED_AT),
    setCreatedAt(user.id, foxChat.id, LATER_AT),
    setCreatedAt(user.id, donutNewer.id, NEWEST_AT),
    setCreatedAt(otherUser.id, foreignProjectChat.id, OLDEST_AT),
    setCreatedAt(otherUser.id, foreignCentral.id, NEWEST_AT),
  ]);
  return {
    owner: user.id,
    other: otherUser.id,
    donut,
    fox,
    foreignProject,
    donutChats: [donutNewer.id, donutOlder.id],
    foxChat: foxChat.id,
    standaloneChats: [firstCentral.id, secondCentral.id],
    foreignChats: [foreignCentral.id, foreignProjectChat.id],
    newestFirst: [
      donutNewer.id,
      foxChat.id,
      ...[donutOlder.id, secondCentral.id].sort((left, right) =>
        right.localeCompare(left),
      ),
      firstCentral.id,
    ],
  };
}

describe("all chats query", () => {
  test("lists only the owner's project and standalone chats, newest first with descending ids for a tie", async () => {
    const { owner, other, newestFirst, foreignChats } = await twoUsersChats();

    const found = await listAllChats(owner);

    expect(found.map(({ id }) => id)).toEqual(newestFirst);
    expect(
      found.filter(
        ({ createdAt }) => createdAt.getTime() === TIED_AT.getTime(),
      ),
    ).toHaveLength(2);
    expect((await listAllChats(other)).map(({ id }) => id)).toEqual(
      foreignChats,
    );
  });

  test("includes project names and lookup details, never a project name on a standalone chat", async () => {
    const { owner, donut, fox, donutChats, foxChat, standaloneChats } =
      await twoUsersChats();

    const found = await listAllChats(owner);

    expect(found).toEqual(
      await Promise.all(found.map(({ id }) => getChat(owner, id))),
    );
    expect(
      found
        .filter((chat) => chat.kind === "project")
        .map(({ id, projectId, projectName }) => ({
          id,
          projectId,
          projectName,
        })),
    ).toEqual([
      { id: donutChats[0], projectId: donut.id, projectName: donut.name },
      { id: foxChat, projectId: fox.id, projectName: fox.name },
      { id: donutChats[1], projectId: donut.id, projectName: donut.name },
    ]);
    const standalone = found.filter((chat) => chat.kind === "central");
    expect(standalone).toHaveLength(2);
    expect(standalone.map(({ id }) => id)).toEqual(
      expect.arrayContaining([...standaloneChats]),
    );
    for (const chat of standalone) {
      expect(chat).not.toHaveProperty("projectName");
      expect(chat).not.toHaveProperty("projectId");
    }
  });
});

describe("all chats project filter", () => {
  test("filters to an owned project's chats in newest-first order", async () => {
    const { owner, donut, donutChats, fox, foxChat } = await twoUsersChats();

    expect((await listAllChats(owner, donut.id)).map(({ id }) => id)).toEqual(
      donutChats,
    );
    expect((await listAllChats(owner, fox.id)).map(({ id }) => id)).toEqual([
      foxChat,
    ]);
  });

  test("returns no chats for a foreign or nonexistent project for either user", async () => {
    const { owner, other, donut, foreignProject } = await twoUsersChats();
    const unknownProject = projectIdFixture();

    expect(await listAllChats(owner, foreignProject.id)).toEqual([]);
    expect(await listAllChats(owner, unknownProject)).toEqual([]);
    expect(await listAllChats(other, donut.id)).toEqual([]);
    expect(await listAllChats(other, unknownProject)).toEqual([]);
  });

  test("returns an empty list for an owned empty project", async () => {
    const user = await testUser();
    const project = await testData(user).project();

    expect(await listAllChats(user.id, project.id)).toEqual([]);
  });

  test("returns an empty list without creating a chat for a new user", async () => {
    const user = await testUser();

    expect(await listAllChats(user.id)).toEqual([]);
  });
});
