// Rows of the chats and messages tables, as the chat stores read and write
// them. Reads check what the columns cannot: a chat's persona and name.
import type { UIMessage } from "ai";
import { and, eq, type SQL, sql } from "drizzle-orm";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";
import { chats, type messages } from "@/db/tables/projects-and-chats.ts";
import {
  type ChatId,
  type MessageId,
  type ProjectId,
  parseChatId,
  parseProjectId,
  type UserId,
} from "@/ids.ts";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isPersonaId,
  type PersonaId,
  type PersonaSnapshot,
  snapshotOf,
} from "@/personas/index.ts";
import { parsePersonaParts } from "@/personas/persona-parts-schema.ts";

interface Chat {
  id: ChatId;
  projectId: ProjectId;
  // The persona as it was when the chat started.
  persona: PersonaSnapshot;
  createdAt: Date;
  // Undefined until Claude Haiku or she first names the chat.
  name: ChatName | undefined;
  // Whether she has renamed the chat, after which Haiku never renames it.
  renamedByHand: boolean;
}

// A chat with its project's name, and whether it is the project's interview
// chat (projects.interview_chat_id), the only chat whose prompt holds the
// interview.
type ChatWithProject = Chat & { projectName: string; isInterviewChat: boolean };

type ChatRow = typeof chats.$inferSelect;

// A message to save as it is, with an id from the AI SDK.
type NewMessage = UIMessage & { readonly id: MessageId };

// A stored persona id that no persona file has any more, because the persona
// was retired, reads as the default persona, so its chats keep working.
function toPersonaId(stored: string): PersonaId {
  if (isPersonaId(stored)) {
    return stored;
  }
  return DEFAULT_PERSONA_ID;
}

// The columns a chat's persona is read from.
type PersonaColumns = "personaId" | "personaName" | "personaParts";

// A chat's persona: its snapshot or, for a chat saved before snapshots, whose
// snapshot columns are null, the built-in persona of its id. A snapshot whose
// parts are not every part, which only a hand-edited row could hold, reads
// the same way.
function toPersona({
  personaId,
  personaName,
  personaParts,
}: Pick<ChatRow, PersonaColumns>): PersonaSnapshot {
  const parts = parsePersonaParts(personaParts);
  if (personaName !== null && parts !== undefined) {
    return { name: personaName, parts };
  }
  return snapshotOf(getPersona(toPersonaId(personaId)));
}

// Rows as chats, keeping any further columns, such as the project's name. A
// row whose ids are not UUIDs is skipped, though the uuid columns never hold
// one. A stored name that is not a chat name, which only a hand-edited row
// could hold, reads as no name.
function toChats<Row extends ChatRow>(
  rows: readonly Row[],
): (Chat & Omit<Row, keyof ChatRow>)[] {
  return rows.flatMap(
    ({
      id: storedId,
      projectId: storedProjectId,
      personaId,
      personaName,
      personaParts,
      name,
      renamedByHand,
      createdAt,
      ...further
    }) => {
      const id = parseChatId(storedId);
      const projectId = parseProjectId(storedProjectId);
      if (id === undefined || projectId === undefined) {
        return [];
      }
      return [
        {
          ...further,
          id,
          projectId,
          persona: toPersona({ personaId, personaName, personaParts }),
          name: parseChatName(name ?? ""),
          renamedByHand,
          createdAt,
        },
      ];
    },
  );
}

// A `chats` row: the owner's chat with this id.
function ownedChat(owner: UserId, chatId: ChatId): SQL | undefined {
  return and(eq(chats.id, chatId), chatOwnedBy(owner));
}

// The columns of a message row to insert … select, keyed as the table's are.
type MessageColumns = {
  readonly [Column in keyof Required<
    typeof messages.$inferInsert
  >]: SQL.Aliased;
};

// A message's row for insert … select, saved now or at createdAt.
function messageColumns(
  chatId: ChatId,
  message: UIMessage,
  createdAt: SQL = sql`now()`,
): MessageColumns {
  return {
    id: sql`${message.id}::text`.as("id"),
    chatId: sql`${chatId}::uuid`.as("chat_id"),
    role: sql`${message.role}::text`.as("role"),
    parts: sql`${JSON.stringify(message.parts)}::jsonb`.as("parts"),
    createdAt: createdAt.as("created_at"),
  };
}

export type { Chat, ChatRow, ChatWithProject, NewMessage };
export { messageColumns, ownedChat, toChats };
