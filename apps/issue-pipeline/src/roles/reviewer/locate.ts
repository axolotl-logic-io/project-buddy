// Where a reviewer run starts, and what it carries (`every-role-resumes` in
// the wiki's Pipeline-Roles-Shared page; Pipeline-Roles-Reviewer, "Locate").
// Every start at `review`, a state saved by the old `review` stage included,
// claims the issue and runs the entry again: the lenses are read-only, their
// comments are keyed, and the findings are numbered on from the saved
// `nextFindingId`. It reads back the hand-off fields the role writes, so a
// save keeps what the run didn't change, such as `reviewedSha` and
// `reviewedPatchId` (`review-keeps-on-clean-rebase`). Pure.
// Stub (#421): the implementer builds it.

import type { State } from "../../state.ts";
import type { Signature } from "../../workflow/signing.ts";
import type { ReviewBundle } from "../../workflow/stages/review-prefix.ts";
import type { RawFinding } from "../../workflow/stages/review-replies.ts";
import type { ReviewDiff } from "../../workflow/stages/review-text.ts";
import type { Finding } from "../../workflow/types.ts";
import type { MachineState } from "../machine.ts";
import type { SessionsReply } from "../sessions.ts";
import type { RoleContext } from "../walk.ts";

// The machine's states: the prelude, the `review` entry's states (the wiki's
// "Entry `review`" table), then its ends.
type ReviewerState =
  | "claim"
  | "checkout"
  | "prepare"
  | "lenses"
  | "post-lenses"
  | "aggregate"
  | "store-findings"
  | "released"
  | "prep-failed"
  | "nothing-to-review"
  | "lens-failed"
  | "clean"
  | "findings-stored";

// What the run hands to the next role, as the old `review` stage saved it:
// the head reviewed, the numbered findings and the next number, the fix
// rounds run, the head the review saw and, for a clean review, its changes'
// patch id, whether only the tests run again, and the event log.
interface ReviewerHandoff {
  headSha: string | null | undefined;
  findings: Finding[];
  nextFindingId: number | undefined;
  round: number | undefined;
  reviewedSha: string | null | undefined;
  reviewedPatchId: string | null | undefined;
  testsOnly: boolean | undefined;
  log: string[] | undefined;
}

interface ReviewerData extends ReviewerHandoff {
  issue: number;
  // The PR the lens and findings comments go on, or null for none.
  pr: number | null;
  // Who signs the run's comments: the job's id as the run.
  by: Signature;
  // What the sessions' tasks are built from.
  context: RoleContext;
  // What the issue's saved state gives the tasks (its spec, its stack).
  saved: State;
  // The prepared head's patch id, from prepare-review's reply.
  patchId: string | null;
  // What the lenses read: the bundle, or the diff an op before #415 wrote.
  review: ReviewBundle | ReviewDiff | null;
  // Each lens session's outcome, once the lenses replied.
  lensReplies: SessionsReply | null;
  // The lenses' blocking findings, with their lens, for the aggregator.
  raw: RawFinding[];
  // The aggregator's reply, or null when it failed or hasn't run.
  merged: unknown;
  // The stop's detail: the first failed lens, or the failed prep.
  failure: string | null;
}

function locate(
  _saved: State,
  _context: RoleContext,
): MachineState<ReviewerState, ReviewerData> {
  throw new Error("reviewer locate: not implemented (#421)");
}

export type { ReviewerData, ReviewerHandoff, ReviewerState };
export { locate };
