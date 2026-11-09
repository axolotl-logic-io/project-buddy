import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  verifiedNavigation,
  verifiedTimespan,
} from "../../../../scripts/performance/lighthouse-evidence.ts";
import { summarizeAudit } from "../../../../scripts/performance/summary.ts";
import { validateAuditDirectory } from "../../../../scripts/performance/validate-output.mts";
import {
  BASE,
  completeManifest,
  flowWitness,
  lighthouseResult,
  navigationWitness,
  readinessCohort,
} from "../../../support/performance/audit-records.ts";

const SAMPLES = 3;
const TRACES = [
  "home",
  "quests",
  "quest",
  "adventures",
  "long-adventure",
  "activities",
  "workshop",
  "editor",
];
let directory = "";

function lighthouseReports(): { navigations: unknown[]; flows: unknown[] } {
  const navigations: unknown[] = [];
  const flows: unknown[] = [];
  for (let sample = 1; sample <= SAMPLES; sample += 1) {
    for (const [path, url] of [
      ["/home", `${BASE}/home`],
      ["/chats/:id", `${BASE}/chats/0a6c3b1e-3a3a-4b4b-8c8c-1d1d1d1d1d1d`],
    ] as const) {
      navigations.push(
        verifiedNavigation(
          lighthouseResult("navigation", url),
          navigationWitness(url),
          { sample, path, content: "fixture-link" },
        ),
      );
    }
    flows.push(
      verifiedTimespan(
        lighthouseResult("timespan", `${BASE}/projects`),
        flowWitness(`${BASE}/projects`),
        { sample, content: "fixture-link" },
      ),
    );
  }
  return { navigations, flows };
}
async function writeJson(name: string, value: unknown): Promise<void> {
  await writeFile(join(directory, name), JSON.stringify(value, null, 2));
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "pb-audit-directory-"));
  const rows = readinessCohort(SAMPLES);
  const { navigations, flows } = lighthouseReports();
  await Promise.all([
    writeFile(
      join(directory, "readiness.json.gz"),
      gzipSync(JSON.stringify(rows)),
    ),
    ...TRACES.map((name) =>
      writeFile(
        join(directory, `${name}.trace.json.gz`),
        gzipSync(JSON.stringify({ traceEvents: [] })),
      ),
    ),
    writeJson("summary.json", summarizeAudit(rows)),
    writeJson("manifest.json", completeManifest(SAMPLES)),
    writeJson("lighthouse.json", navigations),
    writeJson("lighthouse-flow.json", flows),
  ]);
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("accepts a complete audit whose summary, manifest and Lighthouse reports agree", async () => {
  await expect(
    validateAuditDirectory(directory, SAMPLES),
  ).resolves.toBeUndefined();
});

test.each([
  ["incomplete", { ...completeManifest(SAMPLES), complete: false }],
  ["diagnostic", { ...completeManifest(SAMPLES), scope: "diagnostic" }],
  ["unfinished", { ...completeManifest(SAMPLES), hostAfter: undefined }],
  ["earlier schema", { ...completeManifest(SAMPLES), schemaVersion: 2 }],
  ["extra field", { ...completeManifest(SAMPLES), prompt: "private" }],
  ["other sample count", completeManifest(SAMPLES + 1)],
])("rejects a %s manifest", async (_kind, manifest) => {
  await writeJson("manifest.json", manifest);
  await expect(validateAuditDirectory(directory, SAMPLES)).rejects.toThrow();
});

test("rejects a summary its rows do not reproduce", async () => {
  const rows = readinessCohort(SAMPLES);
  const summary = summarizeAudit(rows.slice(1));
  await writeJson("summary.json", summary);
  await expect(validateAuditDirectory(directory, SAMPLES)).rejects.toThrow(
    "Summary differs from its readiness rows",
  );
});

test("rejects missing or incomplete Lighthouse reports", async () => {
  const { navigations, flows } = lighthouseReports();
  await writeJson("lighthouse-flow.json", flows.slice(1));
  await expect(validateAuditDirectory(directory, SAMPLES)).rejects.toThrow();
  await writeJson("lighthouse-flow.json", flows);
  await writeJson("lighthouse.json", navigations.slice(1));
  await expect(validateAuditDirectory(directory, SAMPLES)).rejects.toThrow();
  await rm(join(directory, "lighthouse.json"));
  await expect(validateAuditDirectory(directory, SAMPLES)).rejects.toThrow();
});

test("rejects rows captured before the state content check", async () => {
  const rows = readinessCohort(SAMPLES).map((row) => ({
    ...row,
    captureProtocol: "commit-probe-v4",
    contentCheck: undefined,
  }));
  await writeFile(
    join(directory, "readiness.json.gz"),
    gzipSync(JSON.stringify(rows)),
  );
  await expect(validateAuditDirectory(directory, SAMPLES)).rejects.toThrow(
    "Rows differ from the manifest's capture protocol",
  );
});
