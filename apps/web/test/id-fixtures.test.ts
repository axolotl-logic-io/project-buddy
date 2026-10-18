import { describe, expect, test } from "vitest";
import { parseChatId, parseProjectId } from "@/ids.ts";
import { chatIdFixture, projectIdFixture } from "./id-fixtures.ts";

const PROJECT_UUID = "0B6A1F7E-5D2C-4E8B-9F3A-7C1D2E3F4A5B";
const CHAT_UUID = "6f1c0b52-1c6e-4f3a-9a52-0d3c2b7e8a10";

describe.each([
  ["projectIdFixture", projectIdFixture, parseProjectId, PROJECT_UUID],
  ["chatIdFixture", chatIdFixture, parseChatId, CHAT_UUID],
])("%s", (name, fixture, parse, uuid) => {
  test("makes a new random id each call", () => {
    const first = fixture();

    expect(parse(first)).toBe(first);
    expect(fixture()).not.toBe(first);
  });

  test("makes the id that a UUID names, as the parser would", () => {
    expect(fixture(uuid)).toBe(parse(uuid));
  });

  test("throws, naming the fixture and the value, unless it is a UUID", () => {
    expect(() => fixture("fox")).toThrow(`${name}: "fox" is not a valid id`);
  });
});
