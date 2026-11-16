// Each quest's tasks, stored in Postgres as numbered versions: every change
// saves the whole tasks after it, what it did and how to undo it, so the
// newest version is the tasks and the versions are its history. A tasks is
// open to its quest's owner and members: every function takes the acting
// user first, so a quest not open to them has no tasks, and nothing is
// written to it. A change lands on the newest version, so two
// changes made at once are both kept, one after the other.

import {
  and,
  desc,
  eq,
  exists,
  isNotNull,
  isNull,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { z } from "zod";
import { questOpenTo, tasksVersionOpenTo } from "@/accounts/owner-scope.ts";
import { chatAwaitsReply, noReplyAwaited } from "@/chats/store.ts";
import { type Database, getDb } from "@/db/client.ts";
import { chats, quests } from "@/db/tables/quests-and-chats.ts";
import { tasksVersions } from "@/db/tables/tasks-versions.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { changeTaskPoints } from "@/experience/experience-store.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import {
  applyTasksOperations,
  applyTasksUndo,
  EMPTY_TASKS,
  TASKS,
  TASKS_CHANGE_LINE,
  TASKS_UNDO_OPERATION,
  type Tasks,
  type TasksChangeLine,
  type TasksFailure,
  type TasksState,
  type TasksUndoOperation,
} from "@/tasks/tasks.ts";

// Who changes a tasks: the construct, or the acting user.
type TasksAuthor = "construct" | "person";

// Where a change comes from: the quest whose tasks it changes, who makes it
// and the chat in the quest it is made in, if any.
interface TasksChangeSource {
  readonly questId: QuestId;
  readonly author: TasksAuthor;
  readonly chatId?: ChatId | undefined;
}

// A saved change: its version, what it did, who made it, and the version it
// undid, if it is an undo.
interface TasksChange {
  readonly version: number;
  readonly lines: readonly TasksChangeLine[];
  readonly author: TasksAuthor;
  readonly undoesVersion?: number | undefined;
}

// Why an undo changed nothing, besides the reasons operations fail: the
// change was undone already, there is no such change to undo, such as an
// undo itself, or everything it did was changed or removed since.
type TasksUndoFailure = "already-undone" | "no-such-change" | "nothing-to-undo";

// Why a person's change in an adventure saved nothing: the adventure's
// newest message awaits a reply, as while one runs, or after one failed or
// stopped. A tasks message after it would end the conversation that reply,
// a retry or "send again" answers (src/chats/store.ts, chatAwaitsReply).
type TasksChatFailure = "awaiting-reply";

// Why a change or an undo saved nothing.
type TasksChangeFailure = TasksFailure | TasksUndoFailure | TasksChatFailure;

// What a change or an undo did: the change it saved and the tasks after it,
// or why it saved nothing, with the tasks as they are. Undefined, with nothing
// saved, if the quest isn't open to the acting user, or the chat isn't in
// it.
type TasksChangeOutcome =
  | {
      readonly kind: "changed";
      readonly change: TasksChange;
      readonly state: TasksState;
    }
  | {
      readonly kind: "failed";
      readonly reason: TasksChangeFailure;
      readonly state: TasksState;
    }
  | undefined;

// How often a change is tried again when another change took the version it
// was based on, before it gives up as if the tasks had not changed.
const MOST_ATTEMPTS = 5;

const TASKS_AUTHOR = z.enum(["construct", "person"]);

const VERSION_ROW = z.object({
  version: z.number().int().positive(),
  tasks: TASKS,
  lines: z.array(TASKS_CHANGE_LINE),
  undo: z.array(TASKS_UNDO_OPERATION),
  undoesVersion: z.number().int().positive().nullable(),
  author: TASKS_AUTHOR,
});

type VersionRow = z.infer<typeof VERSION_ROW>;

const VERSION_COLUMNS: Pick<
  typeof tasksVersions,
  "version" | "tasks" | "lines" | "undo" | "undoesVersion" | "author"
> = {
  version: tasksVersions.version,
  tasks: tasksVersions.tasks,
  lines: tasksVersions.lines,
  undo: tasksVersions.undo,
  undoesVersion: tasksVersions.undoesVersion,
  author: tasksVersions.author,
};

// The row as a version, or undefined if it isn't one, which only a write
// outside this module could save.
function toVersion(row: unknown): VersionRow | undefined {
  return VERSION_ROW.safeParse(row).data;
}

async function questIsOpen(
  owner: UserId,
  questId: QuestId,
  database: Database,
): Promise<boolean> {
  const rows = await withAppErrors("readTasks", () =>
    database
      .select({ id: quests.id })
      .from(quests)
      .where(and(eq(quests.id, questId), questOpenTo(owner))),
  );
  return rows.length > 0;
}

// The owner's quest's tasks as of its newest version, with the versions
// whose changes were undone; undefined if the quest isn't open to them.
async function readTasksState(
  owner: UserId,
  questId: QuestId,
  database: Database = getDb(),
): Promise<TasksState | undefined> {
  const inQuest = and(
    eq(tasksVersions.questId, questId),
    tasksVersionOpenTo(owner),
  );
  const [latest, undone, open] = await Promise.all([
    withAppErrors("readTasks", () =>
      database
        .select(VERSION_COLUMNS)
        .from(tasksVersions)
        .where(inQuest)
        .orderBy(desc(tasksVersions.version))
        .limit(1),
    ),
    withAppErrors("readTasks", () =>
      database
        .select({ version: tasksVersions.undoesVersion })
        .from(tasksVersions)
        .where(and(inQuest, isNotNull(tasksVersions.undoesVersion))),
    ),
    questIsOpen(owner, questId, database),
  ]);
  if (!open) {
    return undefined;
  }
  const newest = toVersion(latest[0]);
  if (newest === undefined) {
    return { version: 0, tasks: EMPTY_TASKS, undone: [] };
  }
  return {
    version: newest.version,
    tasks: newest.tasks,
    undone: undone.flatMap(({ version }) => {
      if (version === null) {
        return [];
      }
      return [version];
    }),
  };
}

// The owner's quest's tasks; undefined if the quest isn't open to them.
async function readTasks(
  owner: UserId,
  questId: QuestId,
): Promise<Tasks | undefined> {
  return (await readTasksState(owner, questId))?.tasks;
}

// The version to save on top of basedOn, and what it did.
interface NextVersion {
  readonly basedOn: number;
  readonly tasks: Tasks;
  readonly lines: readonly TasksChangeLine[];
  readonly undo: readonly TasksUndoOperation[];
  readonly undoesVersion?: number | undefined;
}

// True when the chat is in the quest.
function chatInQuest(questId: QuestId, chatId: ChatId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: chats.id })
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.questId, questId))),
  );
}

