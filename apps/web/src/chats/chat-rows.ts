// Rows of the chats and messages tables, as the chat stores read and write
// them. Reads check what the columns cannot: a chat's buddy and name. A chat
// is in a project, a project chat, or in none, a standalone chat; both are
// one type, Chat, whose project is undefined in a standalone chat.
import type { UIMessage } from "ai";
import {
  and,
  eq,
  getTableColumns,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { chatOpenTo, messageOpenTo } from "@/accounts/owner-scope.ts";
import { parseBuddyParts } from "@/buddies/buddy-parts-schema.ts";
import {
  type BuddyId,
  type BuddySnapshot,
  DEFAULT_BUDDY_ID,
  getBuddy,
  isBuddyId,
  snapshotOf,
} from "@/buddies/index.ts";
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";
import { unreadFor } from "@/chats/unread-marks.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import {
  type ChatId,
  type MessageId,
  type ProjectId,
  parseChatId,
  parseProjectId,
  type UserId,
} from "@/ids.ts";

// The project a chat is in: its id and name.
interface ChatProject {
  readonly id: ProjectId;
  readonly name: string;
}

interface Chat {
  readonly id: ChatId;
  // The chat's project, or undefined in a standalone chat.
  readonly project: ChatProject | undefined;
  // The buddy as it was when the chat started.
  readonly buddy: BuddySnapshot;
  readonly createdAt: Date;
  // Undefined until Claude Haiku or she first names the chat.
  readonly name: ChatName | undefined;
  // Whether she has renamed the chat, after which Haiku never renames it.
  readonly renamedByHand: boolean;
  // Whether the user reading it hasn't opened the chat yet, as with a new
  // check-in: that user's own mark, which another user's opening leaves.
  readonly unread: boolean;
}

// A chat known to be in a project, such as one of a project's chats.
type ProjectChat = Chat & { readonly project: ChatProject };

type ChatRow = typeof chats.$inferSelect;

// A chats row with its project's name, which is null for a standalone chat,
// and whether it is unread for the user reading it (chatColumnsFor).
type ChatRowWithProject = ChatRow & {
  readonly projectName: string | null;
  readonly unread: boolean;
};

// A message to save as it is, with an id from the AI SDK.
type NewMessage = UIMessage & { readonly id: MessageId };

// A stored buddy id that no buddy file has any more, because the buddy
// was retired, reads as the default buddy, so its chats keep working.
function toBuddyId(stored: string): BuddyId {
  if (isBuddyId(stored)) {
    return stored;
  }
  return DEFAULT_BUDDY_ID;
}

// The columns a chat's buddy is read from.
type BuddyColumns = "buddyId" | "buddyName" | "buddyParts";

// A chat's buddy: its snapshot or, for a chat saved before snapshots, whose
// snapshot columns are null, the built-in buddy of its id. A snapshot whose
// parts are not every part, which only a hand-edited row could hold, reads
// the same way.
function toBuddy({
  buddyId,
  buddyName,
  buddyParts,
}: Pick<ChatRow, BuddyColumns>): BuddySnapshot {
  const parts = parseBuddyParts(buddyParts);
  if (buddyName !== null && parts !== undefined) {
    return { name: buddyName, parts };
  }
  return snapshotOf(getBuddy(toBuddyId(buddyId)));
}

// A chat's buddy as a new chat would keep it: its snapshot (toBuddy) and
// the id saved beside it.
function toBuddyWithId(
  row: Pick<ChatRow, BuddyColumns>,
): BuddySnapshot & { readonly id: BuddyId } {
  return { ...toBuddy(row), id: toBuddyId(row.buddyId) };
}

// A chat's project: { project: undefined } for a standalone chat, or
// undefined for a row that is neither, which the chats_one_owner check and
// the foreign key forbid: a project id that is not a UUID or has no
// project's name, or a row with neither a project nor a user.
function toProject({
  projectId,
  projectName,
  userId,
}: Pick<ChatRowWithProject, "projectId" | "projectName" | "userId">):
  | { readonly project: ChatProject | undefined }
  | undefined {
  if (projectId === null) {
    if (userId === null) {
      return undefined;
    }
    return { project: undefined };
  }
  const id = parseProjectId(projectId);
  if (id === undefined || projectName === null) {
    return undefined;
  }
  return { project: { id, name: projectName } };
}

