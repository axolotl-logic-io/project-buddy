// The days of a user's Dailies quest, stored in Postgres (dailies_days):
// Start Day begins one, and Undo takes the newest one back until someone
// sends a message in its conversation. Dailies is its owner's alone, so
// every function takes the owner first, and a quest, a chat or a day that
// isn't theirs reads as not found.
//
// Start Day gives the quest a new, empty conversation. It parks the one
// before outside the quest, where no one can open or write to it, so Undo
// can put it back with its messages and spell; the next Start Day deletes
// it. A new id also keeps a late reply or a browser draft from refilling
// the new conversation.

import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  chatOpenTo,
  dailiesDayOwnedBy,
  ideaOpenTo,
  parkedChatOwnedBy,
  questOwnedBy,
} from "@/accounts/owner-scope.ts";
import { moveConversationAssets } from "@/constructs/visual-asset-store.ts";
import {
  DAY_TASK,
  type DailiesDay,
  type DailiesRecord,
  type LocalDate,
} from "@/dailies/dailies.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import { dailiesDays } from "@/db/tables/dailies-days.ts";
import { questIdeas } from "@/db/tables/quest-ideas.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  CHAT_ID,
  type ChatId,
  QUEST_ID,
  type QuestId,
  type UserId,
} from "@/ids.ts";
import { startTasksDay, undoTasksChange } from "@/tasks/tasks-store.ts";

// The most days readDailiesRecord reads, newest first: enough for any
// streak worth showing and for the Progress grid.
const MOST_DAYS = 400;

// What Start Day keeps of the Ideas it removed, to put them back on Undo.
const REMOVED_IDEA = z.object({
  id: z.uuid(),
  text: z.string(),
  position: z.number().int(),
  createdAt: z.iso.datetime({ offset: true }),
});

const DAY_ROW = z.object({
  localDate: z.string(),
  startedAt: z.date(),
  tasks: z.array(DAY_TASK).nullable(),
});

// What a Start Day may also remove: every task, every Idea.
interface DayStartOptions {
  readonly localDate: LocalDate;
  readonly clearTasks: boolean;
  readonly clearIdeas: boolean;
}

// The owner's continuing conversation id in their active Dailies, locked
// for the transaction, with the row as it is; undefined if id isn't it.
async function lockConversation(
  owner: UserId,
  id: ChatId,
  db: Transaction,
): Promise<typeof chats.$inferSelect | undefined> {
  const dailies = db
    .select({ id: quests.id })
    .from(quests)
    .where(
      and(
        questOwnedBy(owner),
        eq(quests.dailies, true),
        eq(quests.status, "active"),
      ),
    );
  const [row] = await db
    .select()
    .from(chats)
    .where(
      and(
        eq(chats.id, id),
        chatOpenTo(owner),
        eq(chats.continuing, true),
        inArray(chats.questId, dailies),
      ),
    )
    .for("update");
  return row;
}

// The newest day of the quest, locked for the transaction.
async function newestDay(
  owner: UserId,
  questId: string,
  db: Transaction,
): Promise<typeof dailiesDays.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(dailiesDays)
    .where(and(eq(dailiesDays.questId, questId), dailiesDayOwnedBy(owner)))
    .orderBy(desc(dailiesDays.startedAt))
    .limit(1)
    .for("update");
  return row;
}

// Begins a new day in the owner's active Dailies, whose continuing
// conversation id is, and returns the new conversation's id: it ends the
// day before, recording its recurring tasks, reopens the done ones, gives
// the quest an empty conversation with the same construct and no spell,
// and parks the one before for Undo. Ideas, Progress and one-off tasks
// stay, unless options remove the tasks or the Ideas. Undefined, changing
// nothing, if id isn't the owner's active Dailies conversation.
function startDay(
  owner: UserId,
  id: ChatId,
  options: DayStartOptions,
): Promise<ChatId | undefined> {
  return withAppErrors("startDay", () =>
    inTransaction(async (db) => {
      const previous = await lockConversation(owner, id, db);
      const questId = QUEST_ID.safeParse(previous?.questId).data;
      if (previous === undefined || questId === undefined) {
        return;
      }
      const tasks = await startTasksDay(owner, questId, db, options.clearTasks);
      let removedIdeas: unknown = null;
      if (options.clearIdeas) {
        removedIdeas = (
          await db
            .delete(questIdeas)
            .where(and(eq(questIdeas.questId, questId), ideaOpenTo(owner)))
            .returning()
        ).map((idea) => ({ ...idea, createdAt: idea.createdAt.toISOString() }));
      }
      const ended = await newestDay(owner, questId, db);
      if (ended !== undefined && ended.tasks === null) {
        await db
          .update(dailiesDays)
          .set({
            tasks: tasks.recurring.map(({ number, text, done }) => ({
              number,
              text,
              done,
            })),
          })
          .where(eq(dailiesDays.id, ended.id));
      }
      await deleteParked(owner, questId, db);
      const nextId = CHAT_ID.parse(crypto.randomUUID());
      await db.insert(chats).values({
        ...previous,
        id: nextId,
        spell: null,
        spellSnapshot: null,
        spellStartedAt: null,
        continuing: false,
        createdAt: new Date(),
      });
      await moveConversationAssets(owner, db, id, nextId);
      await db
        .update(chats)
        .set({
          questId: null,
          userId: owner,
          spell: null,
          spellSnapshot: null,
          continuing: false,
        })
        .where(and(eq(chats.id, id), chatOpenTo(owner)));
      await db
        .update(chats)
        .set({ continuing: true })
        .where(and(eq(chats.id, nextId), chatOpenTo(owner)));
      await db.insert(dailiesDays).values({
        questId,
        localDate: options.localDate,
        chatId: nextId,
        parkedChatId: id,
        parkedSpell: previous.spell,
        parkedSpellSnapshot: previous.spellSnapshot,
        tasksVersion: tasks.version ?? null,
        removedIdeas,
      });
      return nextId;
    }),
  );
}

