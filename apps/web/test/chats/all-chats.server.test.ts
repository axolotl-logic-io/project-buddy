// Issue #479: query-only regressions. Page composition, URL fallback and
// visual coverage belong to the later chats-page composition issue.
import { and, eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { getBuddy } from "@/buddies/index.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { getChat, renameChat } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { projectIdFixture } from "../id-fixtures.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";
import { chatNameFixture } from "./chat-name-fixtures.ts";

const OLDEST_AT = new Date("2026-01-01T00:00:00Z");
const DONUT_OLDER_AT = new Date("2026-01-02T00:00:00Z");
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

// Explicit times, rather than insert speed, decide the order. Fixed-id ties
// are covered by all-chats-edges.server.test.ts.
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
  const [firstStandalone, donutOlder, secondStandalone, foxChat, donutNewer] =
    await Promise.all([
      createStandaloneChat(user.id),
      ownData.chat(donut, "mr-tee"),
      createStandaloneChat(user.id),
      ownData.chat(fox),
      ownData.chat(donut),
    ]);
  const [foreignProjectChat, foreignStandalone] = await Promise.all([
    otherData.chat(foreignProject),
    createStandaloneChat(otherUser.id),
  ]);
  await ownData.interviewChat(donut, donutOlder);
  await renameChat(user.id, donutOlder.id, chatNameFixture("Donut details"));
  await Promise.all([
    setCreatedAt(user.id, firstStandalone.id, OLDEST_AT),
    setCreatedAt(user.id, donutOlder.id, DONUT_OLDER_AT),
    setCreatedAt(
      user.id,
      secondStandalone.id,
      new Date("2026-01-02T12:00:00Z"),
    ),
    setCreatedAt(user.id, foxChat.id, LATER_AT),
    setCreatedAt(user.id, donutNewer.id, NEWEST_AT),
    setCreatedAt(otherUser.id, foreignProjectChat.id, OLDEST_AT),
    setCreatedAt(otherUser.id, foreignStandalone.id, NEWEST_AT),
  ]);
  return {
    owner: user.id,
    other: otherUser.id,
    donut,
    fox,
    foreignProject,
    donutChats: [donutNewer.id, donutOlder.id],
    foxChat: foxChat.id,
    standaloneChats: [firstStandalone.id, secondStandalone.id],
    foreignChats: [foreignStandalone.id, foreignProjectChat.id],
    newestFirst: [
      donutNewer.id,
      foxChat.id,
      secondStandalone.id,
      donutOlder.id,
      firstStandalone.id,
    ],
  };
}

test("lists only the owner's project and standalone chats, newest first", async () => {
  const { owner, other, newestFirst, foreignChats } = await twoUsersChats();

  const found = await listAllChats(owner);

  expect(found.map(({ id }) => id)).toEqual(newestFirst);
  expect(await listAllChats((await testUser()).id)).toEqual([]);
  expect((await listAllChats(other)).map(({ id }) => id)).toEqual(foreignChats);
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
      .filter((chat) => chat.project !== undefined)
      .map(({ id, project, isInterviewChat }) => ({
        id,
        projectId: project?.id,
        projectName: project?.name,
        isInterviewChat,
      })),
  ).toEqual([
    {
      id: donutChats[0],
      projectId: donut.id,
      projectName: donut.name,
      isInterviewChat: false,
    },
    {
      id: foxChat,
      projectId: fox.id,
      projectName: fox.name,
      isInterviewChat: false,
    },
    {
      id: donutChats[1],
      projectId: donut.id,
      projectName: donut.name,
      isInterviewChat: true,
    },
  ]);
  const standalone = found.filter((chat) => chat.project === undefined);
  expect(standalone).toHaveLength(2);
  expect(standalone.map(({ id }) => id)).toEqual(
    expect.arrayContaining([...standaloneChats]),
  );
  for (const chat of standalone) {
    expect(chat.isInterviewChat).toBe(false);
  }
});

test("filters to an owned project with its name and descending time order", async () => {
  const { owner, donut, donutChats, fox, foxChat } = await twoUsersChats();
  const newest = await createChat(owner, {
    project: donut,
    buddy: getBuddy("hippy"),
  });
  await setCreatedAt(owner, newest.id, new Date("2026-01-05T00:00:00Z"));

  const found = await listAllChats(owner, donut.id);
  expect(found).toEqual(
    await Promise.all(found.map(({ id }) => getChat(owner, id))),
  );

  expect(found.map(({ id }) => id)).toEqual([newest.id, ...donutChats]);
  expect(found.map(({ createdAt }) => createdAt)).toEqual([
    new Date("2026-01-05T00:00:00Z"),
    NEWEST_AT,
    DONUT_OLDER_AT,
  ]);
  for (const chat of found) {
    expect(chat).toMatchObject({
      project: { id: donut.id, name: donut.name },
    });
  }
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
