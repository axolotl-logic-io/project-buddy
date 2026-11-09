import { readdir, readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  type ReadinessRow,
  validateReadinessRows,
  validateTrace,
} from "./artifacts.ts";
import { validateLighthouseReports } from "./lighthouse-evidence.ts";
import { parseCompleteManifest } from "./manifest.ts";
import { validateSummary } from "./summary.ts";

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

// Read the compressed bytes a reviewer receives, independently of
// pre-compression checks: the full readiness matrix and every trace.
async function validateCompressedCohort(
  directory: string,
  samples: number,
): Promise<ReadinessRow[]> {
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
  const readiness = await readFile(`${directory}/readiness.json.gz`);
  return validateReadinessRows(
    JSON.parse(gunzipSync(readiness).toString("utf8")),
    samples,
  );
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

// A complete full audit: its compressed cohort, a manifest that names the
// same protocol and sample count, a summary its rows reproduce, and every
// verified Lighthouse report from the manifest's Lighthouse version.
async function validateAuditDirectory(
  directory: string,
  samples: number,
): Promise<void> {
  const manifest = parseCompleteManifest(
    await readJson(`${directory}/manifest.json`),
    samples,
  );
  const rows = await validateCompressedCohort(directory, samples);
  if (rows.some((row) => row.captureProtocol !== manifest.captureProtocol)) {
    throw new Error("Rows differ from the manifest's capture protocol");
  }
  validateSummary(await readJson(`${directory}/summary.json`), rows);
  validateLighthouseReports(
    await readJson(`${directory}/lighthouse.json`),
    await readJson(`${directory}/lighthouse-flow.json`),
    samples,
    manifest.tools.lighthouse,
  );
}

export {
  validateAuditDirectory,
  validateCompressedArtifact,
  validateCompressedCohort,
};
