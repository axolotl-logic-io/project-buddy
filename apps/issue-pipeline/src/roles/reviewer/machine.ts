// The reviewer role as a state machine (`role-state-machines`; the wiki's
// Pipeline-Roles-Reviewer, "Lifecycle"): its table, its limits and its pure
// transition, with the `review` entry's states from entries/review.ts. The
// stages it takes over are REVIEWER_STAGES, which the registry runs it for
// (src/roles/registry.ts).
// Stub (#421): the implementer builds the table.

import type {
  Limits,
  MachineState,
  Result,
  StateSpec,
  Step,
  Table,
} from "../machine.ts";
import { transitionOf } from "../machine.ts";
import type { Machine } from "../walk.ts";
import type { ReviewerData, ReviewerState } from "./locate.ts";
import { locate } from "./locate.ts";

// The results the states answer with: a check's `ok`, the claim's
// `not-ours`, the prep's `empty`, a session's `replied` or `failed`, and
// what the posted lens comments found.
type ReviewerResult =
  | "ok"
  | "not-ours"
  | "empty"
  | "replied"
  | "failed"
  | "clean"
  | "blocking"
  | "lens-failed";

type Spec = StateSpec<ReviewerState, ReviewerResult, ReviewerData>;

// The stages the reviewer machine runs: one list, so #423 adds `accept` here.
const REVIEWER_STAGES: readonly string[] = ["review"];

const LIMITS: Limits = {};

function unbuilt(): Spec {
  return {
    kind: "end",
    effect: (): never => {
      throw new Error("reviewer machine: not implemented (#421)");
    },
    on: {},
  };
}

const TABLE: Table<ReviewerState, ReviewerResult, ReviewerData> = {
  entries: [],
  states: {
    claim: unbuilt(),
    checkout: unbuilt(),
    prepare: unbuilt(),
    lenses: unbuilt(),
    "post-lenses": unbuilt(),
    aggregate: unbuilt(),
    "store-findings": unbuilt(),
    released: unbuilt(),
    "prep-failed": unbuilt(),
    "nothing-to-review": unbuilt(),
    "lens-failed": unbuilt(),
    clean: unbuilt(),
    "findings-stored": unbuilt(),
  },
};

const transition: (
  state: MachineState<ReviewerState, ReviewerData>,
  result: Result<ReviewerResult>,
) => Step<ReviewerState, ReviewerData> = transitionOf(TABLE, LIMITS);

const reviewerMachine: Machine<ReviewerState, ReviewerResult, ReviewerData> = {
  table: TABLE,
  limits: LIMITS,
  locate,
  handoff: [],
  checkpoints: [],
};

export type { ReviewerResult };
export { LIMITS, REVIEWER_STAGES, reviewerMachine, TABLE, transition };
