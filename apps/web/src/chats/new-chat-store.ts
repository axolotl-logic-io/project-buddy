// New chats, saved in Postgres: in the owner's projects, or standalone, in
// none. A chat that starts with the buddy's opening is saved with it, and
// with its first activity session, in one batch, which the database runs as
// one transaction, so no chat is left without its opening and no project
// without its first chat.
import { and, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { newSession } from "@/activities/activity-sessions.ts";
import type { ChatActivity } from "@/activities/chosen-activity.ts";
import type { BuddyId, BuddySnapshot } from "@/buddies/index.ts";
import {
  type Chat,
  type ChatProject,
  type ChatRow,
  isProjectChat,
  messageColumns,
  type NewMessage,
  ownedChat,
  type ProjectChat,
  toChats,
} from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  parseChatId,
  parseProjectId,
  type UserId,
} from "@/ids.ts";

// The buddy a new chat keeps: the snapshot of its name and parts, and the
// id saved beside it, which is the built-in buddy's or, for a buddy of
// the user's own, the default buddy's, for the build that reads only ids.
type NewChatBuddy = BuddySnapshot & { readonly id: BuddyId };

// The chat a new chat is: its project, or none for a standalone chat, and
// its buddy.
interface NewChat {
  readonly project: ChatProject | undefined;
  readonly buddy: NewChatBuddy;
}

// A new project chat, with no messages and no activity session, as the
// end-to-end tests make one.
type NewProjectChat = NewChat & { readonly project: ChatProject };

// A new id, made here rather than by the database, so a batch can insert a
// row and the rows that refer to it together.
function randomId<Id>(parse: (value: string) => Id | undefined): Id {
  const id = parse(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("crypto.randomUUID made no UUID");
  }
  return id;
}

// The chat that inserting it into project, or into none, returned. The
// not-found failure when nothing was inserted, because the owner has no such
// project.
function insertedChat(
  rows: readonly ChatRow[],
  project: ChatProject | undefined,
): Chat {
  const [chat] = toChats(
    rows.map((row) => ({ ...row, projectName: project?.name ?? null })),
  );
  if (chat === undefined) {
    throw new AppError("not-found", new Error("No such project to chat in"));
  }
  return chat;
}

// The chat that inserting it into project returned, as a project chat.
function insertedProjectChat(
  rows: readonly ChatRow[],
  project: ChatProject,
): ProjectChat {
  const chat = insertedChat(rows, project);
  if (!isProjectChat(chat)) {
    throw new AppError("not-found", new Error("No such project to chat in"));
  }
  return chat;
}

// The columns of the new chat's row, with this id, in the table's order, as
// insert … select needs them: its project and user, as owner says, then
// what every chat has.
function chatColumns(
  chat: NewChat,
  id: ChatId,
  owner: { readonly projectId: SQL.Aliased; readonly userId: SQL.Aliased },
): Record<keyof ChatRow, SQL.Aliased> {
  return {
    id: sql`${id}::uuid`.as("id"),
    projectId: owner.projectId,
    buddyId: sql`${chat.buddy.id}::text`.as("buddy_id"),
    buddyName: sql`${chat.buddy.name}::text`.as("buddy_name"),
    buddyParts: sql`${JSON.stringify(chat.buddy.parts)}::jsonb`.as(
      "buddy_parts",
    ),
    name: sql`null::text`.as("name"),
    renamedByHand: sql`false`.as("renamed_by_hand"),
    createdAt: sql`now()`.as("created_at"),
    userId: owner.userId,
  };
}

// The select that yields the new chat's row, with this id: in its project
// when that is the owner's, and nothing otherwise; or, with no project, the
// owner's standalone chat.
function newChatRow(owner: UserId, chat: NewChat, id: ChatId): SQL {
  const { project } = chat;
  if (project === undefined) {
    return new QueryBuilder()
      .select(
        chatColumns(chat, id, {
          projectId: sql`null::uuid`.as("project_id"),
          userId: sql`${users.id}`.as("user_id"),
        }),
      )
      .from(users)
      .where(eq(users.id, owner))
      .getSQL();
  }
  return new QueryBuilder()
    .select(
      chatColumns(chat, id, {
        projectId: sql`${projects.id}`.as("project_id"),
        userId: sql`null::uuid`.as("user_id"),
      }),
    )
    .from(projects)
    .where(and(eq(projects.id, project.id), projectOwnedBy(owner)))
    .getSQL();
}

// A new chat, with no messages, in the owner's project. Rejects with the
// not-found case if the project is another user's. The site starts every
// chat with the buddy's opening; the end-to-end tests make empty ones.
export function createChat(
  owner: UserId,
  chat: NewProjectChat,
): Promise<ProjectChat> {
  return withAppErrors("createChat", async () =>
    insertedProjectChat(
      await getDb()
        .insert(chats)
        .select(newChatRow(owner, chat, randomId(parseChatId)))
        .returning(),
      chat.project,
    ),
  );
}

// A new chat of the owner's, in its project or standalone, saved together
// with opening, its first message, and its first activity session, in
// activity, in one transaction. Rejects with the not-found case, saving
// nothing, if the project is another user's.
export function createChatWithOpening(
  owner: UserId,
  chat: NewChat & { readonly activity: ChatActivity },
  opening: NewMessage,
): Promise<Chat> {
  return withAppErrors("createChatWithOpening", async () => {
    const db = getDb();
    const id = randomId(parseChatId);
    const [created] = await db.batch([
      db
        .insert(chats)
        .select(newChatRow(owner, chat, id))
        .returning(),
      db
        .insert(messages)
        .select(
          new QueryBuilder()
            .select(messageColumns(id, opening))
            .from(chats)
            .where(ownedChat(owner, id)),
        ),
      db
        .insert(activitySessions)
        .select(newSession(owner, id, chat.activity, undefined)),
    ]);
    return insertedChat(created, chat.project);
  });
}

// A new project of the owner's named projectName, with its first chat in
// buddy and activity, which opening starts: the project, the chat, the
// message and the activity session are saved together, in one transaction.
export function createProjectWithChat(
  owner: UserId,
  projectName: string,
  chat: {
    readonly buddy: NewChatBuddy;
    readonly activity: ChatActivity;
    readonly opening: NewMessage;
  },
): Promise<ProjectChat> {
  return withAppErrors("createProjectWithChat", async () => {
    const db = getDb();
    const projectId = randomId(parseProjectId);
    const id = randomId(parseChatId);
    const [, created] = await db.batch([
      db
        .insert(projects)
        .values({ id: projectId, userId: owner, name: projectName }),
      db
        .insert(chats)
        .values({
          id,
          projectId,
          buddyId: chat.buddy.id,
          buddyName: chat.buddy.name,
          buddyParts: chat.buddy.parts,
        })
        .returning(),
      db.insert(messages).values({
        id: chat.opening.id,
        chatId: id,
        role: chat.opening.role,
        parts: chat.opening.parts,
      }),
      db
        .insert(activitySessions)
        .select(newSession(owner, id, chat.activity, undefined)),
    ]);
    return insertedProjectChat(created, { id: projectId, name: projectName });
  });
}

export type { NewChat, NewChatBuddy };
