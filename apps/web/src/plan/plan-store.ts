// Each project's plan, stored in Postgres as numbered versions: every change
// saves the whole plan after it, what it did and how to undo it, so the
// newest version is the plan and the versions are its history. A plan is
// open to everyone in its project, its owner and its members: every function
// takes the acting user first, so a project not open to them has no plan,
// and nothing is written to it. A change lands on the newest version, so two
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
import { planVersionOpenTo, projectOpenTo } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { planVersions } from "@/db/tables/plan-versions.ts";
import { chats, projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ChatId, ProjectId, UserId } from "@/ids.ts";
import {
  applyPlanOperations,
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

// Where a change comes from: the project whose plan it changes, who makes it
// and the chat in the project it is made in, if any.
interface PlanChangeSource {
  readonly projectId: ProjectId;
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
// change was undone already, or there is no such change to undo, such as an
// undo itself.
type PlanUndoFailure = "already-undone" | "no-such-change";

// What a change or an undo did: the change it saved and the plan after it,
// or why it saved nothing, with the plan as it is. Undefined, with nothing
// saved, if the project isn't open to the acting user, or the chat isn't in
// it.
type PlanChangeOutcome =
  | {
      readonly kind: "changed";
      readonly change: PlanChange;
      readonly state: PlanState;
    }
  | {
      readonly kind: "failed";
      readonly reason: PlanFailure | PlanUndoFailure;
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

async function projectIsOpen(
  owner: UserId,
  projectId: ProjectId,
): Promise<boolean> {
  const rows = await withAppErrors("readPlan", () =>
    getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectOpenTo(owner))),
  );
  return rows.length > 0;
}

// The owner's project's plan as of its newest version, with the versions
// whose changes were undone; undefined if the project isn't open to them.
async function readPlanState(
  owner: UserId,
  projectId: ProjectId,
): Promise<PlanState | undefined> {
  const inProject = and(
    eq(planVersions.projectId, projectId),
    planVersionOpenTo(owner),
  );
  const [latest, undone, open] = await Promise.all([
    withAppErrors("readPlan", () =>
      getDb()
        .select(VERSION_COLUMNS)
        .from(planVersions)
        .where(inProject)
        .orderBy(desc(planVersions.version))
        .limit(1),
    ),
    withAppErrors("readPlan", () =>
      getDb()
        .select({ version: planVersions.undoesVersion })
        .from(planVersions)
        .where(and(inProject, isNotNull(planVersions.undoesVersion))),
    ),
    projectIsOpen(owner, projectId),
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

// The owner's project's plan; undefined if the project isn't open to them.
async function readPlan(
  owner: UserId,
  projectId: ProjectId,
): Promise<Plan | undefined> {
  return (await readPlanState(owner, projectId))?.plan;
}

// The version to save on top of basedOn, and what it did.
interface NextVersion {
  readonly basedOn: number;
  readonly plan: Plan;
  readonly lines: readonly PlanChangeLine[];
  readonly undo: readonly PlanUndoOperation[];
  readonly undoesVersion?: number | undefined;
}

// True when the chat is in the project.
function chatInProject(projectId: ProjectId, chatId: ChatId): SQL {
  return exists(
    new QueryBuilder()
      .select({ id: chats.id })
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.projectId, projectId))),
  );
}

// Saves next as the version after its basedOn, and says whether it did. It
// saves nothing if another change saved that version first, or the undo it
// is undid that change already, or the project isn't open to the owner, or
// the source's chat isn't in it.
async function saveVersion(
  owner: UserId,
  source: PlanChangeSource,
  next: NextVersion,
): Promise<boolean> {
  const { projectId, author, chatId } = source;
  let userId: UserId | null = null;
  if (author === "person") {
    userId = owner;
  }
  const where: SQL[] = [eq(projects.id, projectId), projectOpenTo(owner)];
  if (chatId !== undefined) {
    where.push(chatInProject(projectId, chatId));
  }
  const saved = await withAppErrors("changePlan", () =>
    getDb()
      .insert(planVersions)
      .select(
        new QueryBuilder()
          .select({
            id: sql`gen_random_uuid()`.as("id"),
            projectId: sql`${projectId}::uuid`.as("project_id"),
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
          .from(projects)
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
      readonly reason: PlanFailure | PlanUndoFailure;
    };

// Works out a change from the newest plan and saves it on top, again from
// the newest plan whenever another change saved first.
async function saveChange(
  owner: UserId,
  source: PlanChangeSource,
  attempt: (state: PlanState) => Promise<Attempt>,
  tries = 0,
): Promise<PlanChangeOutcome> {
  const state = await readPlanState(owner, source.projectId);
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
  if (await saveVersion(owner, source, next)) {
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
  // A chat outside the project saves nothing, however often it is tried.
  if (tries === 0 && !(await chatIsInProject(owner, source))) {
    return undefined;
  }
  return saveChange(owner, source, attempt, tries + 1);
}

function undoneAfter(state: PlanState, next: NextVersion): readonly number[] {
  if (next.undoesVersion === undefined) {
    return state.undone;
  }
  return [...state.undone, next.undoesVersion];
}

async function chatIsInProject(
  owner: UserId,
  { projectId, chatId }: PlanChangeSource,
): Promise<boolean> {
  if (chatId === undefined) {
    return true;
  }
  const rows = await withAppErrors("changePlan", () =>
    getDb()
      .select({ id: chats.id })
      .from(chats)
      .innerJoin(projects, eq(projects.id, chats.projectId))
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.projectId, projectId),
          projectOpenTo(owner),
        ),
      ),
  );
  return rows.length > 0;
}

// Applies operations to the owner's project's plan, all or none, as one new
// version by the source's author, from its chat (applyPlanOperations has
// the rules).
function changePlan(
  owner: UserId,
  source: PlanChangeSource,
  operations: readonly PlanUndoOperation[],
): Promise<PlanChangeOutcome> {
  return saveChange(owner, source, (state): Promise<Attempt> => {
    const outcome = applyPlanOperations(state.plan, operations);
    if (outcome.kind === "failed") {
      return Promise.resolve(outcome);
    }
    return Promise.resolve({
      kind: "save",
      next: { basedOn: state.version, ...outcome },
    });
  });
}

async function readVersion(
  owner: UserId,
  projectId: ProjectId,
  version: number,
): Promise<VersionRow | undefined> {
  const [row] = await withAppErrors("undoPlanChange", () =>
    getDb()
      .select(VERSION_COLUMNS)
      .from(planVersions)
      .where(
        and(
          eq(planVersions.projectId, projectId),
          eq(planVersions.version, version),
          planVersionOpenTo(owner),
        ),
      ),
  );
  return toVersion(row);
}

// Undoes the change saved as version of the owner's project's plan, as a new
// version by the source's author that names it: the plan as it would be had
// that change not been made, keeping the changes after it. An undo can't be
// undone, and a change can be undone once.
function undoPlanChange(
  owner: UserId,
  source: PlanChangeSource,
  version: number,
): Promise<PlanChangeOutcome> {
  return saveChange(owner, source, async (state): Promise<Attempt> => {
    const undone = await readVersion(owner, source.projectId, version);
    if (undone === undefined || undone.undoesVersion !== null) {
      return { kind: "failed", reason: "no-such-change" };
    }
    if (state.undone.includes(version)) {
      return { kind: "failed", reason: "already-undone" };
    }
    const outcome = applyPlanOperations(state.plan, undone.undo);
    if (outcome.kind === "failed") {
      return outcome;
    }
    return {
      kind: "save",
      next: { basedOn: state.version, ...outcome, undoesVersion: version },
    };
  });
}

// The newest change the owner made to their project's plan from the chat
// that is still there to undo: not an undo, and not undone. Undefined if
// there is none.
async function latestUndoableChange(
  owner: UserId,
  { projectId, chatId }: { projectId: ProjectId; chatId: ChatId },
): Promise<number | undefined> {
  const undoing = alias(planVersions, "undoing");
  const [row] = await withAppErrors("undoPlanChange", () =>
    getDb()
      .select({ version: planVersions.version })
      .from(planVersions)
      .where(
        and(
          eq(planVersions.projectId, projectId),
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
                  eq(undoing.projectId, planVersions.projectId),
                  eq(undoing.undoesVersion, planVersions.version),
                ),
              ),
          )}`,
        ),
      )
      .orderBy(desc(planVersions.version))
      .limit(1),
  );
  return row?.version;
}

export type {
  PlanAuthor,
  PlanChange,
  PlanChangeOutcome,
  PlanChangeSource,
  PlanUndoFailure,
};
export {
  changePlan,
  latestUndoableChange,
  readPlan,
  readPlanState,
  undoPlanChange,
};
