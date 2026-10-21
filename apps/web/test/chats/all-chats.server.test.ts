// Issue #479: query-only regressions. Page composition, URL fallback and
// visual coverage belong to the later chats-page composition issue.
import { and, eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { getBuddy } from "@/buddies/index.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { createCentralChat, listCentralChats } from "@/chats/central-chat.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { getChat, listChats, renameChat } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { projectIdFixture } from "../id-fixtures.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";
import { chatNameFixture } from "./chat-name-fixtures.ts";

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
      ownData.chat(donut, "mr-tee"),
      createCentralChat(user.id),
      ownData.chat(fox),
      ownData.chat(donut),
    ]);
  const [foreignProjectChat, foreignCentral] = await Promise.all([
    otherData.chat(foreignProject),
    createCentralChat(otherUser.id),
  ]);
  await ownData.interviewChat(donut, donutOlder);
  await renameChat(user.id, donutOlder.id, chatNameFixture("Donut details"));
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

test("lists only the owner's project and standalone chats, newest first with descending ids for a tie", async () => {
  const { owner, other, newestFirst, foreignChats } = await twoUsersChats();

  const found = await listAllChats(owner);

  expect(found.map(({ id }) => id)).toEqual(newestFirst);
  expect(
    found.filter(({ createdAt }) => createdAt.getTime() === TIED_AT.getTime()),
  ).toHaveLength(2);
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
      .filter((chat) => chat.kind === "project")
      .map(({ id, projectId, projectName, isInterviewChat }) => ({
        id,
        projectId,
        projectName,
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

test("leaves the existing project and central chat lists unchanged", async () => {
  const { owner, donut, donutChats, foreignProject, standaloneChats } =
    await twoUsersChats();
  const projectBefore = await listChats(owner, donut.id);
  const centralBefore = await listCentralChats(owner);

  await listAllChats(owner);
  await listAllChats(owner, donut.id);

  expect(await listChats(owner, donut.id)).toEqual(projectBefore);
  expect(projectBefore.map(({ id }) => id)).toEqual(donutChats);
  for (const chat of projectBefore) {
    expect(chat).not.toHaveProperty("projectName");
    expect(chat).not.toHaveProperty("kind");
  }
  expect(await listCentralChats(owner)).toEqual(centralBefore);
  expect(centralBefore.map(({ id }) => id)).toEqual([
    standaloneChats[1],
    standaloneChats[0],
  ]);
  expect(await listChats(owner, foreignProject.id)).toEqual([]);
});

test("filters to an owned project with its name and descending time and id order", async () => {
  const { owner, donut, donutChats, fox, foxChat } = await twoUsersChats();
  const newest = await createChat(owner, {
    projectId: donut.id,
    buddy: getBuddy("hippy"),
  });
  await setCreatedAt(owner, newest.id, NEWEST_AT);
  await setCreatedAt(owner, donutChats[0], TIED_AT);

  const found = await listAllChats(owner, donut.id);
  expect(found).toEqual(
    await Promise.all(found.map(({ id }) => getChat(owner, id))),
  );

  expect(found.map(({ id }) => id)).toEqual([
    newest.id,
    ...[...donutChats].sort((left, right) => right.localeCompare(left)),
  ]);
  expect(found.map(({ createdAt }) => createdAt)).toEqual([
    NEWEST_AT,
    TIED_AT,
    TIED_AT,
  ]);
  for (const chat of found) {
    expect(chat).toMatchObject({
      kind: "project",
      projectId: donut.id,
      projectName: donut.name,
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

test("returns an empty list for an owned empty project without creating a chat", async () => {
  const [user, other] = await Promise.all([testUser(), testUser()]);
  const data = testData(user);
  const project = await data.project("Empty");
  const elsewhere = await data.project("Elsewhere");
  const existing = await data.chat(elsewhere);
  const central = await createCentralChat(user.id);
  await testData(other).chat(await testData(other).project());

  expect(await listAllChats(user.id, project.id)).toEqual([]);
  expect(await listChats(user.id, project.id)).toEqual([]);
  expect(await listChats(user.id, elsewhere.id)).toEqual([existing]);
  expect(await listCentralChats(user.id)).toEqual([central]);
});

test("returns an empty list without creating a chat when only the other user has chats", async () => {
  const [user, other] = await Promise.all([testUser(), testUser()]);
  const data = testData(other);
  const projectChat = await data.chat(await data.project());
  const central = await createCentralChat(other.id);
  await setCreatedAt(other.id, projectChat.id, OLDEST_AT);
  await setCreatedAt(other.id, central.id, NEWEST_AT);

  expect(await listAllChats(user.id)).toEqual([]);
  expect(await listCentralChats(user.id)).toEqual([]);
  expect(
    await getDb()
      .select({ id: chats.id })
      .from(chats)
      .where(chatOwnedBy(user.id)),
  ).toEqual([]);
  expect((await listAllChats(other.id)).map(({ id }) => id)).toEqual([
    central.id,
    projectChat.id,
  ]);
});
