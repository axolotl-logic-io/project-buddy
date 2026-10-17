// Model sessions that run together, as one effect of a role machine (#421;
// the wiki's Pipeline-Roles-Shared page, "Role machines", and
// Pipeline-Roles-Reviewer, "Sessions"). Of the sessions on one model, the
// first starts at once and each later one once the first has printed its
// first `message_end` event, or has ended without one, so it reads their
// shared prefix from the prompt cache; sessions on different models start
// together. The runner (src/job/runner.ts) carries the effect out.
// Stub types (#421): the implementer adds `SessionsEffect` to `Effect` in
// machine.ts, and runs it.

import type { SessionEffect } from "./machine.ts";

interface SessionsEffect {
  kind: "sessions";
  sessions: readonly SessionEffect[];
}

// What a sessions effect replies, as its `replied` result: each session's
// outcome, in the effect's order. A failed session drops no other's reply.
type SessionsReply = readonly {
  name: string;
  outcome: { ok: true; reply: unknown } | { ok: false; error: string };
}[];

export type { SessionsEffect, SessionsReply };
