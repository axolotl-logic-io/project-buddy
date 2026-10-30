// A chat's activity sessions, stored in Postgres: each the stretch of the
// chat spent in one activity, with a snapshot of the activity as it was when
// the chat entered it. A chat's newest session is its current activity. A
// session belongs to its chat's owner: every function takes the owner first,
// and another user's chat is not found.
import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { activitySessionOwnedBy } from "@/accounts/owner-scope.ts";
import type { ActivityId } from "@/activities/activity.ts";
import { parseActivityParts } from "@/activities/activity-parts-schema.ts";
import {
  builtInActivity,
  type ChatActivity,
} from "@/activities/chosen-activity.ts";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
  isActivityId,
} from "@/activities/index.ts";
import { type Chat, ownedChat } from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type MessageId,
  type OwnPromptId,
  parseOwnPromptId,
  type UserId,
} from "@/ids.ts";

type SessionRow = typeof activitySessions.$inferSelect;

// A stored activity id as the chat's activity's id: a built-in activity's
// or an own activity's, or undefined for anything else, which only a
// hand-edited row could hold.
function toActivityId(stored: string): ActivityId | OwnPromptId | undefined {
  if (isActivityId(stored)) {
    return stored;
  }
  return parseOwnPromptId(stored);
}

// A session's activity, or undefined for a row whose id or parts are not an
// activity's, which only a hand-edited row could hold.
function toChatActivity(row: SessionRow): ChatActivity | undefined {
  const id = toActivityId(row.activityId);
  const parts = parseActivityParts(row.activityParts);
  if (id === undefined || parts === undefined) {
    return undefined;
  }
  return { id, name: row.activityName, parts };
}

// The activity a chat with no sessions is in: a chat started before
// activities, which is the interview in its project's interview chat and
// the open chat in any other.
function activityBeforeSessions(
  chat: Pick<Chat, "isInterviewChat">,
): ChatActivity {
  if (chat.isInterviewChat) {
    return builtInActivity(INTERVIEW_ACTIVITY_ID);
  }
  return builtInActivity(DEFAULT_ACTIVITY_ID);
}

// The owner's chat's current activity: the activity of its newest session,
// or, for a chat with none, or another user's, the activity a chat started
// before activities is in.
async function currentActivity(
  owner: UserId,
  chat: Pick<Chat, "id" | "isInterviewChat">,
): Promise<ChatActivity> {
  const [row] = await withAppErrors("currentActivity", () =>
    getDb()
      .select()
      .from(activitySessions)
      .where(
        and(
          eq(activitySessions.chatId, chat.id),
          activitySessionOwnedBy(owner),
        ),
      )
      .orderBy(desc(activitySessions.createdAt), desc(activitySessions.id))
      .limit(1),
  );
  if (row === undefined) {
    return activityBeforeSessions(chat);
  }
  return toChatActivity(row) ?? activityBeforeSessions(chat);
}

// The select that yields a new session's row for the owner's chat, which
// enters activity at startMessageId, or nothing when the chat is not the
// owner's.
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
      activityParts: sql`${JSON.stringify(activity.parts)}::jsonb`.as(
        "activity_parts",
      ),
      startMessageId: sql`${startMessageId ?? null}::text`.as(
        "start_message_id",
      ),
      createdAt: sql`clock_timestamp()`.as("created_at"),
    })
    .from(chats)
    .where(ownedChat(owner, chatId))
    .getSQL();
}

// Makes activity the owner's chat's current activity, from startMessageId,
// the user message whose reply entered it or that the user changed it
// after, or from the chat's start when undefined. False, saving nothing, if
// the chat is another user's or unknown.
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