// Rows, with their projects' columns, as chats. A row that is not a chat
// (toProject), or whose id is not a UUID, though the uuid column never
// holds one, is skipped. A stored name that is not a chat name, which only
// a hand-edited row could hold, reads as no name.
function toChats(rows: readonly ChatRowWithProject[]): Chat[] {
  return rows.flatMap((row) => {
    const id = parseChatId(row.id);
    const place = toProject(row);
    if (id === undefined || place === undefined) {
      return [];
    }
    return [
      {
        id,
        project: place.project,
        buddy: toBuddy(row),
        name: parseChatName(row.name ?? ""),
        renamedByHand: row.renamedByHand,
        unread: row.unread,
        createdAt: row.createdAt,
      },
    ];
  });
}

// The columns a chat is read from, by viewer: its row, with unread as
// viewer's own mark (unread-marks.ts).
function chatColumnsFor(viewer: UserId): ReturnType<
  typeof getTableColumns<typeof chats>
> & {
  readonly unread: SQL.Aliased<boolean>;
} {
  return { ...getTableColumns(chats), unread: unreadFor(viewer) };
}

// The columns a chat is read from by viewer (chatColumnsFor) and its
// project's name, which a left join of projects on chats.project_id gives,
// null in a standalone chat. The join only reads the project's columns;
// chatOpenTo is what keeps a chat open to viewer.
function chatWithProjectColumns(viewer: UserId): {
  readonly projectName: typeof projects.name;
} & ReturnType<typeof chatColumnsFor> {
  return { ...chatColumnsFor(viewer), projectName: projects.name };
}

// Whether the chat is in a project.
function isProjectChat(chat: Chat): chat is ProjectChat {
  return chat.project !== undefined;
}

// A `chats` row: the owner's chat with this id.
function openChat(owner: UserId, chatId: ChatId): SQL | undefined {
  return and(eq(chats.id, chatId), chatOpenTo(owner));
}

// A `messages` row: the owner's message with this id in this chat.
function openMessage(
  owner: UserId,
  chatId: ChatId,
  messageId: MessageId,
): SQL | undefined {
  return and(
    eq(messages.id, messageId),
    eq(messages.chatId, chatId),
    messageOpenTo(owner),
  );
}

// How long a claim to reply to a message lasts, in seconds: the longest a
// reply may run, the chat route's maxDuration (src/app/api/chat/route.ts),
// which must stay a literal there. A claim older than this was held by a
// request that was stopped before it could release it.
const REPLY_CLAIM_SECONDS = 300;

// A `messages` row whose reply no request has claimed (claimReply in
// store.ts): never claimed, released, or claimed longer ago than
// REPLY_CLAIM_SECONDS.
function replyUnclaimed(): SQL | undefined {
  return or(
    isNull(messages.replyStartedAt),
    lt(
      messages.replyStartedAt,
      sql`now() - make_interval(secs => ${REPLY_CLAIM_SECONDS})`,
    ),
  );
}

// The columns of a message row to insert … select, keyed as the table's are.
type MessageColumns = {
  readonly [Column in keyof Required<
    typeof messages.$inferInsert
  >]: SQL.Aliased;
};

// A message's row for insert … select, saved now or at createdAt, with no
// reply being made to it unless replyStartedAt says when one started, and
// written by author, or with no author recorded, which reads as the chat's
// owner.
function messageColumns(
  chatId: ChatId,
  message: UIMessage,
  {
    createdAt = sql`now()`,
    replyStartedAt = sql`null::timestamptz`,
    author,
  }: { createdAt?: SQL; replyStartedAt?: SQL; author?: UserId } = {},
): MessageColumns {
  return {
    id: sql`${message.id}::text`.as("id"),
    chatId: sql`${chatId}::uuid`.as("chat_id"),
    role: sql`${message.role}::text`.as("role"),
    parts: sql`${JSON.stringify(message.parts)}::jsonb`.as("parts"),
    userId: sql`${author ?? null}::uuid`.as("user_id"),
    replyStartedAt: replyStartedAt.as("reply_started_at"),
    createdAt: createdAt.as("created_at"),
  };
}

export type {
  Chat,
  ChatProject,
  ChatRow,
  ChatRowWithProject,
  NewMessage,
  ProjectChat,
};
export {
  chatColumnsFor,
  chatWithProjectColumns,
  isProjectChat,
  messageColumns,
  openChat,
  openMessage,
  REPLY_CLAIM_SECONDS,
  replyUnclaimed,
  toBuddyWithId,
  toChats,
};
