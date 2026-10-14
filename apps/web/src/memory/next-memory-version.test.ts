// @vitest-environment node
import { getTableColumns } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { projectIdFixture, userIdFixture } from "@/id-fixtures.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  type NextMemoryVersion,
  selectNextMemoryVersion,
} from "@/memory/next-memory-version.ts";

const WRITE: Omit<NextMemoryVersion, "text"> = {
  owner: userIdFixture(),
  projectId: projectIdFixture(),
  basedOn: MEMORY_VERSION_NUMBER.parse(2),
  author: "user",
};

describe("selectNextMemoryVersion", () => {
  test.each([
    ["new text", { ...WRITE, text: { kind: "new", text: "Mine" } }],
    [
      "a copy",
      {
        ...WRITE,
        text: { kind: "copy", version: MEMORY_VERSION_NUMBER.parse(1) },
      },
    ],
  ] satisfies [string, NextMemoryVersion][])(
    "selects %s as the table's columns, in the table's order",
    (_kind, next) => {
      const select = selectNextMemoryVersion(next);

      expect(Object.keys(select._.selectedFields)).toEqual(
        Object.keys(getTableColumns(memoryVersions)),
      );
    },
  );
});
