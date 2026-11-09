import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";
import { validateCompressedArtifact } from "../../../../scripts/performance/validate-output.mts";

const SAMPLE_COUNT = 3;

test("rejects forbidden screenshots in the exact compressed input a reviewer gets", () => {
  for (const event of [
    { name: "Screenshot" },
    { name: "Screenshot", args: { snapshot: "aGVsbG8=" } },
  ]) {
    const bytes = gzipSync(JSON.stringify({ traceEvents: [event] }));
    expect(() =>
      validateCompressedArtifact(bytes, "editor.trace.json.gz", SAMPLE_COUNT),
    ).toThrow("Forbidden screenshot event");
    expect(() =>
      validateCompressedArtifact(bytes, "home.trace.json.gz", SAMPLE_COUNT),
    ).not.toThrow();
  }
});

test("fails malformed and incomplete compressed artifacts", () => {
  expect(() =>
    validateCompressedArtifact(
      new Uint8Array(),
      "readiness.json.gz",
      SAMPLE_COUNT,
    ),
  ).toThrow();
  expect(() =>
    validateCompressedArtifact(
      gzipSync("[]"),
      "readiness.json.gz",
      SAMPLE_COUNT,
    ),
  ).toThrow("Incomplete audit matrix");
});
