import { describe, expect, expectTypeOf, test } from "vitest";
import type { ChatId, ProjectId } from "@/ids.ts";
import { parseChatId, parseProjectId } from "@/ids.ts";

const CANONICAL_UUID = "3f2b8c1e-9d4a-4e7b-8a6c-1b2d3e4f5a6b";

describe.each([
  ["parseProjectId", parseProjectId],
  ["parseChatId", parseChatId],
])("%s", (_name, parse) => {
  test("returns a canonical lowercase UUID unchanged", () => {
    expect(parse(CANONICAL_UUID)).toBe(CANONICAL_UUID);
  });

  test("accepts uppercase and mixed case, returning the id in lowercase", () => {
    expect(parse(CANONICAL_UUID.toUpperCase())).toBe(CANONICAL_UUID);
    expect(parse("3F2b8C1e-9D4a-4E7b-8A6c-1B2d3E4f5A6b")).toBe(CANONICAL_UUID);
  });

  test("accepts any version and variant, as Postgres does", () => {
    expect(parse("00000000-0000-0000-0000-000000000000")).toBe(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(parse("ffffffff-ffff-ffff-ffff-ffffffffffff")).toBe(
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    );
  });

  test.each([
    ["an empty string", ""],
    ["a word", "not-a-uuid"],
    ["a UUID without hyphens", CANONICAL_UUID.replaceAll("-", "")],
    ["a UUID in braces", `{${CANONICAL_UUID}}`],
    ["a UUID with surrounding whitespace", ` ${CANONICAL_UUID} `],
    ["a UUID with a trailing newline", `${CANONICAL_UUID}\n`],
    ["a UUID with a non-hex digit", "3f2b8c1e-9d4a-4e7b-8a6c-1b2d3e4f5a6g"],
    ["a UUID one digit short", "3f2b8c1e-9d4a-4e7b-8a6c-1b2d3e4f5a6"],
    ["a UUID one digit long", `${CANONICAL_UUID}0`],
    ["a UUID with misplaced hyphens", "3f2b8c1e9-d4a-4e7b-8a6c-1b2d3e4f5a6b"],
    ["a URN", `urn:uuid:${CANONICAL_UUID}`],
    ["full-width digits", "３f2b8c1e-9d4a-4e7b-8a6c-1b2d3e4f5a6b"],
  ])("returns undefined for %s", (_description, value) => {
    expect(parse(value)).toBeUndefined();
  });
});

test("a ProjectId and a ChatId are strings that cannot stand in for each other", () => {
  expectTypeOf<ProjectId>().toExtend<string>();
  expectTypeOf<ChatId>().toExtend<string>();
  expectTypeOf<string>().not.toExtend<ProjectId>();
  expectTypeOf<string>().not.toExtend<ChatId>();
  expectTypeOf<ChatId>().not.toExtend<ProjectId>();
  expectTypeOf<ProjectId>().not.toExtend<ChatId>();
});
