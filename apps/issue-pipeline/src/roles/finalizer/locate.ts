// Where a finalizer run starts, and what it carries: the issue's hand-off
// fields and event log read from its saved state. Every start, an old
// `merge` state saved by the sweep's stage code included, begins at the
// gate, since every step is safe to run again (`every-role-resumes`). Pure.
//
// Stub for #416: the implementer fills in the data and locate.

import type { State } from "../../state.ts";
import type { MachineState } from "../machine.ts";
import type { RoleContext } from "../walk.ts";

// What the finalizer's steps read and write.
interface FinalizerData {
  issue: number;
}

// Where a run starts, from the issue's saved state and the job's context.
function locate(
  _saved: State,
  _context: RoleContext,
): MachineState<string, FinalizerData> {
  throw new Error("finalizer: locate is not implemented (#416)");
}

export type { FinalizerData };
export { locate };
