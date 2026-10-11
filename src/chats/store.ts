// Chats, their names and their messages, stored in Postgres. Reads check what
// the columns cannot: a chat's persona and name, and each message's role and
// parts. An id from outside the code, such as a route parameter, is looked up
// as a string; anything malformed is not found.
import { safeValidateUIMessages, type UIMessage } from "ai";
import { and, asc, desc, eq, not, sql } from "drizzle-orm";
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { logAppError } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type MessageId,
  type ProjectId,
  parseChatId,
  parseProjectId,
} from "@/ids.ts";
import {
  DEFAULT_PERSONA_ID,
  isPersonaId,
  type PersonaId,
} from "@/personas/index.ts";

interface Chat {
  id: ChatId;
  projectId: ProjectId;
  personaId: PersonaId;
  createdAt: Date;
  // Undefined until Claude Haiku or she first names the chat.
  name: ChatName | undefined;
  // Whether she has renamed the chat, after which Haiku never renames it.
  renamedByHand: boolean;
}

type ChatWithProject = Chat & { projectName: string };

type ChatRow = typeof chats.$inferSelect;

// A message to save as it is, with an id from the AI SDK.
type NewMessage = UIMessage & { readonly id: MessageId };

interface MessageRow {
  id: string;
  role: string;
  parts: unknown;
}

// A stored persona id that no persona file has any more, because the persona
// was retired, reads as the default persona, so its chats keep working.
function toPersonaId(stored: string): PersonaId {
  if (isPersonaId(stored)) {
    return stored;
  }
  return DEFAULT_PERSONA_ID;
}

// Rows as chats, keeping any further columns, such as the project's name. A
// row whose ids are not UUIDs is skipped, though the uuid columns never hold
// one. A stored name that is not a chat name, which only a hand-edited row
// could hold, reads as no name.
function toChats<Row extends ChatRow>(
  rows: readonly Row[],
): (Chat & Omit<Row, keyof Chat>)[] {
  return rows.flatMap((row) => {
    const id = parseChatId(row.id);
    const projectId = parseProjectId(row.projectId);
    if (id === undefined || projectId === undefined) {
      return [];
    }
    return [
      {
        ...row,
        id,
        projectId,
        personaId: toPersonaId(row.personaId),
        name: parseChatName(row.name ?? ""),
      },
    ];
  });
}

// The row as a UI message, or undefined if its role or parts are invalid. The
// log names an invalid message by its id alone, so it holds no message text.
async function toMessage(row: MessageRow): Promise<UIMessage | undefined> {
  const result = await safeValidateUIMessages({ messages: [row] });
  if (result.success) {
    return result.data[0];
  }
  logAppError(
    "unknown",
    "listMessages",
    new Error(`Stored message ${row.id} is not a valid UI message`),
  );
  return undefined;
}

export type { Chat, ChatWithProject, NewMessage };

export function listChats(projectId: ProjectId): Promise<Chat[]> {
  return withAppErrors("listChats", async () =>
    toChats(
      await getDb()
        .select()
        .from(chats)
        .where(eq(chats.projectId, projectId))
        .orderBy(desc(chats.createdAt)),
    ),
  );
}

// The chat with this id and its project's name, or undefined if the id is
// malformed or unknown.
export async function getChat(
  id: string,
): Promise<ChatWithProject | undefined> {
  const chatId = parseChatId(id);
  if (chatId === undefined) {
    return undefined;
  }
  const [chat] = await withAppErrors("getChat", async () =>
    toChats(
      await getDb()
        .select({
          id: chats.id,
          projectId: chats.projectId,
          personaId: chats.personaId,
          name: chats.name,
          renamedByHand: chats.renamedByHand,
          createdAt: chats.createdAt,
          projectName: projects.name,
        })
        .from(chats)
        .innerJoin(projects, eq(chats.projectId, projects.id))
        .where(eq(chats.id, chatId)),
    ),
  );
  return chat;
}

export function createChat(chat: {
  projectId: ProjectId;
  personaId: PersonaId;
}): Promise<Chat> {
  return withAppErrors("createChat", async () => {
    const [created] = toChats(
      await getDb().insert(chats).values(chat).returning(),
    );
    if (created === undefined) {
      throw new Error("Inserting a chat returned no chat");
    }
    return created;
  });
}

// The chat's messages, oldest first. A stored message whose role or parts are
// invalid is left out and logged.
export async function listMessages(chatId: ChatId): Promise<UIMessage[]> {
  const rows = await withAppErrors("listMessages", () =>
    getDb()
      .select({ id: messages.id, role: messages.role, parts: messages.parts })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt), asc(messages.id)),
  );
  const parsed = await Promise.all(rows.map(toMessage));
  return parsed.filter((message) => message !== undefined);
}

// Saves the message. A message whose id is saved already, such as one the
// browser sent again, is left as it is. The AI SDK's random ids keep two
// chats from sharing one.
export async function saveMessage(
  chatId: ChatId,
  message: NewMessage,
): Promise<void> {
  await withAppErrors("saveMessage", () =>
    getDb()
      .insert(messages)
      .values({
        id: message.id,
        chatId,
        role: message.role,
        parts: message.parts,
      })
      .onConflictDoNothing({ target: messages.id }),
  );
}

// Saves the tutor's reply to the message answeredMessageId, ordered just
// after that message however long the reply took, so a message sent
// meanwhile, such as from a reloaded page, still comes after both. The time
// comes from the database's clock, as every message's does.
export async function saveReply(
  chatId: ChatId,
  reply: UIMessage,
  answeredMessageId: MessageId,
): Promise<void> {
  const answeredAt = getDb()
    .select({
      at: sql`${messages.createdAt} + interval '1 microsecond'`,
    })
    .from(messages)
    .where(
      and(eq(messages.chatId, chatId), eq(messages.id, answeredMessageId)),
    );
  await withAppErrors("saveReply", () =>
    getDb()
      .insert(messages)
      .values({
        id: reply.id,
        chatId,
        role: reply.role,
        parts: reply.parts,
        createdAt: sql`coalesce((${answeredAt}), now())`,
      }),
  );
}

// Names the chat as she typed it. Haiku never renames it after this.
export async function renameChat(
  chatId: ChatId,
  name: ChatName,
): Promise<void> {
  await withAppErrors("renameChat", () =>
    getDb()
      .update(chats)
      .set({ name, renamedByHand: true })
      .where(eq(chats.id, chatId)),
  );
}

// Names the chat with the name Haiku suggested, unless she has renamed it by
// hand, even while Haiku was answering.
export async function saveAutomaticChatName(
  chatId: ChatId,
  name: ChatName,
): Promise<void> {
  await withAppErrors("saveAutomaticChatName", () =>
    getDb()
      .update(chats)
      .set({ name })
      .where(and(eq(chats.id, chatId), not(chats.renamedByHand))),
  );
}
