// The first reviewers' tasks over a review bundle (#415): every lens's task
// starts with the same prefix (the reviewer rules, the issue, the spec, the
// practices note and the bundle prepare-review wrote), so the lenses can share
// one read of the diff and the changed files. The lens's own part comes after
// it. A review with no bundle gets the diff-path task of review-text.ts.

import type { ReviewLens } from "../lenses.ts";
import type { ReviewDiff } from "./review-text.ts";
import type { StageContext, StageState } from "./types.ts";

// The review bundle prepare-review wrote beside the diff: its path and length
// in lines, as the op replied them, and its text.
interface ReviewBundle {
  bundlePath: string;
  bundleLines: number;
  bundleText: string;
}

// The first reviewer's task for `lens`: the shared prefix, then the lens's
// part, when `review` is a bundle; today's diff-path task when it is a diff.
function lensTaskShared(
  _ctx: StageContext,
  _state: StageState,
  _lens: ReviewLens,
  _review: ReviewDiff | ReviewBundle,
): string {
  throw new Error("lensTaskShared is not implemented yet (#415)");
}

export type { ReviewBundle };
export { lensTaskShared };
