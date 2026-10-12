// Temporary: proves that splitting src/ui/copy.ts into area modules kept every
// string. The fixture is the aggregate's content before the split, with each
// function called on fixed sample arguments.
import { expect, test } from "vitest";
import { COPY } from "@/ui/copy.ts";
import BEFORE_SPLIT from "./copy-split.fixture.json" with { type: "json" };

// Every copy function takes at most two arguments; strings stand in for the
// names, numbers and links they are given.
const SAMPLE_ARGUMENTS = ["‹first›", "‹second›"] as const;

function serialize(value: unknown): unknown {
  if (typeof value === "function") {
    return {
      called: serialize(Reflect.apply(value, undefined, SAMPLE_ARGUMENTS)),
    };
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serialize(entry)]),
    );
  }
  return value;
}

test("the copy keeps every string", () => {
  expect(serialize(COPY)).toStrictEqual(BEFORE_SPLIT);
});