// Saves next as the version after its basedOn, and says whether it did. It
// saves nothing if another change saved that version first, or the undo it
// is undid that change already, or the quest isn't open to the owner, or
// the source's chat isn't in it, or, for a person's change, the chat's
// newest message awaits a reply. The construct's own change is made while
// its reply to that message runs.
async function saveVersion(
  owner: UserId,
  source: TasksChangeSource,
  next: NextVersion,
  database: Database,
): Promise<boolean> {
  const { questId, author, chatId } = source;
  let userId: UserId | null = null;
  if (author === "person") {
    userId = owner;
  }
  const where: SQL[] = [eq(quests.id, questId), questOpenTo(owner)];
  if (chatId !== undefined) {
    where.push(chatInQuest(questId, chatId));
    if (author === "person") {
      where.push(noReplyAwaited(chatId));
    }
  }
  const saved = await withAppErrors("changeTasks", () =>
    database
      .insert(tasksVersions)
      .select(
        new QueryBuilder()
          .select({
            id: sql`gen_random_uuid()`.as("id"),
            questId: sql`${questId}::uuid`.as("quest_id"),
            version: sql`${next.basedOn + 1}::integer`.as("version"),
            tasks: sql`${JSON.stringify(next.tasks)}::jsonb`.as("tasks"),
            lines: sql`${JSON.stringify(next.lines)}::jsonb`.as("lines"),
            undo: sql`${JSON.stringify(next.undo)}::jsonb`.as("undo"),
            undoesVersion: sql`${next.undoesVersion ?? null}::integer`.as(
              "undoes_version",
            ),
            author: sql`${author}::text`.as("author"),
            userId: sql`${userId}::uuid`.as("user_id"),
            chatId: sql`${chatId ?? null}::uuid`.as("chat_id"),
            createdAt: sql`now()`.as("created_at"),
          })
          .from(quests)
          .where(and(...where)),
      )
      .onConflictDoNothing()
      .returning({ version: tasksVersions.version }),
  );
  return saved.length > 0;
}

