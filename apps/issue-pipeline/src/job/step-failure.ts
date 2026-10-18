// Who owns a role's failed step, and how the role runner (runner.ts) ends one
// it owns (`role-state-machines`, "Failures the runner owns", in the wiki's
// Pipeline-Roles-Shared page). A session's transient provider error is
// always the runner's, even where the role lists `failed` or has `recover`
// (#446, `rate-limit-defers`): it holds the run as rate-limited, so the role
// never spends a retry on it.

import type { End } from "../roles/machine.ts";
import type { Position, Walk } from "../roles/walk.ts";
import { isNetworkError } from "../workflow/stages/network.ts";
import { isTransientSessionError } from "../workflow/stages/rate-limit.ts";

// The end of a failed step, with the step-failure stop code (src/stops.ts).
const STEP_FAILED: End = { kind: "stopped", code: "error" };

// How the runner ends a step that failed with `error`: held as rate-limited
// on a rate limit, an overload or a transport error, held on another network
// error, and stopped with the step-failure code otherwise.
function failedEnd(error: string): End {
  if (isTransientSessionError(error)) {
    return { kind: "held", rateLimited: true };
  }
  if (isNetworkError(error)) {
    return { kind: "held" };
  }
  return STEP_FAILED;
}

// Whether the role takes `position`'s failure with `error` itself, rather
// than the runner ending the run with `failedEnd`.
function roleTakesFailure<S extends string, D>(
  walk: Walk<S, D>,
  position: Position<S, D>,
  error: string,
): boolean {
  if (position.kind === "session" && isTransientSessionError(error)) {
    return false;
  }
  return walk.takesFailure(position);
}

export { failedEnd, roleTakesFailure, STEP_FAILED };
