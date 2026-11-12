import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { activitySessionOpenTo } from "@/accounts/owner-scope.ts";
import type { ActivityId } from "@/activities/activity.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import {
  parseActivityDefinition,
  storedActivityPrompt,
} from "@/activities/activity-definition.ts";
import {
  builtInActivity,
  type ChatActivity,
} from "@/activities/chosen-activity.ts";
import { isActivityId } from "@/activities/index.ts";
import { type Chat, openChat } from "@/chats/chat-rows.ts";
import { type Database, getDb } from "@/db/client.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type MessageId,
  type OwnPromptId,
  parseOwnPromptId,
  type UserId,
} from "@/ids.ts";

type SessionRow = typeof activitySessions.$inferSelect;

function toActivityId(stored: string): ActivityId | OwnPromptId | undefined {
  if (isActivityId(stored)) {
    return stored;
  }
  return parseOwnPromptId(stored);
}

function toChatActivity(row: SessionRow): ChatActivity | undefined {
  const id = toActivityId(row.activityId);
  const parts = parseActivityDefinition(row.activityParts);
  if (id === undefined || parts === undefined) {
    return undefined;
  }
  return { id, name: row.activityName, definition: parts };
}

async function currentActivity(
  owner: UserId,
  chat: Pick<Chat, "id">,
  database: Database = getDb(),
): Promise<ChatActivity> {
  const [row] = await withAppErrors("currentActivity", () =>
    database
      .select()
      .from(activitySessions)
      .where(
        and(eq(activitySessions.chatId, chat.id), activitySessionOpenTo(owner)),
      )
      .orderBy(desc(activitySessions.createdAt), desc(activitySessions.id))
      .limit(1),
  );
  if (row === undefined) {
    return builtInActivity(DEFAULT_ACTIVITY_ID);
  }
  return toChatActivity(row) ?? builtInActivity(DEFAULT_ACTIVITY_ID);
}

function newSession(
  owner: UserId,
  chatId: ChatId,
  activity: ChatActivity,
  startMessageId: MessageId | undefined,
): SQL {
  return new QueryBuilder()
    .select({
      id: sql`gen_random_uuid()`.as("id"),
      chatId: chats.id,
      activityId: sql`${activity.id}::text`.as("activity_id"),
      activityName: sql`${activity.name}::text`.as("activity_name"),
      activityParts:
        sql`${JSON.stringify(storedActivityPrompt(activity.definition))}::jsonb`.as(
          "activity_parts",
        ),
      startMessageId: sql`${startMessageId ?? null}::text`.as(
        "start_message_id",
      ),
      createdAt: sql`clock_timestamp()`.as("created_at"),
    })
    .from(chats)
    .where(openChat(owner, chatId))
    .getSQL();
}

async function enterActivity(
  owner: UserId,
  chatId: ChatId,
  activity: ChatActivity,
  startMessageId: MessageId | undefined,
): Promise<boolean> {
  const inserted = await withAppErrors("enterActivity", () =>
    getDb()
      .insert(activitySessions)
      .select(newSession(owner, chatId, activity, startMessageId))
      .returning({ id: activitySessions.id }),
  );
  return inserted.length > 0;
}

export { currentActivity, enterActivity, newSession };
