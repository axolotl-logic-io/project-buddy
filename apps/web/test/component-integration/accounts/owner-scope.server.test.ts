// The ownership predicates against the test database: two users side by
// side, each with a project, a chat in it, a standalone chat, their messages,
// a memory version, a month's spend and a buddy. Each predicate, for her,
// selects exactly her rows of the two users', through her project or, for a
// standalone chat, through the chat's own user. owner-scope-coverage.test.ts
// checks every store builds its queries from these predicates.
import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import {
  chatOwnedBy,
  memoryVersionOwnedBy,
  messageOwnedBy,
  monthlySpendOwnedBy,
  ownPromptOwnedBy,
  ownsProject,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import { cloneBuddy } from "@/buddies/buddy-store.ts";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { getDb } from "@/db/client.ts";
import { buddies } from "@/db/tables/buddies.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import type { ChatId, OwnPromptId, ProjectId } from "@/ids.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { saveMemory } from "@/memory/memory-store.ts";
import { recordSpend } from "@/quota/spend-store.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const SPEND_NOW = new Date("2026-03-14T12:00:00Z");
const SPEND_MICRO_USD = 40_000;
const EXCHANGE: Exchange = {
  message: "Hello",
  reply: [{ type: "text", text: "Hi" }],
};

// One user's rows, one of each kind an ownership predicate reaches.
interface OwnedRows {
  readonly projectId: ProjectId;
  readonly projectChatId: ChatId;
  readonly standaloneChatId: ChatId;
  readonly buddyId: OwnPromptId;
}

// Saves a row of each kind for user: a project with a chat and its memory,
// a standalone chat, an exchange in each chat, a month's spend and a buddy.
async function ownedRows(user: User): Promise<OwnedRows> {
  const data = testData(user);
  const project = await data.project();
  const projectChat = await data.chat(project);
  const standaloneChat = await createStandaloneChat(user.id);
  await data.exchanges(projectChat, [EXCHANGE]);
  await data.exchanges(standaloneChat, [EXCHANGE]);
  await saveMemory(user.id, {
    projectId: project.id,
    text: "- [ ] Rig the fox",
    basedOn: MEMORY_VERSION_NUMBER.parse(0),
    author: "user",
  });
  await recordSpend(user.id, SPEND_MICRO_USD, SPEND_NOW);
  const buddy = await cloneBuddy(user.id, DEFAULT_BUDDY_ID);
  if (buddy === undefined) {
    throw new Error("The default buddy could not be cloned");
  }
  return {
    projectId: project.id,
    projectChatId: projectChat.id,
    standaloneChatId: standaloneChat.id,
    buddyId: buddy.id,
  };
}

// Both users, signed in as her, with their rows.
async function bothUsersRows(): Promise<{
  readonly her: User;
  readonly other: User;
  readonly hers: OwnedRows;
  readonly theirs: OwnedRows;
}> {
  const { her, other } = await twoUsers();
  return {
    her,
    other,
    hers: await ownedRows(her),
    theirs: await ownedRows(other),
  };
}

// The ids, in order, for comparing sets of rows.
function sorted(ids: readonly string[]): string[] {
  return ids.toSorted((one, other) => one.localeCompare(other));
}

// Her ids among both users' projects, chats and the chats of messages.
async function ownProjectsAndChats(
  her: User,
  bothProjects: readonly ProjectId[],
  bothChats: readonly ChatId[],
): Promise<{
  readonly projectIds: readonly string[];
  readonly chatIds: readonly string[];
  readonly messageChatIds: readonly string[];
}> {
  const db = getDb();
  const ownProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(inArray(projects.id, bothProjects), projectOwnedBy(her.id)));
  const ownChats = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(inArray(chats.id, bothChats), chatOwnedBy(her.id)));
  const ownMessages = await db
    .selectDistinct({ chatId: messages.chatId })
    .from(messages)
    .where(and(inArray(messages.chatId, bothChats), messageOwnedBy(her.id)));
  return {
    projectIds: ownProjects.map(({ id }) => id),
    chatIds: sorted(ownChats.map(({ id }) => id)),
    messageChatIds: sorted(ownMessages.map(({ chatId }) => chatId)),
  };
}

// Her rows among both users' memory versions, months' spend and buddies.
async function ownMemorySpendAndBuddies(
  her: User,
  other: User,
  hers: OwnedRows,
  theirs: OwnedRows,
): Promise<readonly unknown[]> {
  const db = getDb();
  return [
    await db
      .selectDistinct({ projectId: memoryVersions.projectId })
      .from(memoryVersions)
      .where(
        and(
          inArray(memoryVersions.projectId, [hers.projectId, theirs.projectId]),
          memoryVersionOwnedBy(her.id),
        ),
      ),
    await db
      .select({ userId: monthlySpend.userId })
      .from(monthlySpend)
      .where(
        and(
          inArray(monthlySpend.userId, [her.id, other.id]),
          monthlySpendOwnedBy(her.id),
        ),
      ),
    await db
      .select({ id: buddies.id })
      .from(buddies)
      .where(
        and(
          inArray(buddies.id, [hers.buddyId, theirs.buddyId]),
          ownPromptOwnedBy(her.id),
        ),
      ),
  ];
}

// Whether ownsProject holds for her and the project, on her user row.
async function holds(her: User, projectId: ProjectId): Promise<boolean> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, her.id), ownsProject(her.id, projectId)));
  return rows.length > 0;
}

describe("ownership predicates select only the owner's rows", () => {
  test("projects, project chats, standalone chats and their messages", async () => {
    const { her, hers, theirs } = await bothUsersRows();
    const herChats = [hers.projectChatId, hers.standaloneChatId];

    expect(
      await ownProjectsAndChats(
        her,
        [hers.projectId, theirs.projectId],
        [...herChats, theirs.projectChatId, theirs.standaloneChatId],
      ),
    ).toEqual({
      projectIds: [hers.projectId],
      chatIds: sorted(herChats),
      messageChatIds: sorted(herChats),
    });
  });

  test("memory versions, months' spend and buddies", async () => {
    const { her, other, hers, theirs } = await bothUsersRows();

    expect(await ownMemorySpendAndBuddies(her, other, hers, theirs)).toEqual([
      [{ projectId: hers.projectId }],
      [{ userId: her.id }],
      [{ id: hers.buddyId }],
    ]);
  });

  test("owning a project holds for her project only", async () => {
    const { her, hers, theirs } = await bothUsersRows();

    expect(await holds(her, hers.projectId)).toBe(true);
    expect(await holds(her, theirs.projectId)).toBe(false);
  });
});
