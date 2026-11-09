import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { expect, test } from "vitest";
import { validateTrace } from "../../../../scripts/performance/artifacts.ts";

const ARCHIVE = new URL(
  "../../../../../../docs/performance/773/",
  import.meta.url,
);
const TRACE_NAMES = [
  "home",
  "stream",
  "quests",
  "quest",
  "adventures",
  "long-adventure",
  "activities",
  "workshop",
  "editor",
];

test("validates committed compressed traces and the exact screenshot allowlist", async () => {
  const entries = await Promise.all(
    TRACE_NAMES.map(async (name): Promise<[string, number]> => {
      const filename = `${name}.trace.json.gz`;
      const bytes = await readFile(new URL(filename, ARCHIVE));
      const input: unknown = JSON.parse(gunzipSync(bytes).toString("utf8"));
      const events = validateTrace(input, filename);
      return [
        name,
        events.filter((event) => event.name === "Screenshot").length,
      ];
    }),
  );
  const counts = Object.fromEntries(entries);
  expect(counts).toEqual({
    home: 7,
    stream: 49,
    quests: 0,
    quest: 0,
    adventures: 0,
    "long-adventure": 0,
    activities: 0,
    workshop: 0,
    editor: 0,
  });
});

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/u;
const FORBIDDEN_PAYLOAD =
  /SESSION_SECRET|Authorization|Cookie|Synthetic answer|definition\.prompt|"snapshot"/u;

test("checks the retained compressed numeric cohorts rather than local raw files", async () => {
  const cohorts = [
    { filename: "baseline.json.gz", count: 78 },
    { filename: "current/readiness.json.gz", count: 186 },
    { filename: "current/observer-checkpoint.json.gz", count: 36 },
  ];
  await Promise.all(
    cohorts.map(async ({ filename, count }): Promise<void> => {
      const bytes = await readFile(new URL(filename, ARCHIVE));
      const text = gunzipSync(bytes).toString("utf8");
      expect(text).not.toMatch(UUID);
      expect(text).not.toMatch(FORBIDDEN_PAYLOAD);
      const input: unknown = JSON.parse(text);
      expect(Array.isArray(input)).toBe(true);
      expect(input).toHaveLength(count);
    }),
  );
});