// What one attempt at a change works out from the tasks as they are: the version
// to save, or why there is none.
type Attempt =
  | { readonly kind: "save"; readonly next: NextVersion }
  | {
      readonly kind: "failed";
      readonly reason: TasksChangeFailure;
    };

// How a change is saved: how often it was tried already, the database or
// transaction it is saved in, and whether it gains and loses the acting
// user's ability points, as every change but a fresh day's does.
interface SaveOptions {
  readonly tries?: number;
  readonly database?: Database;
  readonly points?: boolean;
}

// Works out a change from the newest tasks and saves it on top, again from
// the newest tasks whenever another change saved first. The points it gains
// or takes back are saved with it.
async function saveChange(
  owner: UserId,
  source: TasksChangeSource,
  attempt: (state: TasksState) => Promise<Attempt>,
  { tries = 0, database = getDb(), points = true }: SaveOptions = {},
): Promise<TasksChangeOutcome> {
  const state = await readTasksState(owner, source.questId, database);
  if (state === undefined) {
    return undefined;
  }
  if (tries >= MOST_ATTEMPTS) {
    return { kind: "failed", reason: "unchanged", state };
  }
  const worked = await attempt(state);
  if (worked.kind === "failed") {
    return { kind: "failed", reason: worked.reason, state };
  }
  const { next } = worked;
  const saved = await database.transaction(async (tx): Promise<boolean> => {
    if (!(await saveVersion(owner, source, next, tx))) {
      return false;
    }
    if (points === true) {
      await withAppErrors("changeTasks", () =>
        changeTaskPoints(
          tx,
          { user: owner, questId: source.questId },
          state.tasks,
          next.tasks,
        ),
      );
    }
    return true;
  });
  if (saved) {
    const version = next.basedOn + 1;
    return {
      kind: "changed",
      change: {
        version,
        lines: next.lines,
        author: source.author,
        undoesVersion: next.undoesVersion,
      },
      state: { version, tasks: next.tasks, undone: undoneAfter(state, next) },
    };
  }
  // A chat outside the quest saves nothing, however often it is tried,
  // and nor does a person's change in a chat awaiting a reply.
  if (tries === 0) {
    if (!(await chatIsInQuest(owner, source))) {
      return undefined;
    }
    if (
      source.author === "person" &&
      source.chatId !== undefined &&
      (await chatAwaitsReply(owner, source.chatId))
    ) {
      return { kind: "failed", reason: "awaiting-reply", state };
    }
  }
  return saveChange(owner, source, attempt, {
    tries: tries + 1,
    database,
    points,
  });
}

function undoneAfter(state: TasksState, next: NextVersion): readonly number[] {
  if (next.undoesVersion === undefined) {
    return state.undone;
  }
  return [...state.undone, next.undoesVersion];
}

async function chatIsInQuest(
  owner: UserId,
  { questId, chatId }: TasksChangeSource,
): Promise<boolean> {
  if (chatId === undefined) {
    return true;
  }
  const rows = await withAppErrors("changeTasks", () =>
    getDb()
      .select({ id: chats.id })
      .from(chats)
      .innerJoin(quests, eq(quests.id, chats.questId))
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.questId, questId),
          questOpenTo(owner),
        ),
      ),
  );
  return rows.length > 0;
}

// Applies operations to the owner's quest's tasks, all or none, as one new
// version by the source's author, from its chat (applyTasksOperations has
// the rules). A supplied database keeps the change in its caller’s transaction.
function changeTasks(
  owner: UserId,
  source: TasksChangeSource,
  operations: readonly TasksUndoOperation[],
  database: Database = getDb(),
): Promise<TasksChangeOutcome> {
  return saveChange(
    owner,
    source,
    (state): Promise<Attempt> => {
      const outcome = applyTasksOperations(state.tasks, operations);
      if (outcome.kind === "failed") {
        return Promise.resolve(outcome);
      }
      return Promise.resolve({
        kind: "save",
        next: { basedOn: state.version, ...outcome },
      });
    },
    { database },
  );
}

