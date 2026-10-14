// For the buddy store tests: the database, through Neon's HTTP driver, as
// a fake that answers every query with the same buddies rows.
import { vi } from "vitest";
import type { BuddySnapshot } from "@/buddies/index.ts";
import { type FakeNeonHttp, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import type { UserId } from "@/ids.ts";

// One stored buddy, as the test gives it.
export interface StoredBuddy {
  readonly id: string;
  readonly userId: UserId;
  readonly buddy: BuddySnapshot;
  // The stored parts, when they are not the buddy's.
  readonly storedParts?: unknown;
  readonly clonedFrom?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// The database answers every query with these buddies, as `select * from
// buddies` returns them.
export function storedBuddies(rows: readonly StoredBuddy[]): FakeNeonHttp {
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
      row.buddy.name,
      JSON.stringify(row.storedParts ?? row.buddy.parts),
      row.clonedFrom ?? null,
      row.createdAt,
      row.updatedAt,
    ]),
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}
