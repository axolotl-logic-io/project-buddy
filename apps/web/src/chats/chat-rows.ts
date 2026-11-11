// Rows of the chats and messages tables, as the chat stores read and write
// them. Reads check what the columns cannot: a chat's construct. A chat
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
import { unreadFor } from "@/chats/unread-marks.ts";
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import {
  type ConstructId,
  type ConstructSnapshot,
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
  isConstructId,
  snapshotOf,
} from "@/constructs/index.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
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
  readonly activityName?: string | undefined;
  // The chat's project, or undefined in a standalone chat.
  readonly project: ChatProject | undefined;
  // The construct as it was when the chat started.
  readonly construct: ConstructSnapshot;
  readonly createdAt: Date;
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
  readonly activityName?: string | null;
  readonly unread: boolean;
};

// A message to save as it is, with an id from the AI SDK.
type NewMessage = UIMessage & { readonly id: MessageId };

// A stored construct id that no construct file has any more, because the construct
// was retired, reads as the default construct, so its chats keep working.
function toConstructId(stored: string): ConstructId {
  if (isConstructId(stored)) {
    return stored;
  }
  return DEFAULT_CONSTRUCT_ID;
}

// The columns a chat's construct is read from.
type ConstructColumns = "constructId" | "constructName" | "constructParts";

// A chat's construct: its snapshot or, for a chat saved before snapshots, whose
// snapshot columns are null, the built-in construct of its id. A snapshot whose
// parts are not every part, which only a hand-edited row could hold, reads
// the same way.
function toConstruct({
  constructId,
  constructName,
  constructParts,
}: Pick<ChatRow, ConstructColumns>): ConstructSnapshot {
  const parts = parseConstructDefinition(constructParts);
  if (constructName !== null && parts !== undefined) {
    return { name: constructName, definition: parts };
  }
  return snapshotOf(getConstruct(toConstructId(constructId)));
}

// A chat's construct as a new chat would keep it: its snapshot (toConstruct) and
// the id saved beside it.
function toConstructWithId(
  row: Pick<ChatRow, ConstructColumns>,
): ConstructSnapshot & { readonly id: ConstructId } {
  return { ...toConstruct(row), id: toConstructId(row.constructId) };
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
// holds one, is skipped.
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
        activityName: row.activityName ?? undefined,
        project: place.project,
        construct: toConstruct(row),
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
  readonly activityName: SQL.Aliased<string | null>;
} {
  return {
    ...getTableColumns(chats),
    unread: unreadFor(viewer),
    activityName: sql<string | null>`(select ${activitySessions.activityName}
      from ${activitySessions} where ${activitySessions.chatId} = ${chats.id}
      order by ${activitySessions.createdAt} desc, ${activitySessions.id} desc limit 1)`.as(
      "current_activity_name",
    ),
  };
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
  toChats,
  toConstructWithId,
};
