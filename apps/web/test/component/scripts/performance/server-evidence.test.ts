import { expect, test } from "vitest";
import {
  validateServerEvidence,
  validateServerSpans,
} from "../../../../scripts/performance/server-evidence.ts";

const SPAN: Record<string, unknown> = {
  operation: "current-user",
  durationMs: 12,
  queryCount: 1,
};
const DOCUMENT: Record<string, unknown> = {
  sample: 1,
  phase: "initial",
  name: "home",
  variant: "before",
  hostLoad: [0, 0, 0],
  headersMs: 5,
  shellMarkupMs: 10,
  primaryMarkupMs: 20,
  completeMs: 30,
  spans: [SPAN],
};

test("accepts local static operation evidence without query payloads", () => {
  expect(validateServerEvidence([DOCUMENT], "documents")).toEqual([DOCUMENT]);
  expect(validateServerSpans([SPAN])).toEqual([SPAN]);
  for (const unsafe of [
    { operation: "select private" },
    { sql: "private" },
    { args: ["private"] },
    { queryCount: -1 },
  ]) {
    expect(() => validateServerSpans([{ ...SPAN, ...unsafe }])).toThrow();
  }
});

test("rejects unsafe metadata in compressed server evidence", () => {
  for (const unsafe of [
    { userId: "private" },
    { url: "/projects/private" },
    { headers: { cookie: "private" } },
    { prompt: "private" },
  ]) {
    expect(() =>
      validateServerEvidence([{ ...DOCUMENT, ...unsafe }], "documents"),
    ).toThrow();
  }
});
