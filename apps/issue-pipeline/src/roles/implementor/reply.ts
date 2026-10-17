// The implementor's implementer reply: its schema (the wiki's
// Pipeline-Roles-Implementor, "Session reply schemas": `status` and
// `summary` only, `tests-added-derived` and `spec-writer-opens-pr`) and what
// the role reads from a reply. STUB (#414): not built.

import type { JsonSchema } from "../../workflow/schemas.ts";

type ImplStatus = "done" | "handoff" | "blocked";

// What the role reads from an implementer's reply.
interface ImplReading {
  status: ImplStatus;
  summary: string;
}

const IMPL_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
  required: [],
};

// The reading of `output`, or null when it isn't an implementer's reply.
function implReadingOf(_output: unknown): ImplReading | null {
  throw new Error("implementor implReadingOf: not implemented (#414)");
}

export type { ImplReading, ImplStatus };
export { IMPL_SCHEMA, implReadingOf };
