import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { expect, test } from "vitest";
import {
  validateReadinessRows,
  validateTrace,
} from "../../../../scripts/performance/artifacts.ts";

import {
  validateAuditDirectory,
  validateCompressedCohort,
} from "../../../../scripts/performance/validate-output.mts";

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

const FOCUSED_SAMPLE_COUNT = 10;
const FOCUSED_ROW_COUNT = 30;

test("validates the committed focused gzip without treating it as a full audit", async () => {
  const directory = new URL("../797/focused/", ARCHIVE);
  const [readiness, trace, manifest] = await Promise.all([
    readFile(new URL("readiness.json.gz", directory)),
    readFile(new URL("long-adventure.trace.json.gz", directory)),
    readFile(new URL("manifest.json", directory), "utf8"),
  ]);
  const input: unknown = JSON.parse(gunzipSync(readiness).toString("utf8"));
  const rows = validateReadinessRows(input, FOCUSED_SAMPLE_COUNT, {
    state: "populated",
    profile: "desktop",
    name: "long-adventure",
  });
  expect(rows).toHaveLength(FOCUSED_ROW_COUNT);
  expect(() => validateReadinessRows(input, FOCUSED_SAMPLE_COUNT)).toThrow(
    "Incomplete audit matrix",
  );
  const traceInput: unknown = JSON.parse(gunzipSync(trace).toString("utf8"));
  expect(
    validateTrace(traceInput, "long-adventure.trace.json.gz").some(
      (event) => event.name === "Screenshot",
    ),
  ).toBe(false);
  const manifestInput: unknown = JSON.parse(manifest);
  expect(manifestInput).toEqual(
    expect.objectContaining({
      scope: "diagnostic",
      complete: false,
      diagnosticComplete: true,
    }),
  );
});

const FULL_SAMPLE_COUNT = 3;
const FULL_ROW_COUNT = 270;
const HOME_FRAME_COUNT = 14;

test("keeps the pre-fix gzip cohort and its filmstrip review, but not as a verified audit", async () => {
  const directory = new URL("../797/full/", ARCHIVE);
  await expect(
    validateCompressedCohort(directory.pathname, FULL_SAMPLE_COUNT),
  ).resolves.toHaveLength(FULL_ROW_COUNT);
  // Its Lighthouse navigations ran in another tab than the content check and
  // its manifest predates the strict schema, so it is not a verified audit.
  await expect(
    validateAuditDirectory(directory.pathname, FULL_SAMPLE_COUNT),
  ).rejects.toThrow();
  const [home, review, manifest] = await Promise.all([
    readFile(new URL("home.trace.json.gz", directory)),
    readFile(new URL("filmstrip-review.json", directory), "utf8"),
    readFile(new URL("manifest.json", directory), "utf8"),
  ]);
  const reviewInput: unknown = JSON.parse(review);
  expect(reviewInput).toEqual(
    expect.objectContaining({
      file: "home.trace.json.gz",
      sha256: createHash("sha256").update(home).digest("hex"),
      framesReviewed: HOME_FRAME_COUNT,
      otherTraceScreenshots: 0,
    }),
  );
  const traceInput: unknown = JSON.parse(gunzipSync(home).toString("utf8"));
  expect(
    validateTrace(traceInput, "home.trace.json.gz").filter(
      (event) => event.name === "Screenshot",
    ),
  ).toHaveLength(HOME_FRAME_COUNT);
  const manifestInput: unknown = JSON.parse(manifest);
  expect(manifestInput).toEqual(
    expect.objectContaining({
      scope: "full",
      complete: true,
      diagnosticComplete: false,
    }),
  );
});