// A fresh day keeps the entire list and its numbering, reopening completed
// tasks even when the saved list is longer than the usual new-task allowance.
// Their completions keep their points, so completing them again gains more.
async function reopenTasks(
  owner: UserId,
  questId: QuestId,
  database: Database = getDb(),
  clear = false,
): Promise<void> {
  const result = await saveChange(
    owner,
    { questId, author: "person" },
    (state): Promise<Attempt> => {
      if (clear) {
        const outcome = applyTasksOperations(
          state.tasks,
          state.tasks.items.map((task) => ({
            op: "remove",
            task: task.number,
          })),
        );
        if (outcome.kind === "failed") {
          return Promise.resolve(outcome);
        }
        return Promise.resolve({
          kind: "save",
          next: { basedOn: state.version, ...outcome },
        });
      }
      const completed = state.tasks.items.filter((task) => task.done);
      if (completed.length === 0) {
        return Promise.resolve({ kind: "failed", reason: "unchanged" });
      }
      return Promise.resolve({
        kind: "save",
        next: {
          basedOn: state.version,
          tasks: {
            ...state.tasks,
            items: state.tasks.items.map((task) => ({ ...task, done: false })),
          },
          lines: completed.map((task) => ({ kind: "reopen", text: task.text })),
          undo: completed.map((task) => ({
            op: "complete",
            task: task.number,
          })),
        },
      });
    },
    { database, points: false },
  );
  if (
    result === undefined ||
    (result.kind === "failed" && result.reason !== "unchanged")
  ) {
    throw new Error("Could not reopen the tasks for a fresh conversation");
  }
}

async function readVersion(
  owner: UserId,
  questId: QuestId,
  version: number,
): Promise<VersionRow | undefined> {
  const [row] = await withAppErrors("undoTasksChange", () =>
    getDb()
      .select(VERSION_COLUMNS)
      .from(tasksVersions)
      .where(
        and(
          eq(tasksVersions.questId, questId),
          eq(tasksVersions.version, version),
          tasksVersionOpenTo(owner),
        ),
      ),
  );
  return toVersion(row);
}

// Undoes the change saved as version of the owner's quest's tasks, as a new
// version by the source's author that names it: the tasks as it would be had
// that change not been made, keeping the changes after it (applyTasksUndo).
// An undo can't be undone, and a change can be undone once.
function undoTasksChange(
  owner: UserId,
  source: TasksChangeSource,
  version: number,
): Promise<TasksChangeOutcome> {
  return saveChange(owner, source, async (state): Promise<Attempt> => {
    const undone = await readVersion(owner, source.questId, version);
    if (undone === undefined || undone.undoesVersion !== null) {
      return { kind: "failed", reason: "no-such-change" };
    }
    if (state.undone.includes(version)) {
      return { kind: "failed", reason: "already-undone" };
    }
    const outcome = applyTasksUndo(state.tasks, undone);
    if (outcome.kind === "failed" && outcome.reason === "unchanged") {
      return { kind: "failed", reason: "nothing-to-undo" };
    }
    if (outcome.kind === "failed") {
      return outcome;
    }
    return {
      kind: "save",
      next: { basedOn: state.version, ...outcome, undoesVersion: version },
    };
  });
}

// The changes the owner made to their quest's tasks from the chat that
// are still there to undo, newest first and at most most of them: not an
// undo, and not undone. /undo tries them in turn, since an older one's undo
// may apply where a newer one's has nothing left to undo.
async function undoableChanges(
  owner: UserId,
  { questId, chatId }: { questId: QuestId; chatId: ChatId },
  most: number,
): Promise<number[]> {
  const undoing = alias(tasksVersions, "undoing");
  const rows = await withAppErrors("undoTasksChange", () =>
    getDb()
      .select({ version: tasksVersions.version })
      .from(tasksVersions)
      .where(
        and(
          eq(tasksVersions.questId, questId),
          eq(tasksVersions.chatId, chatId),
          eq(tasksVersions.userId, owner),
          eq(tasksVersions.author, "person"),
          isNull(tasksVersions.undoesVersion),
          tasksVersionOpenTo(owner),
          sql`not ${exists(
            new QueryBuilder()
              .select({ id: undoing.id })
              .from(undoing)
              .where(
                and(
                  eq(undoing.questId, tasksVersions.questId),
                  eq(undoing.undoesVersion, tasksVersions.version),
                ),
              ),
          )}`,
        ),
      )
      .orderBy(desc(tasksVersions.version))
      .limit(most),
  );
  return rows.map(({ version }) => version);
}

export type {
  TasksAuthor,
  TasksChange,
  TasksChangeFailure,
  TasksChangeOutcome,
  TasksChangeSource,
  TasksUndoFailure,
};
export {
  changeTasks,
  readTasks,
  readTasksState,
  reopenTasks,
  undoableChanges,
  undoTasksChange,
};
