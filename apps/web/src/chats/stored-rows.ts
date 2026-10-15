// For the chat store tests: the database, through Neon's HTTP driver, as a
// fake that answers every query with the same rows.
import { vi } from "vitest";
import {
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";

// The columns of `select * from chats`, in order. "persona_*" are the SQL
// names from before the buddy rename (#116); renaming them would need a
// migration.
export const CHAT_COLUMNS: readonly string[] = [
  "id",
  "project_id",
  "persona_id",
  "persona_name",
  "persona_parts",
  "name",
  "renamed_by_hand",
  "created_at",
];

// The database answers every query with these rows, each value as the text
// Postgres sends.
export function storedRows(
  columns: readonly string[],
  rows: readonly (readonly (string | null)[])[],
): FakeNeonHttp {
  const answer: NeonHttpAnswer = {
    kind: "rows",
    columns: columns.map((name) => {
      if (name === "created_at") {
        return { name, type: "timestamptz" };
      }
      if (name === "renamed_by_hand") {
        return { name, type: "bool" };
      }
      return { name, type: "text" };
    }),
    rows,
  };
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}
