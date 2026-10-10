import { describe, expect, test } from "vitest";
import { manualSections } from "@/db/tables/manual-sections.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import {
  type ManualSectionInsert,
  type ManualSectionStore,
  type ManualSectionTransaction,
  replaceManualSections,
} from "@/manual/reindex-manual.ts";

const SECTION_COUNT = 2500;

function section(title: string): ManualSection {
  return {
    title,
    text: "",
    filePath: "manual/index.rst",
    url: "",
    anchor: "",
  };
}

function tableName(table: unknown): string {
  if (table === manualSections) {
    return "manual_sections";
  }
  return "another table";
}

// A store that records each statement it is given, in order.
function recordingStore(calls: string[]): ManualSectionStore {
  const transaction: ManualSectionTransaction = {
    delete(table): PromiseLike<unknown> {
      calls.push(`delete ${tableName(table)}`);
      return Promise.resolve();
    },
    insert(table): ManualSectionInsert {
      return {
        values(rows): PromiseLike<unknown> {
          calls.push(`insert ${rows.length} into ${tableName(table)}`);
          return Promise.resolve();
        },
      };
    },
  };
  return {
    async transaction(run): Promise<void> {
      calls.push("begin");
      await run(transaction);
      calls.push("commit");
    },
  };
}

describe("replaceManualSections", () => {
  test("deletes every row, then inserts the sections in batches, in one transaction", async () => {
    const calls: string[] = [];
    const sections = Array.from({ length: SECTION_COUNT }, (_, index) =>
      section(`Section ${index}`),
    );

    await replaceManualSections(recordingStore(calls), sections);

    expect(calls).toEqual([
      "begin",
      "delete manual_sections",
      "insert 1000 into manual_sections",
      "insert 1000 into manual_sections",
      "insert 500 into manual_sections",
      "commit",
    ]);
  });
});
