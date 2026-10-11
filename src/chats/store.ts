// Chats and their messages, stored in Postgres. Reads check what the columns
// cannot: a chat's persona and each message's role and parts. An id from
// outside the code, such as a route parameter, is looked up as a string;
// anything malformed is not found.
import { safeValidateUIMessages, type UIMessage } from "ai";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { logAppError } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
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
}

type ChatWithProject = Chat & { projectName: string };

type ChatRow = typeof chats.$inferSelect;

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

// Rows as chats. A row whose ids are not UUIDs is skipped, though the uuid
// columns never hold one.
function toChats<Row extends ChatRow>(
  rows: readonly Row[],
): (Chat & Omit<Row, keyof Chat>)[] {
  return rows.flatMap((row) => {
    const id = parseChatId(row.id);
    const projectId = parseProjectId(row.projectId);
    if (id === undefined || projectId === undefined) {
      return [];
    }
    return [{ ...row, id, projectId, personaId: toPersonaId(row.personaId) }];
  });
}

// The row as a UI message, or undefined, logged by id alone so the log keeps
// no message text, if its role or parts are invalid.
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

export type { Chat, ChatWithProject };

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

export async function saveMessage(
  chatId: ChatId,
  message: UIMessage,
): Promise<void> {
  await withAppErrors("saveMessage", () =>
    getDb().insert(messages).values({
      id: message.id,
      chatId,
      role: message.role,
      parts: message.parts,
    }),
  );
}
