// Where an implementor run starts, and what it carries (`every-role-resumes`
// in the wiki's Pipeline-Roles-Shared page; Pipeline-Roles-Implementor,
// "Locate"). STUB (#414): the types are the spec's, the body is not built.

import type { State } from "../../state.ts";
import type { Budgets } from "../../workflow/budget.ts";
import type { Flows } from "../../workflow/flows.ts";
import type { Signature } from "../../workflow/signing.ts";
import type { ModelRole, SweepConfig } from "../../workflow/stages/types.ts";
import type { ItemPaths } from "../../workflow/types.ts";
import type { MachineState } from "../machine.ts";
import type { RoleContext } from "../walk.ts";
import type { ImplReading } from "./reply.ts";

// The machine's states: the shared start, the `implement` entry's states
// (the wiki's Lifecycle table), then its ends.
type ImplState =
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
  | "out-of-room";

// The entries a run can take; later parts add `fix` and `checks`.
type ImplEntry = "implement";

// What the session's task is built from.
interface ImplSettings {
  cfg: SweepConfig;
  budgets: Budgets;
  models: Readonly<Record<ModelRole, string>>;
  paths: ItemPaths;
}

interface ImplData {
  issue: number;
  entry: ImplEntry;
  // Who signs the run's comments.
  by: Signature;
  settings: ImplSettings;
  // What the spec writer handed over.
  spec: string | undefined;
  specFile: string | null | undefined;
  plan: string | undefined;
  specTestsSha: string | undefined;
  wikiOnly: boolean | undefined;
  noTestsReason: string | null | undefined;
  pr: number | null | undefined;
  // What the run hands to the reviewer.
  headSha: string | null | undefined;
  flows: Flows | undefined;
  implemented: boolean | undefined;
  // The counts the entries bound their loops with, and the config's limit
  // on continuations.
  continuations: number;
  maxContinuations: number;
  fixRounds: number;
  conflictFixes: number;
  ciFixRounds: number;
  // The last session's reading, or null before one.
  reply: ImplReading | null;
  findings: unknown[];
  verifiedSha: string | null;
}

function locate(
  _saved: State,
  _context: RoleContext,
): MachineState<ImplState, ImplData> {
  throw new Error("implementor locate: not implemented (#414)");
}

export type { ImplData, ImplEntry, ImplSettings, ImplState };
export { locate };
