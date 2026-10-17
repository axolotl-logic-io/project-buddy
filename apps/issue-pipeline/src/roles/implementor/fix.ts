// The implementor's `fix` entry (#418; the wiki's Pipeline-Roles-Implementor,
// "Entry `fix`", and Pipeline-Roles-Reviewer, "Re-review"): the fixer with
// its continuations, the push and its flows, the re-review diff, one
// re-reviewer per lens with open findings, and the findings' update, bounded
// by fixRounds. Pure.
//
// Stub (#418's spec): every state is declared so TABLE type-checks, and
// each one's effect throws until the entry is built.

import type { ImplState } from "./locate.ts";
import type { ImplSpec, ImplStates } from "./states.ts";

// The `fix` entry's states and its ends.
type FixState = Exclude<
  ImplState,
  | "start"
  | "implement-work?"
  | "setup"
  | "implementer"
  | "implementer-reply"
  | "flows"
  | "implemented"
  | "wiki-only"
  | "blocked"
  | "changed-nothing"
  | "bad-reply"
  | "out-of-room"
>;

function notBuilt(name: FixState): ImplSpec {
  return {
    kind: "script",
    effect: (): never => {
      throw new Error(`implementor: the fix entry's ${name} is not built`);
    },
    on: {},
  };
}

const FIX_STATES: ImplStates<FixState> = {
  "fix-work?": notBuilt("fix-work?"),
  fixer: notBuilt("fixer"),
  "fixer-reply": notBuilt("fixer-reply"),
  "fix-flows": notBuilt("fix-flows"),
  "prepare-rereview": notBuilt("prepare-rereview"),
  "rereview-correctness?": notBuilt("rereview-correctness?"),
  "rereview-correctness": notBuilt("rereview-correctness"),
  "rereview-tests?": notBuilt("rereview-tests?"),
  "rereview-tests": notBuilt("rereview-tests"),
  "rereview-scope?": notBuilt("rereview-scope?"),
  "rereview-scope": notBuilt("rereview-scope"),
  "rereview-security?": notBuilt("rereview-security?"),
  "rereview-security": notBuilt("rereview-security"),
  "rereview-acceptance?": notBuilt("rereview-acceptance?"),
  "rereview-acceptance": notBuilt("rereview-acceptance"),
  "update-findings": notBuilt("update-findings"),
  fixed: notBuilt("fixed"),
  "fix-reopen": notBuilt("fix-reopen"),
  "fix-no-code": notBuilt("fix-no-code"),
  "findings-open": notBuilt("findings-open"),
  "acceptance-disputed": notBuilt("acceptance-disputed"),
  reintroduced: notBuilt("reintroduced"),
  "rereview-bad": notBuilt("rereview-bad"),
  "fixer-bad-reply": notBuilt("fixer-bad-reply"),
  "fixer-out-of-room": notBuilt("fixer-out-of-room"),
};

export type { FixState };
export { FIX_STATES };