// Deletes the conversations earlier Start Days parked in the quest, whose
// days can no longer be undone.
async function deleteParked(
  owner: UserId,
  questId: string,
  db: Transaction,
): Promise<void> {
  const parked = db
    .select({ id: dailiesDays.parkedChatId })
    .from(dailiesDays)
    .where(
      and(
        eq(dailiesDays.questId, questId),
        dailiesDayOwnedBy(owner),
        isNotNull(dailiesDays.parkedChatId),
      ),
    );
  await db
    .delete(chats)
    .where(
      and(
        inArray(chats.id, parked),
        parkedChatOwnedBy(owner),
        isNull(chats.questId),
      ),
    );
}

async function hasMessages(chatId: string, db: Transaction): Promise<boolean> {
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .limit(1);
  return rows.length > 0;
}

// Takes back the newest Start Day in the owner's active Dailies, whose
// continuing conversation id is, and returns the id of the conversation it
// puts back: the one before, with its messages and spell; the tasks
// and Ideas as they were, keeping later changes to the tasks; and the day
// before still going. Undefined, changing nothing, once someone has sent a
// message in id, or if id isn't the newest day's conversation.
function undoStartDay(owner: UserId, id: ChatId): Promise<ChatId | undefined> {
  return withAppErrors("undoStartDay", () =>
    inTransaction(async (db) => {
      const current = await lockConversation(owner, id, db);
      const questId = QUEST_ID.safeParse(current?.questId).data;
      if (questId === undefined) {
        return;
      }
      const day = await newestDay(owner, questId, db);
      if (
        day === undefined ||
        day.chatId !== id ||
        day.parkedChatId === null ||
        (await hasMessages(id, db))
      ) {
        return;
      }
      const parkedId = CHAT_ID.parse(day.parkedChatId);
      if (day.tasksVersion !== null) {
        // Start Day's version kept every point, so undoing it gains none.
        await undoTasksChange(
          owner,
          { questId, author: "person" },
          day.tasksVersion,
          { database: db, points: false },
        );
      }
      const ideas = z.array(REMOVED_IDEA).safeParse(day.removedIdeas).data;
      if (ideas !== undefined && ideas.length > 0) {
        await db
          .insert(questIdeas)
          .values(
            ideas.map((idea) => ({
              ...idea,
              questId,
              createdAt: new Date(idea.createdAt),
            })),
          )
          .onConflictDoNothing();
      }
      await db.delete(dailiesDays).where(eq(dailiesDays.id, day.id));
      const reopened = await newestDay(owner, questId, db);
      if (reopened !== undefined) {
        await db
          .update(dailiesDays)
          .set({ tasks: null })
          .where(eq(dailiesDays.id, reopened.id));
      }
      await db
        .update(chats)
        .set({
          questId,
          userId: null,
          spell: day.parkedSpell,
          spellSnapshot: day.parkedSpellSnapshot,
        })
        .where(
          and(
            eq(chats.id, parkedId),
            parkedChatOwnedBy(owner),
            isNull(chats.questId),
          ),
        );
      await moveConversationAssets(owner, db, id, parkedId);
      await db.delete(chats).where(and(eq(chats.id, id), chatOpenTo(owner)));
      await db
        .update(chats)
        .set({ continuing: true })
        .where(and(eq(chats.id, parkedId), chatOpenTo(owner)));
      return parkedId;
    }),
  );
}

// The owner's Dailies quest's days, oldest first, and whether its newest
// Start Day can still be undone; no days for a quest that isn't their
// Dailies.
async function readDailiesRecord(
  owner: UserId,
  questId: QuestId,
): Promise<DailiesRecord> {
  const rows = await withAppErrors("readDailiesRecord", () =>
    getDb()
      .select()
      .from(dailiesDays)
      .where(and(eq(dailiesDays.questId, questId), dailiesDayOwnedBy(owner)))
      .orderBy(desc(dailiesDays.startedAt))
      .limit(MOST_DAYS),
  );
  const days: DailiesDay[] = rows.flatMap((row) => {
    const parsed = DAY_ROW.safeParse(row);
    if (!parsed.success) {
      return [];
    }
    return [
      {
        date: parsed.data.localDate,
        startedAt: parsed.data.startedAt,
        tasks: parsed.data.tasks ?? undefined,
      },
    ];
  });
  days.reverse();
  return { days, undoable: await canUndo(owner, rows[0]) };
}

async function canUndo(
  owner: UserId,
  newest: typeof dailiesDays.$inferSelect | undefined,
): Promise<boolean> {
  if (
    newest === undefined ||
    newest.chatId === null ||
    newest.parkedChatId === null
  ) {
    return false;
  }
  const { chatId } = newest;
  const rows = await withAppErrors("readDailiesRecord", () =>
    getDb()
      .select({ id: chats.id })
      .from(chats)
      .where(
        and(
          eq(chats.id, chatId),
          chatOpenTo(owner),
          eq(chats.continuing, true),
          eq(chats.questId, newest.questId),
        ),
      ),
  );
  if (rows.length === 0) {
    return false;
  }
  const sent = await withAppErrors("readDailiesRecord", () =>
    getDb()
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .limit(1),
  );
  return sent.length === 0;
}

export type { DayStartOptions };
export { readDailiesRecord, startDay, undoStartDay };
