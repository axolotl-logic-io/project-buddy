// Each quest's plan, stored in Postgres as numbered versions: every change
// saves the whole plan after it, what it did and how to undo it, so the
// newest version is the plan and the versions are its history. A plan is
// its quest owner's alone: every function takes the acting user first, so
// another user's quest has no plan, and nothing is written to it. A change lands on the newest version, so two
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
import { planVersionOpenTo, questOwnedBy } from "@/accounts/owner-scope.ts";
import { chatAwaitsReply, noReplyAwaited } from "@/chats/store.ts";
import { type Database, getDb } from "@/db/client.ts";
import { planVersions } from "@/db/tables/plan-versions.ts";
import { chats, quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import {
  applyPlanOperations,
  applyPlanUndo,
  EMPTY_PLAN,
  PLAN,
  PLAN_CHANGE_LINE,
  PLAN_UNDO_OPERATION,
  type Plan,
  type PlanChangeLine,
  type PlanFailure,
  type PlanState,
  type PlanUndoOperation,
} from "@/plan/plan.ts";

// Who changes a plan: the construct, or the acting user.
type PlanAuthor = "construct" | "person";

// Where a change comes from: the quest whose plan it changes, who makes it
// and the chat in the quest it is made in, if any.
interface PlanChangeSource {
  readonly questId: QuestId;
  readonly author: PlanAuthor;
  readonly chatId?: ChatId | undefined;
}

// A saved change: its version, what it did, who made it, and the version it
// undid, if it is an undo.
interface PlanChange {
  readonly version: number;
  readonly lines: readonly PlanChangeLine[];
  readonly author: PlanAuthor;
  readonly undoesVersion?: number | undefined;
}

// Why an undo changed nothing, besides the reasons operations fail: the
// change was undone already, there is no such change to undo, such as an
// undo itself, or everything it did was changed or removed since.
type PlanUndoFailure = "already-undone" | "no-such-change" | "nothing-to-undo";

// Why a person's change in an adventure saved nothing: the adventure's
// newest message awaits a reply, as while one runs, or after one failed or
// stopped. A plan message after it would end the conversation that reply,
// a retry or "send again" answers (src/chats/store.ts, chatAwaitsReply).
type PlanChatFailure = "awaiting-reply";

// Why a change or an undo saved nothing.
type PlanChangeFailure = PlanFailure | PlanUndoFailure | PlanChatFailure;

// What a change or an undo did: the change it saved and the plan after it,
// or why it saved nothing, with the plan as it is. Undefined, with nothing
// saved, if the quest isn't open to the acting user, or the chat isn't in
// it.
type PlanChangeOutcome =
  | {
      readonly kind: "changed";
      readonly change: PlanChange;
      readonly state: PlanState;
    }
  | {
      readonly kind: "failed";
      readonly reason: PlanChangeFailure;
      readonly state: PlanState;
    }
  | undefined;

// How often a change is tried again when another change took the version it
// was based on, before it gives up as if the plan had not changed.
const MOST_ATTEMPTS = 5;

const PLAN_AUTHOR = z.enum(["construct", "person"]);

const VERSION_ROW = z.object({
  version: z.number().int().positive(),
  plan: PLAN,
  lines: z.array(PLAN_CHANGE_LINE),
  undo: z.array(PLAN_UNDO_OPERATION),
  undoesVersion: z.number().int().positive().nullable(),
  author: PLAN_AUTHOR,
});

type VersionRow = z.infer<typeof VERSION_ROW>;

const VERSION_COLUMNS: Pick<
  typeof planVersions,
  "version" | "plan" | "lines" | "undo" | "undoesVersion" | "author"
> = {
  version: planVersions.version,
  plan: planVersions.plan,
  lines: planVersions.lines,
  undo: planVersions.undo,
  undoesVersion: planVersions.undoesVersion,
  author: planVersions.author,
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
  const rows = await withAppErrors("readPlan", () =>
    database
      .select({ id: quests.id })
      .from(quests)
      .where(and(eq(quests.id, questId), questOwnedBy(owner))),
  );
  return rows.length > 0;
}

// The owner's quest's plan as of its newest version, with the versions
// whose changes were undone; undefined if the quest isn't open to them.
async function readPlanState(
  owner: UserId,
  questId: QuestId,
  database: Database = getDb(),
): Promise<PlanState | undefined> {
  const inQuest = and(
    eq(planVersions.questId, questId),
    planVersionOpenTo(owner),
  );
  const [latest, undone, open] = await Promise.all([
    withAppErrors("readPlan", () =>
      database
        .select(VERSION_COLUMNS)
        .from(planVersions)
        .where(inQuest)
        .orderBy(desc(planVersions.version))
        .limit(1),
    ),
    withAppErrors("readPlan", () =>
      database
        .select({ version: planVersions.undoesVersion })
        .from(planVersions)
        .where(and(inQuest, isNotNull(planVersions.undoesVersion))),
    ),
    questIsOpen(owner, questId, database),
  ]);
  if (!open) {
    return undefined;
  }
  const newest = toVersion(latest[0]);
  if (newest === undefined) {
    return { version: 0, plan: EMPTY_PLAN, undone: [] };
  }
  return {
    version: newest.version,
    plan: newest.plan,
    undone: undone.flatMap(({ version }) => {
      if (version === null) {
        return [];
      }
      return [version];
    }),
  };
}

// The owner's quest's plan; undefined if the quest isn't open to them.
async function readPlan(
  owner: UserId,
  questId: QuestId,
): Promise<Plan | undefined> {
  return (await readPlanState(owner, questId))?.plan;
}

// The version to save on top of basedOn, and what it did.
interface NextVersion {
  readonly basedOn: number;
  readonly plan: Plan;
  readonly lines: readonly PlanChangeLine[];
  readonly undo: readonly PlanUndoOperation[];
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
  source: PlanChangeSource,
  next: NextVersion,
  database: Database,
): Promise<boolean> {
  const { questId, author, chatId } = source;
  let userId: UserId | null = null;
  if (author === "person") {
    userId = owner;
  }
  const where: SQL[] = [eq(quests.id, questId), questOwnedBy(owner)];
  if (chatId !== undefined) {
    where.push(chatInQuest(questId, chatId));
    if (author === "person") {
      where.push(noReplyAwaited(chatId));
    }
  }
  const saved = await withAppErrors("changePlan", () =>
    database
      .insert(planVersions)
      .select(
        new QueryBuilder()
          .select({
            id: sql`gen_random_uuid()`.as("id"),
            questId: sql`${questId}::uuid`.as("quest_id"),
            version: sql`${next.basedOn + 1}::integer`.as("version"),
            plan: sql`${JSON.stringify(next.plan)}::jsonb`.as("plan"),
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
      .returning({ version: planVersions.version }),
  );
  return saved.length > 0;
}

// What one attempt at a change works out from the plan as it is: the version
// to save, or why there is none.
type Attempt =
  | { readonly kind: "save"; readonly next: NextVersion }
  | {
      readonly kind: "failed";
      readonly reason: PlanChangeFailure;
    };

// Works out a change from the newest plan and saves it on top, again from
// the newest plan whenever another change saved first.
async function saveChange(
  owner: UserId,
  source: PlanChangeSource,
  attempt: (state: PlanState) => Promise<Attempt>,
  {
    tries = 0,
    database = getDb(),
  }: { readonly tries?: number; readonly database?: Database } = {},
): Promise<PlanChangeOutcome> {
  const state = await readPlanState(owner, source.questId, database);
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
  if (await saveVersion(owner, source, next, database)) {
    const version = next.basedOn + 1;
    return {
      kind: "changed",
      change: {
        version,
        lines: next.lines,
        author: source.author,
        undoesVersion: next.undoesVersion,
      },
      state: { version, plan: next.plan, undone: undoneAfter(state, next) },
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
  return saveChange(owner, source, attempt, { tries: tries + 1, database });
}

function undoneAfter(state: PlanState, next: NextVersion): readonly number[] {
  if (next.undoesVersion === undefined) {
    return state.undone;
  }
  return [...state.undone, next.undoesVersion];
}

async function chatIsInQuest(
  owner: UserId,
  { questId, chatId }: PlanChangeSource,
): Promise<boolean> {
  if (chatId === undefined) {
    return true;
  }
  const rows = await withAppErrors("changePlan", () =>
    getDb()
      .select({ id: chats.id })
      .from(chats)
      .innerJoin(quests, eq(quests.id, chats.questId))
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.questId, questId),
          questOwnedBy(owner),
        ),
      ),
  );
  return rows.length > 0;
}

// Applies operations to the owner's quest's plan, all or none, as one new
// version by the source's author, from its chat (applyPlanOperations has
// the rules). A supplied database keeps the change in its caller’s transaction.
function changePlan(
  owner: UserId,
  source: PlanChangeSource,
  operations: readonly PlanUndoOperation[],
  database: Database = getDb(),
): Promise<PlanChangeOutcome> {
  return saveChange(
    owner,
    source,
    (state): Promise<Attempt> => {
      const outcome = applyPlanOperations(state.plan, operations);
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
// steps even when the saved list is longer than the usual new-step allowance.
async function reopenPlan(
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
        const outcome = applyPlanOperations(
          state.plan,
          state.plan.steps.map((step) => ({ op: "remove", step: step.number })),
        );
        if (outcome.kind === "failed") {
          return Promise.resolve(outcome);
        }
        return Promise.resolve({
          kind: "save",
          next: { basedOn: state.version, ...outcome },
        });
      }
      const completed = state.plan.steps.filter((step) => step.done);
      if (completed.length === 0) {
        return Promise.resolve({ kind: "failed", reason: "unchanged" });
      }
      return Promise.resolve({
        kind: "save",
        next: {
          basedOn: state.version,
          plan: {
            ...state.plan,
            steps: state.plan.steps.map((step) => ({ ...step, done: false })),
          },
          lines: completed.map((step) => ({ kind: "reopen", text: step.text })),
          undo: completed.map((step) => ({
            op: "complete",
            step: step.number,
          })),
        },
      });
    },
    { database },
  );
  if (
    result === undefined ||
    (result.kind === "failed" && result.reason !== "unchanged")
  ) {
    throw new Error("Could not reopen the plan for a fresh conversation");
  }
}

async function readVersion(
  owner: UserId,
  questId: QuestId,
  version: number,
): Promise<VersionRow | undefined> {
  const [row] = await withAppErrors("undoPlanChange", () =>
    getDb()
      .select(VERSION_COLUMNS)
      .from(planVersions)
      .where(
        and(
          eq(planVersions.questId, questId),
          eq(planVersions.version, version),
          planVersionOpenTo(owner),
        ),
      ),
  );
  return toVersion(row);
}

// Undoes the change saved as version of the owner's quest's plan, as a new
// version by the source's author that names it: the plan as it would be had
// that change not been made, keeping the changes after it (applyPlanUndo).
// An undo can't be undone, and a change can be undone once.
function undoPlanChange(
  owner: UserId,
  source: PlanChangeSource,
  version: number,
): Promise<PlanChangeOutcome> {
  return saveChange(owner, source, async (state): Promise<Attempt> => {
    const undone = await readVersion(owner, source.questId, version);
    if (undone === undefined || undone.undoesVersion !== null) {
      return { kind: "failed", reason: "no-such-change" };
    }
    if (state.undone.includes(version)) {
      return { kind: "failed", reason: "already-undone" };
    }
    const outcome = applyPlanUndo(state.plan, undone);
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

// The changes the owner made to their quest's plan from the chat that
// are still there to undo, newest first and at most most of them: not an
// undo, and not undone. /undo tries them in turn, since an older one's undo
// may apply where a newer one's has nothing left to undo.
async function undoableChanges(
  owner: UserId,
  { questId, chatId }: { questId: QuestId; chatId: ChatId },
  most: number,
): Promise<number[]> {
  const undoing = alias(planVersions, "undoing");
  const rows = await withAppErrors("undoPlanChange", () =>
    getDb()
      .select({ version: planVersions.version })
      .from(planVersions)
      .where(
        and(
          eq(planVersions.questId, questId),
          eq(planVersions.chatId, chatId),
          eq(planVersions.userId, owner),
          eq(planVersions.author, "person"),
          isNull(planVersions.undoesVersion),
          planVersionOpenTo(owner),
          sql`not ${exists(
            new QueryBuilder()
              .select({ id: undoing.id })
              .from(undoing)
              .where(
                and(
                  eq(undoing.questId, planVersions.questId),
                  eq(undoing.undoesVersion, planVersions.version),
                ),
              ),
          )}`,
        ),
      )
      .orderBy(desc(planVersions.version))
      .limit(most),
  );
  return rows.map(({ version }) => version);
}

export type {
  PlanAuthor,
  PlanChange,
  PlanChangeFailure,
  PlanChangeOutcome,
  PlanChangeSource,
  PlanUndoFailure,
};
export {
  changePlan,
  readPlan,
  readPlanState,
  reopenPlan,
  undoableChanges,
  undoPlanChange,
};
