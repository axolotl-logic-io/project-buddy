// The implementor role as a state machine (`role-state-machines`; the wiki's
// Pipeline-Roles-Implementor, "Lifecycle"): its table, its limits and its
// pure transition. TABLE spreads in each entry's module's states.
// STUB (#414): no state is built; each one's effect throws.

import type { Limits, StateSpec, Step, Table } from "../machine.ts";
import { transitionOf } from "../machine.ts";
import type { ImplData, ImplState } from "./locate.ts";

// The results the states answer with.
type ImplResult =
  | "ok"
  | "replied"
  | "implement"
  | "work"
  | "built"
  | "none"
  | "done"
  | "handoff"
  | "blocked"
  | "bad"
  | "code";

type ImplSpec = StateSpec<ImplState, ImplResult, ImplData>;

// A continuation after each handoff, up to the config's maxContinuations
// (limitsOf), 1 by default.
const LIMITS: Limits = { maxContinuations: 1 };

const PENDING: ImplSpec = {
  kind: "end",
  effect: () => {
    throw new Error("implementor machine: not implemented (#414)");
  },
  on: {},
};

const TABLE: Table<ImplState, ImplResult, ImplData> = {
  entries: [],
  states: {
    start: PENDING,
    "implement-work?": PENDING,
    setup: PENDING,
    implementer: PENDING,
    "implementer-reply": PENDING,
    flows: PENDING,
    implemented: PENDING,
    "wiki-only": PENDING,
    blocked: PENDING,
    "changed-nothing": PENDING,
    "bad-reply": PENDING,
    "out-of-room": PENDING,
  },
};

const transition: (
  state: { at: ImplState; data: ImplData },
  result: { name: ImplResult; reply: unknown },
) => Step<ImplState, ImplData> = transitionOf(TABLE, LIMITS);

export type { ImplResult };
export { LIMITS, TABLE, transition };
