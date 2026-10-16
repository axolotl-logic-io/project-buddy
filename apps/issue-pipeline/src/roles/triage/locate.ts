// Where a triage run starts, and what it carries: the issue's hand-off fields
// and token accounting read from its saved state, this run counted and its
// session charged, and the session to run or the stop that keeps it from
// running. Every start runs triage again from its first step, so a restart
// repeats the session rather than resuming it (`every-role-resumes`). Pure.

import type { State } from "../../state.ts";
import type { Budgets } from "../../workflow/budget.ts";
import { chargeSession } from "../../workflow/budget.ts";
import type { Signature } from "../../workflow/signing.ts";
import { isStrings } from "../../workflow/stages/reply-guards.ts";
import type { MachineState, SessionEffect } from "../machine.ts";
import type { RoleContext } from "../walk.ts";
import type { TriageDecision, TriageReply } from "./reply.ts";
import { limitReason, triageSession } from "./task.ts";

// The issue's token accounting, as chargeSession keeps it.
interface TriageBudget {
  allocated: number;
  rebaseAllocated?: number;
  rechecking?: boolean;
  sessions?: string[];
  log?: string[];
}

// Why a run stops before its session: past `maxTriages`, or a session the
// budget can't pay for. `code` is the stop code (src/stops.ts).
interface TriageStop {
  code: string;
  reason: string;
  detail: string | null;
}

// What the run does first: the session, or a stop.
type TriageStart =
  | { kind: "session"; session: SessionEffect }
  | { kind: "stop"; stop: TriageStop };

// The session's reply as the run read it: not yet, unreadable, or decided.
type TriageReading =
  | { kind: "pending" }
  | { kind: "unreadable" }
  | { kind: "decided"; decision: TriageDecision; reply: TriageReply };

interface TriageData extends TriageBudget {
  issue: number;
  // 0 for an issue, 1 for a sub-issue.
  depth: number;
  // When the run started, which stamps its event-log lines.
  at: Date;
  // Who signs the run's comments.
  by: Signature;
  start: TriageStart;
  reading: TriageReading;
  // How many times triage has run on the issue, this run included.
  triages: number;
  plan: string | undefined;
  splitSuggested: string | null | undefined;
  pr: number | null | undefined;
  headSha: string | null | undefined;
  implemented: boolean | undefined;
}

// Counts this run on a copy of `st` and charges its session, and gives the
// stop that keeps the session from running, or null when it may run.
function startTriage<T extends TriageBudget & { triages?: number }>(
  st: T,
  maxTriages: number,
  budgets: Budgets,
  at: Date,
): { counted: T; stop: TriageStop | null } {
  const counted = { ...st, triages: (st.triages ?? 0) + 1 };
  if (counted.triages > maxTriages) {
    const reason = limitReason(maxTriages);
    return { counted, stop: { code: "triage-limit", reason, detail: null } };
  }
  const charge = chargeSession(budgets, counted, "triage", { at });
  if (!charge.charged) {
    const { reason, detail } = charge;
    return { counted, stop: { code: "budget", reason, detail } };
  }
  return { counted, stop: null };
}

function numberOr<T>(value: unknown, fallback: T): number | T {
  if (typeof value === "number") {
    return value;
  }
  return fallback;
}

function textOr<T>(value: unknown, fallback: T): string | T {
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

function nullOr(value: unknown): null | undefined {
  if (value === null) {
    return null;
  }
  return undefined;
}

// The saved state's token accounting; a malformed field reads as missing.
function budgetOf(saved: State): TriageBudget & { triages: number } {
  const { allocated, rebaseAllocated, rechecking, sessions, log, triages } =
    saved;
  const budget: TriageBudget & { triages: number } = {
    allocated: numberOr(allocated, 0),
    triages: numberOr(triages, 0),
  };
  if (typeof rebaseAllocated === "number") {
    budget.rebaseAllocated = rebaseAllocated;
  }
  if (rechecking === true) {
    budget.rechecking = true;
  }
  if (isStrings(sessions)) {
    budget.sessions = sessions;
  }
  if (isStrings(log)) {
    budget.log = log;
  }
  return budget;
}

type TriageHandoff = Pick<
  TriageData,
  "plan" | "splitSuggested" | "pr" | "headSha" | "implemented"
>;

// The saved hand-off fields; a malformed field reads as missing.
function handoffOf(saved: State): TriageHandoff {
  const { plan, splitSuggested, pr, headSha, implemented } = saved;
  let done: boolean | undefined;
  if (typeof implemented === "boolean") {
    done = implemented;
  }
  return {
    plan: textOr(plan, undefined),
    splitSuggested: textOr(splitSuggested, nullOr(splitSuggested)),
    pr: numberOr(pr, nullOr(pr)),
    headSha: textOr(headSha, nullOr(headSha)),
    implemented: done,
  };
}

// Starts every run at the triage step, with this run counted and charged.
function locate(
  saved: State,
  context: RoleContext,
): MachineState<string, TriageData> {
  const { issue, cfg, budgets, models, paths, now } = context;
  const depth = numberOr(saved.depth, 0);
  const session = triageSession(
    { n: issue, paths, depth },
    { cfg, budgets, models },
  );
  const { counted, stop } = startTriage(
    budgetOf(saved),
    cfg.maxTriages,
    budgets,
    now,
  );
  let start: TriageStart = { kind: "session", session };
  if (stop !== null) {
    start = { kind: "stop", stop };
  }
  const { agent, model } = session;
  const by: Signature = { role: "triage", agent, model, run: null };
  const data: TriageData = {
    ...counted,
    ...handoffOf(saved),
    issue,
    depth,
    at: now,
    by,
    start,
    reading: { kind: "pending" },
  };
  return { at: "triage", data };
}

export type { TriageData, TriageReading, TriageStop };
export { locate, startTriage };
