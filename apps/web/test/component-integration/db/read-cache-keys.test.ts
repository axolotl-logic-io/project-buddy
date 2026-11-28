/// <reference types="vite/client" />
// Next keys a "use cache" function's result by its arguments
// (src/db/read-cache.ts), so a cached store read that took no reader could
// serve one user another's rows. Every one takes the acting user first;
// the session check, kept per browser ("use cache: private"), takes none.
import { expect, test } from "vitest";

// Every source file in src/, by path relative to src/db/.
const SOURCES: Readonly<Record<string, string>> = import.meta.glob<string>(
  "../**/*.{ts,tsx}",
  { base: "/src/db", query: "?raw", import: "default", eager: true },
);

// A function whose body opens with "use cache": its name, its parameters,
// and the directive's kind, such as ": private".
const CACHED_FUNCTION =
  /function (?<name>\w+)\((?<parameters>[^)]*)\)[^{]*\{\s*"use cache(?<kind>[^"]*)";/gu;
// A first parameter naming the acting user.
const READER_FIRST = /^\s*(?:user|owner): UserId\b/u;

// Each cached function shared between users, with its parameters.
function sharedCachedFunctions(): { name: string; parameters: string }[] {
  return Object.values(SOURCES).flatMap((source) =>
    [...source.matchAll(CACHED_FUNCTION)].flatMap((match) => {
      const { name = "", parameters = "", kind = "" } = match.groups ?? {};
      if (kind !== "") {
        return [];
      }
      return [{ name, parameters }];
    }),
  );
}

test("every cached store read takes its reader first", () => {
  const cached = sharedCachedFunctions();
  expect(cached.map(({ name }) => name)).toContain("readQuestEntries");
  expect(
    cached.filter(({ parameters }) => !READER_FIRST.test(parameters)),
  ).toEqual([]);
});
