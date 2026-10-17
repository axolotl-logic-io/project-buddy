// Which session failures are a model provider's rate limit or overload: an
// HTTP 429 or 529 reply, a `rate_limit_error` or `overloaded_error`, or
// credentials "cooling down". Such a failure is transient, like a network
// error (network.ts): the stage defers instead of stopping, and the next
// sweep, or the orchestrator's next job after its backoff, runs it again.

import { noteEvent } from "../event-log.ts";
import type { IssueState } from "../types.ts";
import { copyState, stopStep } from "./step.ts";
import type { LaunchResult, StageState, Step } from "./types.ts";

// The status at the start of the error, as pi gives a provider's reply
// ("429 {…}"), or after HTTP or status; a 429 elsewhere, such as in a test
// count, isn't one.
const RATE_LIMIT: RegExp =
  /^(?:HTTP )?[45]29\b|\b(?:HTTP|status)[ :]+[45]29\b|rate_limit_error|overloaded_error|cooling down/iu;

// Whether a session's error text, if any, reports a rate limit or overload.
function isRateLimitError(text: string | null): boolean {
  if (text === null) {
    return false;
  }
  return RATE_LIMIT.test(text);
}

// Whether a session among `results` failed on a rate limit.
function rateLimitedIn(results: readonly LaunchResult[]): boolean {
  return results.some(
    (result) =>
      result.kind === "child" && !result.ok && isRateLimitError(result.error),
  );
}

// The stage is finished for this sweep because a session failed with
// `reason` on a rate limit: the issue stays at its stage and begins no stage
// again this sweep, and the sweep puts back the attempt counts it had when
// the stage began (sweep-stages.ts), so the deferral counts no round or
// attempt.
function rateLimitStep(state: StageState, reason: string, now: Date): Step {
  const st = copyState(state.st);
  noteEvent(
    st,
    `deferred: ${reason} on a rate limit; will retry next sweep`,
    now,
  );
  return {
    done: true,
    again: false,
    rateLimited: true,
    state: { ...state, st, held: true },
    comments: [],
    stop: null,
  };
}

// The step for a session that failed with `error`: a deferral when the error
// is a rate limit, otherwise a stop with `reason` and the error as the detail.
function sessionFailedStep(
  state: StageState,
  reason: string,
  error: string | null,
  now: Date,
): Step {
  if (isRateLimitError(error)) {
    return rateLimitStep(state, reason, now);
  }
  return stopStep(state, reason, error);
}

// `st` with the attempt counts of `begun`, the state its stage began from:
// the counts a stage adds to before it launches a session, which bound its
// loops (maxTriages, maxFixRounds, maxCiFixes, maxConflictFixes and
// maxContinuations).
function withAttemptCounts(st: IssueState, begun: IssueState): IssueState {
  return {
    ...st,
    triages: begun.triages ?? 0,
    round: begun.round ?? 0,
    ciFixes: begun.ciFixes ?? 0,
    conflictFixes: begun.conflictFixes ?? 0,
    continuations: begun.continuations ?? {},
  };
}

export {
  isRateLimitError,
  rateLimitedIn,
  rateLimitStep,
  sessionFailedStep,
  withAttemptCounts,
};
