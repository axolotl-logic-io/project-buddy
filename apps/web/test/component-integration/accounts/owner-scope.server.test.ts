// The ownership predicates against the test database: two users side by
// side, each with a project, a chat in it, a standalone chat, their messages,
// a memory version, a gold balance and its ledger, and a construct. Each predicate, for her,
// selects exactly her rows of the two users', through her project or, for a
// standalone chat, through the chat's own user. owner-scope-coverage.test.ts
// checks every store builds its queries from these predicates.
import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import {
  chatOpenTo,
  goldBalanceOwnedBy,
  goldLedgerOwnedBy,
  memoryVersionOpenTo,
  messageOpenTo,
  opensProject,
  ownPromptOwnedBy,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import { cloneConstruct } from "@/constructs/construct-store.ts";
import { DEFAULT_CONSTRUCT_ID } from "@/constructs/index.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { getDb } from "@/db/client.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import type { ChatId, OwnPromptId, ProjectId } from "@/ids.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { saveMemory } from "@/memory/memory-store.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const EXCHANGE: Exchange = {
  message: "Hello",
  reply: [{ type: "text", text: "Hi" }],
};

// One user's rows, one of each kind an ownership predicate reaches.
interface OwnedRows {
  readonly projectId: ProjectId;
  readonly projectChatId: ChatId;
  readonly standaloneChatId: ChatId;
  readonly constructId: OwnPromptId;
}

// Saves a row of each kind for user: a project with a chat and its memory,
// a standalone chat, an exchange in each chat and a construct. Gold comes with
// the account.
async function ownedRows(user: User): Promise<OwnedRows> {
  const data = testData(user);
  const project = await data.project();
  const projectChat = await data.chat(project);
  const standaloneChat = await privateChat(user.id);
  await data.exchanges(projectChat, [EXCHANGE]);
  await data.exchanges(standaloneChat, [EXCHANGE]);
  await saveMemory(user.id, {
    projectId: project.id,
    text: "- [ ] Rig the fox",
    basedOn: MEMORY_VERSION_NUMBER.parse(0),
    author: "user",
  });
  const construct = await cloneConstruct(user.id, DEFAULT_CONSTRUCT_ID);
  if (construct === undefined) {
    throw new Error("The default construct could not be cloned");
  }
  return {
    projectId: project.id,
    projectChatId: projectChat.id,
    standaloneChatId: standaloneChat.id,
    constructId: construct.id,
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
    .where(and(inArray(chats.id, bothChats), chatOpenTo(her.id)));
  const ownMessages = await db
    .selectDistinct({ chatId: messages.chatId })
    .from(messages)
    .where(and(inArray(messages.chatId, bothChats), messageOpenTo(her.id)));
  return {
    projectIds: ownProjects.map(({ id }) => id),
    chatIds: sorted(ownChats.map(({ id }) => id)),
    messageChatIds: sorted(ownMessages.map(({ chatId }) => chatId)),
  };
}

// Her rows among both users' memory versions, gold balances, gold ledgers
// and constructs.
async function ownMemoryGoldAndConstructs(
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
          memoryVersionOpenTo(her.id),
        ),
      ),
    await db
      .select({ userId: goldBalances.userId })
      .from(goldBalances)
      .where(
        and(
          inArray(goldBalances.userId, [her.id, other.id]),
          goldBalanceOwnedBy(her.id),
        ),
      ),
    await db
      .selectDistinct({ userId: goldLedger.userId })
      .from(goldLedger)
      .where(
        and(
          inArray(goldLedger.userId, [her.id, other.id]),
          goldLedgerOwnedBy(her.id),
        ),
      ),
    await db
      .select({ id: ownPrompts.id })
      .from(ownPrompts)
      .where(
        and(
          inArray(ownPrompts.id, [hers.constructId, theirs.constructId]),
          ownPromptOwnedBy(her.id),
        ),
      ),
  ];
}

// Whether opensProject holds for her and the project, on her user row.
async function holds(her: User, projectId: ProjectId): Promise<boolean> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, her.id), opensProject(her.id, projectId)));
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

  test("memory versions, gold and constructs", async () => {
    const { her, other, hers, theirs } = await bothUsersRows();

    expect(await ownMemoryGoldAndConstructs(her, other, hers, theirs)).toEqual([
      [{ projectId: hers.projectId }],
      [{ userId: her.id }],
      [{ userId: her.id }],
      [{ id: hers.constructId }],
    ]);
  });

  test("owning a project holds for her project only", async () => {
    const { her, hers, theirs } = await bothUsersRows();

    expect(await holds(her, hers.projectId)).toBe(true);
    expect(await holds(her, theirs.projectId)).toBe(false);
  });
});
