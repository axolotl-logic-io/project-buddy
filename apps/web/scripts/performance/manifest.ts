// The audit manifest: what was measured, from which source and build, with
// which installed tools and fixture. The runner writes it through this schema
// and the validator reads it back through the same one.

import { z } from "zod";
import { parseReadinessSelection } from "./artifacts.ts";

const MANIFEST_VERSION = 3;
const MINIMUM_SAMPLES = 3;
const PROBE_RESOLUTION_MS = 100;
const INPUT_CHARACTERS = 42;
const MINIMUM_WINDOW_MS = 5000;
const POST_CONTROL_WINDOW_MS = 2000;
const QUIET_WINDOW_MS = 500;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const BROWSER_PATTERN = /^(?:HeadlessChrome|Chrome)\/156\.0\.8078\.4$/u;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const BUILD_PATTERN = /^[A-Za-z0-9_-]+$/u;
const NONNEGATIVE = z.number().finite().nonnegative();
const VERSION = z.string().regex(VERSION_PATTERN);
const HOST = z.strictObject({
  name: z.string().min(1),
  cpuCount: z.number().int().positive(),
  memoryBytes: z.number().int().positive(),
  load: z.tuple([NONNEGATIVE, NONNEGATIVE, NONNEGATIVE]),
});
const PROFILE = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cpuRate: z.number().positive(),
  latency: NONNEGATIVE,
  download: z.number(),
  upload: z.number(),
});
const MANIFEST = z.strictObject({
  schemaVersion: z.literal(MANIFEST_VERSION),
  scope: z.enum(["full", "diagnostic"]),
  selection: z.unknown().transform((input, context) => {
    if (input === null) {
      return null;
    }
    try {
      return parseReadinessSelection(input);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid selection" });
      return z.NEVER;
    }
  }),
  captureProtocol: z.literal("commit-probe-v5"),
  sourceCommit: z.string().regex(COMMIT_PATTERN),
  buildId: z.string().regex(BUILD_PATTERN),
  samples: z.number().int().min(MINIMUM_SAMPLES),
  fixture: z.strictObject({
    accounts: z.number().int().positive(),
    quests: z.number().int().positive(),
    messages: z.number().int().positive(),
    ownConstructs: z.number().int().positive(),
    emptyDetailMessages: z.literal(0),
    editedPromptEnding: z.string().min(1),
  }),
  tools: z.strictObject({
    browser: z.string().regex(BROWSER_PATTERN),
    puppeteerCore: VERSION,
    lighthouse: VERSION,
    lighthousePuppeteerCore: VERSION,
  }),
  hostBefore: HOST,
  hostAfter: HOST.optional(),
  cache: z.string().min(1),
  theme: z.literal("parchment/light"),
  profiles: z.strictObject({ desktop: PROFILE, phone: PROFILE }),
  lighthouseEmulation: z.literal(
    "Lighthouse mobile screen and user agent, applied before each source page loads",
  ),
  probeResolutionMs: z.literal(PROBE_RESOLUTION_MS),
  inputCharacters: z.literal(INPUT_CHARACTERS),
  networkAttribution: z.string().min(1),
  minimumWindowMs: z.literal(MINIMUM_WINDOW_MS),
  postControlWindowMs: z.literal(POST_CONTROL_WINDOW_MS),
  quietWindowMs: z.literal(QUIET_WINDOW_MS),
  productionAccess: z.literal(false),
  fieldCollection: z.literal(false),
  screenshotPolicy: z.strictObject({
    allowedFiles: z.tuple([
      z.literal("home.trace.json.gz"),
      z.literal("stream.trace.json.gz"),
    ]),
    manualReviewRequired: z.literal(true),
  }),
  complete: z.boolean(),
  diagnosticComplete: z.boolean().optional(),
});
type Manifest = z.infer<typeof MANIFEST>;
type ManifestInput = z.input<typeof MANIFEST>;

function parseManifest(input: unknown): Manifest {
  return MANIFEST.parse(input);
}
// A finished full audit at the requested sample count, nothing less.
function parseCompleteManifest(input: unknown, samples: number): Manifest {
  const manifest = MANIFEST.parse(input);
  if (
    manifest.scope !== "full" ||
    manifest.selection !== null ||
    !manifest.complete ||
    manifest.diagnosticComplete !== false ||
    manifest.hostAfter === undefined ||
    manifest.samples !== samples
  ) {
    throw new Error("Manifest does not describe a complete full audit");
  }
  return manifest;
}

export type { Manifest, ManifestInput };
export { MANIFEST_VERSION, parseCompleteManifest, parseManifest };
