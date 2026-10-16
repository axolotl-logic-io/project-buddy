// The merge order between issues: which other issue's PR should merge before
// this one's. By default the oldest ready PR goes first (decision
// merge-order); the orchestrator can pass its own ranked queue instead (#234).

import { z } from "zod";
import type { Config } from "../config.ts";
import { ghJson } from "../github.ts";
import { LABELS } from "../labels.ts";
import { readState } from "../state.ts";
import { isStopLabel } from "../stops.ts";

const MS_PER_HOUR = 3_600_000;
const WORKING_LIST_LIMIT = "100";

// Stages after review, where an issue only waits to merge.
const READY_STAGES: ReadonlySet<string> = new Set([
  "sync",
  "checks",
  "accept",
  "security",
  "merge",
]);

// The issues gh lists, and the part of another issue's state the order reads.
const WORKING = z
  .array(
    z.looseObject({
      labels: z.array(z.looseObject({ name: z.string() })),
      number: z.number(),
    }),
  )
  .nullable();
const READY_STATE = z.looseObject({
  lease: z.looseObject({ at: z.string().nullish() }).nullish(),
  pr: z.number().positive(),
  stage: z.string(),
});

// What the order reads from a merge request.
interface OrderRequest {
  number: number;
  mergeOrder?: boolean | null | undefined;
  mergeQueue?: readonly number[] | null | undefined;
  state: { pr: number };
}

// The merge waits for issue #waitingFor and its PR #waitingForPr.
interface Queued {
  merged: false;
  reason: "queued";
  waitingFor: number;
  waitingForPr: number;
}

interface Ahead {
  number: number;
  pr: number;
}

// The PR of issue #number when it should merge before PR `pr`: past review,
// with an older PR and a lease that hasn't expired (a crashed sweep).
function readyPr(
  cfg: Config,
  number: number,
  pr: number,
  leaseMs: number,
): number | undefined {
  const parsed = READY_STATE.safeParse(readState(cfg, number).state);
  if (!parsed.success) {
    return undefined;
  }
  const { data } = parsed;
  if (data.pr >= pr || !READY_STAGES.has(data.stage)) {
    return undefined;
  }
  const at = data.lease?.at;
  const leased = at !== undefined && at !== null && at !== "";
  if (leased && Date.now() - Date.parse(at) >= leaseMs) {
    return undefined;
  }
  return data.pr;
}

// The open issues gh lists, with their labels; `label` narrows the list.
function openIssueLabels(
  cfg: Config,
  label: readonly string[],
): z.infer<typeof WORKING> {
  return WORKING.parse(
    ghJson(cfg, [
      "issue",
      "list",
      "-R",
      cfg.repo,
      "--state",
      "open",
      ...label,
      "--limit",
      WORKING_LIST_LIMIT,
      "--json",
      "number,labels",
    ]),
  );
}

// The open issue, other than #n, that should merge before PR `pr`: one past
// review whose PR is older. Without this, a slow issue's long verify keeps
// losing the merge to quick issues in the other slots.
function olderReadyIssue(cfg: Config, n: number, pr: number): Ahead | null {
  const listed = openIssueLabels(cfg, ["--label", LABELS.working.name]);
  const leaseMs = cfg.leaseHours * MS_PER_HOUR;
  let best: Ahead | null = null;
  for (const issue of listed ?? []) {
    const stopped = issue.labels.some((label) => isStopLabel(label.name));
    if (issue.number !== n && !stopped) {
      const older = readyPr(cfg, issue.number, pr, leaseMs);
      if (older !== undefined && (best === null || older < best.pr)) {
        best = { number: issue.number, pr: older };
      }
    }
  }
  return best;
}

// The first issue ahead of #n in the orchestrator's ranked queue that is
// open, not stopped and at a ready stage.
function aheadInQueue(
  cfg: Config,
  n: number,
  queue: readonly number[],
): Ahead | null {
  const open = new Map(
    (openIssueLabels(cfg, []) ?? []).map((issue) => [issue.number, issue]),
  );
  const at = queue.indexOf(n);
  for (const number of queue.slice(0, Math.max(at, 0))) {
    const issue = open.get(number);
    if (
      issue !== undefined &&
      !issue.labels.some((label) => isStopLabel(label.name))
    ) {
      const ready = READY_STATE.safeParse(readState(cfg, number).state);
      if (ready.success && READY_STAGES.has(ready.data.stage)) {
        return { number, pr: ready.data.pr };
      }
    }
  }
  return null;
}

// Why issue #number's merge waits for another issue, or undefined when it
// need not wait.
function queued(cfg: Config, req: OrderRequest): Queued | undefined {
  if (req.mergeOrder !== true) {
    return undefined;
  }
  let ahead: Ahead | null;
  if (req.mergeQueue === undefined || req.mergeQueue === null) {
    ahead = olderReadyIssue(cfg, req.number, req.state.pr);
  } else {
    ahead = aheadInQueue(cfg, req.number, req.mergeQueue);
  }
  if (ahead === null) {
    return undefined;
  }
  return {
    merged: false,
    reason: "queued",
    waitingFor: ahead.number,
    waitingForPr: ahead.pr,
  };
}

export type { Queued };
export { queued, READY_STAGES };
