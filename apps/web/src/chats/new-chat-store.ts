// New chats, saved in Postgres: in a project of the acting user's, or
// standalone, in none. A chat that starts with the construct's opening is saved with it, and
// with its first activity session, in one batch, which the database runs as
// one transaction, so no chat is left without its opening and no project
// without its first chat.
import { and, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { newSession } from "@/activities/activity-sessions.ts";
import type { ChatActivity } from "@/activities/chosen-activity.ts";
import {
  type Chat,
  type ChatProject,
  type ChatRow,
  isProjectChat,
  type NewMessage,
  type ProjectChat,
  toChats,
} from "@/chats/chat-rows.ts";
import { storedConstructPrompt } from "@/constructs/construct-definition.ts";
import type { ConstructId, ConstructSnapshot } from "@/constructs/index.ts";
import { grantVisualAssets } from "@/constructs/visual-asset-store.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
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
import type { ProjectName } from "@/projects/project-name.ts";

// The construct a new chat keeps: the snapshot of its name and parts, and the
// id saved beside it, which is the built-in construct's or, for a construct of
// the user's own, the default construct's, for the build that reads only ids.
type NewChatConstruct = ConstructSnapshot & { readonly id: ConstructId };

// The chat a new chat is: its project, or none for a standalone chat, and
// its construct. A new chat is unread for no one until markChatUnreadFor
// (store.ts) marks it, as a check-in does.
interface NewChat {
  readonly project: ChatProject | undefined;
  readonly construct: NewChatConstruct;
  // Whether it is its place's one continuing conversation
  // (src/conversations/); a legacy adventure otherwise.
  readonly continuing?: boolean;
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

// The chat that inserting it into project, or into none, returned, unread
// for no one. The not-found failure when nothing was inserted, because the
// owner has no such project.
function insertedChat(
  rows: readonly ChatRow[],
  project: ChatProject | undefined,
): Chat {
  const [chat] = toChats(
    rows.map((row) => ({
      ...row,
      projectName: project?.name ?? null,
      unread: false,
    })),
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
    constructId: sql`${chat.construct.id}::text`.as("buddy_id"),
    constructName: sql`${chat.construct.name}::text`.as("buddy_name"),
    constructParts:
      sql`${JSON.stringify(storedConstructPrompt(chat.construct.definition))}::jsonb`.as(
        "buddy_parts",
      ),
    name: sql`null::text`.as("name"),
    renamedByHand: sql`false`.as("renamed_by_hand"),
    createdAt: sql`now()`.as("created_at"),
    userId: owner.userId,
    continuing: sql`${chat.continuing === true}::boolean`.as("continuing"),
  };
}

// The select that yields the new chat's row, with this id: in its project
// when that is the owner's, and nothing otherwise; or, with no project, the
// owner's standalone chat.
export function newChatRow(owner: UserId, chat: NewChat, id: ChatId): SQL {
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

// A new chat in the owner's project, with no messages and no activity
// session: the project's conversation when it has none yet, and otherwise
// an adventure, as the multi-adventure pages still in this release make
// them. Rejects with the not-found case if the project is another user's.
// The site starts every conversation with the construct's opening
// (src/conversations/); tests make empty ones.
export function createChat(
  owner: UserId,
  chat: NewProjectChat,
): Promise<ProjectChat> {
  return withAppErrors("createChat", () =>
    inTransaction(async (tx) => {
      const conversation = await tx
        .insert(chats)
        .select(
          newChatRow(
            owner,
            { ...chat, continuing: true },
            randomId(parseChatId),
          ),
        )
        .onConflictDoNothing()
        .returning();
      let created = conversation;
      if (conversation.length === 0) {
        created = await tx
          .insert(chats)
          .select(newChatRow(owner, chat, randomId(parseChatId)))
          .returning();
      }
      const result = insertedProjectChat(created, chat.project);
      await grantVisualAssets(
        owner,
        tx,
        { kind: "adventure", id: result.id },
        { parts: chat.construct.definition },
      );
      return result;
    }),
  );
}

// A new quest of the owner's named projectName, with its conversation in
// construct and activity, which opening starts: the quest, the
// conversation, the message and the activity session are saved together,
// in one transaction. A Dailies quest (dailies) is saved only when the owner
// has none; undefined when they have one already, and nothing is saved.
export function createProjectWithChat(
  owner: UserId,
  projectName: ProjectName,
  chat: {
    readonly construct: NewChatConstruct;
    readonly activity: ChatActivity;
    readonly opening: NewMessage;
    readonly journal?: string;
    readonly dailies?: boolean;
  },
  transaction?: Transaction,
): Promise<ProjectChat | undefined> {
  async function save(db: Transaction): Promise<ProjectChat | undefined> {
    const projectId = randomId(parseProjectId);
    const id = randomId(parseChatId);
    const initialMemory = [chat.journal].flatMap((text) => {
      if (text === undefined || text === "") {
        return [];
      }
      return [
        {
          projectId,
          version: 1,
          text,
          author: "user",
          userId: owner,
        },
      ];
    });
    const dailies = chat.dailies === true;
    const inserted = await db
      .insert(projects)
      .values({ id: projectId, userId: owner, name: projectName, dailies })
      .onConflictDoNothing({
        target: projects.userId,
        where: sql`dailies`,
      })
      .returning({ id: projects.id });
    if (inserted.length === 0) {
      return undefined;
    }
    const created = await db
      .insert(chats)
      .values({
        id,
        projectId,
        continuing: true,
        constructId: chat.construct.id,
        constructName: chat.construct.name,
        constructParts: storedConstructPrompt(chat.construct.definition),
      })
      .returning();
    await db.insert(messages).values({
      id: chat.opening.id,
      chatId: id,
      role: chat.opening.role,
      parts: chat.opening.parts,
    });
    await db
      .insert(activitySessions)
      .select(newSession(owner, id, chat.activity, undefined));
    if (initialMemory.length > 0) {
      await db.insert(memoryVersions).values(initialMemory);
    }
    await grantVisualAssets(
      owner,
      db,
      { kind: "adventure", id },
      { parts: chat.construct.definition },
    );
    return insertedProjectChat(created, { id: projectId, name: projectName });
  }
  return withAppErrors("createProjectWithChat", () => {
    if (transaction !== undefined) {
      return save(transaction);
    }
    return inTransaction(save);
  });
}

export type { NewChat, NewChatConstruct };
export { randomId };
