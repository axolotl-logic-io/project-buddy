import { readdir, readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { validateReadinessRows, validateTrace } from "./artifacts.ts";

const REQUIRED_TRACES = [
  "home",
  "quests",
  "quest",
  "adventures",
  "long-adventure",
  "activities",
  "workshop",
  "editor",
];

function validateCompressedArtifact(
  bytes: Uint8Array,
  filename: string,
  samples: number,
): void {
  const input: unknown = JSON.parse(gunzipSync(bytes).toString("utf8"));
  if (filename === "readiness.json.gz") {
    validateReadinessRows(input, samples);
    return;
  }
  if (filename.endsWith(".trace.json.gz")) {
    validateTrace(input, filename);
    return;
  }
  throw new Error("Unknown compressed artifact");
}

// Read the bytes a reviewer receives, independently of pre-compression checks.
async function validateAuditDirectory(
  directory: string,
  samples: number,
): Promise<void> {
  const filenames = await readdir(directory);
  for (const name of [
    "readiness.json.gz",
    ...REQUIRED_TRACES.map((route) => `${route}.trace.json.gz`),
  ]) {
    if (!filenames.includes(name)) {
      throw new Error("Incomplete compressed audit");
    }
  }
  await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".gz"))
      .map(async (filename): Promise<void> => {
        const bytes = await readFile(`${directory}/${filename}`);
        validateCompressedArtifact(bytes, filename, samples);
      }),
  );
}

export { validateAuditDirectory, validateCompressedArtifact };
