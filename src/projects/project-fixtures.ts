// Project ids for tests, which cannot write a ProjectId as a literal.
import { type ProjectId, parseProjectId } from "@/ids.ts";

// A new random project id.
export function projectIdFixture(): ProjectId {
  const id = parseProjectId(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("crypto.randomUUID returned a malformed UUID");
  }
  return id;
}
