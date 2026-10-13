// For the persona store tests: the database, through Neon's HTTP driver, as
// a fake that answers every query with the same personas rows.
import { vi } from "vitest";
import { type FakeNeonHttp, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import type { UserId } from "@/ids.ts";
import type { PersonaSnapshot } from "@/personas/index.ts";

// One stored persona, as the test gives it.
export interface StoredPersona {
  readonly id: string;
  readonly userId: UserId;
  readonly persona: PersonaSnapshot;
  // The stored parts, when they are not the persona's.
  readonly storedParts?: unknown;
  readonly clonedFrom?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// The database answers every query with these personas, as `select * from
// personas` returns them.
export function storedPersonas(rows: readonly StoredPersona[]): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [
      { name: "id", type: "text" },
      { name: "user_id", type: "text" },
      { name: "name", type: "text" },
      { name: "parts", type: "text" },
      { name: "cloned_from", type: "text" },
      { name: "created_at", type: "timestamptz" },
      { name: "updated_at", type: "timestamptz" },
    ],
    rows: rows.map((row) => [
      row.id,
      row.userId,
      row.persona.name,
      JSON.stringify(row.storedParts ?? row.persona.parts),
      row.clonedFrom ?? null,
      row.createdAt,
      row.updatedAt,
    ]),
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}
