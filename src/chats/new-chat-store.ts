// New chats, saved in Postgres in the owner's projects. A chat that starts
// with the tutor's opening is saved with it in one batch, which the database
// runs as one transaction, so no chat is left without its opening and no
// project without its first chat.
import { and, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import {
  type Chat,
  type ChatRow,
  messageColumns,
  type NewMessage,
  ownedChat,
  toChats,
} from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type ProjectId,
  parseChatId,
  parseProjectId,
  type UserId,
} from "@/ids.ts";
import type { PersonaId } from "@/personas/index.ts";

// The chat a new chat is: its project and persona.
interface NewChat {
  readonly projectId: ProjectId;
  readonly personaId: PersonaId;
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

// The chat that inserting it returned, or the not-found failure when the
// owner has no such project, so nothing was inserted.
function insertedChat(rows: readonly ChatRow[]): Chat {
  const [chat] = toChats(rows);
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
      personaId: sql`${chat.personaId}::text`.as("persona_id"),
      name: sql`null::text`.as("name"),
      renamedByHand: sql`false`.as("renamed_by_hand"),
      createdAt: sql`now()`.as("created_at"),
    })
    .from(projects)
    .where(and(eq(projects.id, chat.projectId), projectOwnedBy(owner)))
    .getSQL();
}

// A new chat, with no messages, in the owner's project. Rejects with the
// not-found case if the project is another user's. The site starts every
// chat with the tutor's opening; the end-to-end tests make empty ones.
export function createChat(owner: UserId, chat: NewChat): Promise<Chat> {
  return withAppErrors("createChat", async () =>
    insertedChat(
      await getDb()
        .insert(chats)
        .select(ownedProjectChat(owner, chat, randomId(parseChatId)))
        .returning(),
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
): Promise<Chat> {
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
    return insertedChat(created);
  });
}

// A new project of the owner's named projectName, with its first chat in
// personaId, which opening starts: the project, the chat and the message
// are saved together, in one transaction.
export function createProjectWithChat(
  owner: UserId,
  projectName: string,
  chat: { personaId: PersonaId; opening: NewMessage },
): Promise<Chat> {
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
        .values({ id, projectId, personaId: chat.personaId })
        .returning(),
      db.insert(messages).values({
        id: chat.opening.id,
        chatId: id,
        role: chat.opening.role,
        parts: chat.opening.parts,
      }),
    ]);
    return insertedChat(created);
  });
}
