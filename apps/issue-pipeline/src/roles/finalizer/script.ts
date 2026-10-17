// The finalizer role on the runner's linear mode: today's `merge` stage
// (src/workflow/stages/merge.ts) as steps. The open-findings gate, the
// wiki's rebase and check with the conflict resolver on a conflict, then the
// merge op at the verified head in merge order (or finish-wiki for a change
// that lives only in the wiki), and an end read from the merge's reply.
//
// Stub for #416: it has no steps yet, and it is not registered for `merge`
// in src/roles/registry.ts until it is built.

import type { End } from "../machine.ts";
import type { LinearScript } from "../walk.ts";
import type { FinalizerData } from "./locate.ts";
import { locate } from "./locate.ts";

function endOf(_data: FinalizerData): End {
  throw new Error("finalizer: the end is not implemented (#416)");
}

const finalizerScript: LinearScript<FinalizerData> = {
  locate,
  steps: [],
  end: endOf,
  handoff: [],
  checkpoints: [],
};

export { finalizerScript };
