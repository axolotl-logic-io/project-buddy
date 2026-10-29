// New project chats, saved in Postgres in the owner's projects. A chat that starts
// with the buddy's opening is saved with it in one batch, which the database
// runs as one transaction, so no chat is left without its opening and no
// project without its first chat.
import { and, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import type { BuddyId, BuddySnapshot } from "@/buddies/index.ts";
import {
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
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
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

// The chat a new chat is: its project and buddy.
interface NewChat {
  readonly project: ChatProject;
  readonly buddy: NewChatBuddy;
}

// A new id, made here rather than by the database, so a batch can insert a
// row and the rows that refer to it together.
function randomId<Id>(parse: (value: string) => Id | undefined): Id {
  const id = parse(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("crypto.randomUUID made no UUID");
  }
  return id;
}

// The project's interview chat id that row's chat gives it: its own id
// when it is the interview chat, and none otherwise.
function interviewChatIdOf(
  row: ChatRow,
  isInterviewChat: boolean,
): string | null {
  if (isInterviewChat) {
    return row.id;
  }
  return null;
}

// The chat in project that inserting it returned, the project's interview
// chat when isInterviewChat, or the not-found failure when the owner has no
// such project, so nothing was inserted.
function insertedChat(
  rows: readonly ChatRow[],
  project: ChatProject,
  { isInterviewChat }: { readonly isInterviewChat: boolean },
): ProjectChat {
  const [chat] = toChats(
    rows.map((row) => ({
      ...row,
      projectName: project.name,
      projectInterviewChatId: interviewChatIdOf(row, isInterviewChat),
    })),
  ).filter(isProjectChat);
  if (chat === undefined) {
    throw new AppError("not-found", new Error("No such project to chat in"));
  }
  return chat;
}

// The select that yields the new chat's row, with this id, when its project
// is the owner's, and nothing otherwise.
function ownedProjectChat(owner: UserId, chat: NewChat, id: ChatId): SQL {
  return new QueryBuilder()
    .select({
      id: sql`${id}::uuid`.as("id"),
      projectId: projects.id,
      buddyId: sql`${chat.buddy.id}::text`.as("buddy_id"),
      buddyName: sql`${chat.buddy.name}::text`.as("buddy_name"),
      buddyParts: sql`${JSON.stringify(chat.buddy.parts)}::jsonb`.as(
        "buddy_parts",
      ),
      name: sql`null::text`.as("name"),
      renamedByHand: sql`false`.as("renamed_by_hand"),
      createdAt: sql`now()`.as("created_at"),
      userId: sql`null::uuid`.as("user_id"),
    })
    .from(projects)
    .where(and(eq(projects.id, chat.project.id), projectOwnedBy(owner)))
    .getSQL();
}

// A new chat, with no messages, in the owner's project. Rejects with the
// not-found case if the project is another user's. The site starts every
// chat with the buddy's opening; the end-to-end tests make empty ones.
export function createChat(owner: UserId, chat: NewChat): Promise<ProjectChat> {
  return withAppErrors("createChat", async () =>
    insertedChat(
      await getDb()
        .insert(chats)
        .select(ownedProjectChat(owner, chat, randomId(parseChatId)))
        .returning(),
      chat.project,
      { isInterviewChat: false },
    ),
  );
}

// A new chat in the owner's project, saved together with opening, its first
// message, in one transaction. Rejects with the not-found case, saving
// nothing, if the project is another user's.
export function createChatWithOpening(
  owner: UserId,
  chat: NewChat,
  opening: NewMessage,
): Promise<ProjectChat> {
  return withAppErrors("createChatWithOpening", async () => {
    const db = getDb();
    const id = randomId(parseChatId);
    const [created] = await db.batch([
      db
        .insert(chats)
        .select(ownedProjectChat(owner, chat, id))
        .returning(),
      db
        .insert(messages)
        .select(
          new QueryBuilder()
            .select(messageColumns(id, opening))
            .from(chats)
            .where(ownedChat(owner, id)),
        ),
    ]);
    return insertedChat(created, chat.project, { isInterviewChat: false });
  });
}

// A new project of the owner's named projectName, with its first chat in
// buddy, which opening starts: the project, the chat and the message are
// saved together, in one transaction, and the chat is the project's
// interview chat.
export function createProjectWithChat(
  owner: UserId,
  projectName: string,
  chat: { buddy: NewChatBuddy; opening: NewMessage },
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
        .update(projects)
        .set({ interviewChatId: id })
        .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
    ]);
    return insertedChat(
      created,
      { id: projectId, name: projectName },
      { isInterviewChat: true },
    );
  });
}

export type { NewChatBuddy };
