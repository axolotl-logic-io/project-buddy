// The reviewer's script checks (#421; the wiki's Pipeline-Roles-Reviewer,
// "Entry `review`"): claim and checkout, `prepare` (the prepare-review op and
// the bundle it wrote), `post-lenses` (one signed, keyed comment per lens)
// and `store-findings` (numbering with addFinding). The registry passes them
// to machineRole for every stage in REVIEWER_STAGES.
// Stub (#421): the implementer writes the checks.

import type { Config } from "../../config.ts";
import type { Entry } from "../../job/runner.ts";
import type { Checks, JobEffects } from "../registry.ts";

function reviewerChecks(
  _entry: Entry,
  _effects: JobEffects,
  _cfg: Config,
): Checks {
  throw new Error("reviewer checks: not implemented (#421)");
}

export { reviewerChecks };
