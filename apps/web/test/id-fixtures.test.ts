import { describe, expect, test } from "vitest";
import { parseChatId, parseProjectId } from "@/ids.ts";
import { chatIdFixture, projectIdFixture } from "./id-fixtures.ts";

describe.each([
  ["projectIdFixture", projectIdFixture, parseProjectId],
  ["chatIdFixture", chatIdFixture, parseChatId],
])("%s", (name, fixture, parse) => {
  test("makes a new random id each call", () => {
    const first = fixture();

    expect(parse(first)).toBe(first);
    expect(fixture()).not.toBe(first);
  });

  test("throws, naming the fixture and the value, unless it is a UUID", () => {
    expect(() => fixture("fox")).toThrow(`${name}: "fox" is not a valid id`);
  });
});
