// Lighthouse results become audit evidence only here. A navigation report is
// kept only when the tab Lighthouse drove is the tab whose content was
// checked; a timespan only when its emulation was set before the source page
// loaded. The retained records and their completeness are validated here too.

import { z } from "zod";
import { CONTENT_CHECKS } from "./artifacts.ts";

const NONNEGATIVE = z.number().finite().nonnegative();
const AUDIT = z.object({
  score: z.number().min(0).max(1).nullable(),
  scoreDisplayMode: z.string(),
  numericValue: z.number().finite().optional(),
  numericUnit: z.string().optional(),
});
const THROTTLING = z.strictObject({
  rttMs: NONNEGATIVE,
  throughputKbps: NONNEGATIVE,
  requestLatencyMs: NONNEGATIVE,
  downloadThroughputKbps: NONNEGATIVE,
  uploadThroughputKbps: NONNEGATIVE,
  cpuSlowdownMultiplier: NONNEGATIVE,
});
// The parts of a Lighthouse result the audit reads, parsed at this boundary.
const RESULT = z.object({
  lighthouseVersion: z.string(),
  requestedUrl: z.string().optional(),
  finalDisplayedUrl: z.string(),
  gatherMode: z.enum(["navigation", "timespan", "snapshot"]),
  runtimeError: z.unknown().optional(),
  runWarnings: z.array(z.unknown()),
  configSettings: z.object({
    throttlingMethod: z.enum(["simulate", "devtools", "provided"]),
    formFactor: z.enum(["mobile", "desktop"]),
    throttling: THROTTLING,
  }),
  audits: z.record(z.string(), AUDIT),
});
const RETAINED_AUDIT = z.strictObject({
  score: z.number().min(0).max(1).nullable(),
  value: z.number().finite().optional(),
  unit: z.string().optional(),
});
const MEASURED = z.strictObject({
  version: z.string().min(1),
  throttlingMethod: RESULT.shape.configSettings.shape.throttlingMethod,
  formFactor: z.literal("mobile"),
  throttling: THROTTLING,
  audits: z.record(z.string(), RETAINED_AUDIT),
});
const SAMPLE = z.number().int().positive();
const NAVIGATION_PATHS = ["/home", "/chats/:id"] as const;
const NAVIGATION_RECORD = MEASURED.extend({
  sample: SAMPLE,
  path: z.enum(NAVIGATION_PATHS),
  authenticated: z.literal(true),
  cache: z.literal("authenticated warm assets; storage reset disabled"),
  verification: z.strictObject({
    auditedTab: z.literal("same-page"),
    navigatedDuringAudit: z.literal(true),
    content: z.enum(CONTENT_CHECKS),
  }),
  mode: z.literal("navigation"),
});
const FLOW_RECORD = MEASURED.extend({
  sample: SAMPLE,
  source: z.literal("/home"),
  destination: z.literal("/projects"),
  authenticated: z.literal(true),
  scope: z.literal(
    "Source Home document can contribute lifetime metrics; flow CLS is not an independent transition metric",
  ),
  verification: z.strictObject({
    emulationBeforeSource: z.literal(true),
    sameDocument: z.literal(true),
    content: z.enum(CONTENT_CHECKS),
  }),
  mode: z.literal("timespan"),
});
type NavigationRecord = z.infer<typeof NAVIGATION_RECORD>;
type FlowRecord = z.infer<typeof FLOW_RECORD>;

// What the browser showed around one navigation audit.
interface NavigationWitness {
  readonly url: string;
  readonly sourceTimeOrigin: number;
  readonly auditedTimeOrigin: number;
  readonly checkedTimeOrigin: number;
  readonly mainFrameUrls: readonly string[];
  readonly pageUrl: string;
  readonly content: boolean;
}
// What the browser showed around one timespan.
interface FlowWitness {
  readonly url: string;
  readonly viewportBeforeTimespan: string;
  readonly viewportInTimespan: string;
  readonly sourceTimeOrigin: number;
  readonly destinationTimeOrigin: number;
  readonly pageUrl: string;
  readonly content: boolean;
}

function measured(
  report: z.infer<typeof RESULT>,
  mode: "navigation" | "timespan",
): z.infer<typeof MEASURED> {
  if (
    report.gatherMode !== mode ||
    report.runtimeError !== undefined ||
    report.runWarnings.length > 0 ||
    Object.values(report.audits).some(
      (audit) => audit.scoreDisplayMode === "error",
    )
  ) {
    throw new Error("Lighthouse audit failed or warned");
  }
  if (report.configSettings.formFactor !== "mobile") {
    throw new Error("Lighthouse used an unexpected form factor");
  }
  return {
    version: report.lighthouseVersion,
    throttlingMethod: report.configSettings.throttlingMethod,
    formFactor: report.configSettings.formFactor,
    throttling: report.configSettings.throttling,
    audits: Object.fromEntries(
      Object.entries(report.audits).map(([key, audit]) => [
        key,
        RETAINED_AUDIT.parse({
          score: audit.score,
          value: audit.numericValue,
          unit: audit.numericUnit,
        }),
      ]),
    ),
  };
}

// A navigation report counts only when Lighthouse navigated the checked tab
// itself, left it on the requested authenticated page, and that same
// document showed the state's content.
function verifiedNavigation(
  input: unknown,
  witness: NavigationWitness,
  record: {
    sample: number;
    path: string;
    content: NavigationRecord["verification"]["content"];
  },
): NavigationRecord {
  const report = RESULT.parse(input);
  const metrics = measured(report, "navigation");
  if (
    report.requestedUrl !== witness.url ||
    report.finalDisplayedUrl !== witness.url
  ) {
    throw new Error("Lighthouse redirected or audited another address");
  }
  if (
    witness.auditedTimeOrigin <= witness.sourceTimeOrigin ||
    witness.mainFrameUrls.at(-1) !== witness.url ||
    witness.checkedTimeOrigin !== witness.auditedTimeOrigin
  ) {
    throw new Error("Lighthouse did not navigate the checked tab");
  }
  if (witness.pageUrl !== witness.url || !witness.content) {
    throw new Error("Audited document lacks its authenticated content");
  }
  return NAVIGATION_RECORD.parse({
    sample: record.sample,
    path: record.path,
    authenticated: true,
    cache: "authenticated warm assets; storage reset disabled",
    verification: {
      auditedTab: "same-page",
      navigatedDuringAudit: true,
      content: record.content,
    },
    mode: "navigation",
    ...metrics,
  });
}

// A timespan counts only when its emulation was already in place before the
// source page loaded, the click stayed in one document, and the destination
// showed its content.
function verifiedTimespan(
  input: unknown,
  witness: FlowWitness,
  record: { sample: number; content: FlowRecord["verification"]["content"] },
): FlowRecord {
  const metrics = measured(RESULT.parse(input), "timespan");
  if (witness.viewportBeforeTimespan !== witness.viewportInTimespan) {
    throw new Error("Lighthouse changed emulation inside the timespan");
  }
  if (
    witness.destinationTimeOrigin !== witness.sourceTimeOrigin ||
    witness.pageUrl !== witness.url ||
    !witness.content
  ) {
    throw new Error("Lighthouse flow left the source document");
  }
  return FLOW_RECORD.parse({
    sample: record.sample,
    source: "/home",
    destination: "/projects",
    authenticated: true,
    scope:
      "Source Home document can contribute lifetime metrics; flow CLS is not an independent transition metric",
    verification: {
      emulationBeforeSource: true,
      sameDocument: true,
      content: record.content,
    },
    mode: "timespan",
    ...metrics,
  });
}

// The retained reports of a full audit: each sample's Home and long-adventure
// navigation and its one Home-to-Quests timespan, all from one Lighthouse.
function validateLighthouseReports(
  navigation: unknown,
  flow: unknown,
  samples: number,
  version: string,
): void {
  const navigations = z
    .array(NAVIGATION_RECORD)
    .length(samples * NAVIGATION_PATHS.length)
    .parse(navigation);
  const flows = z.array(FLOW_RECORD).length(samples).parse(flow);
  const navigationKeys = new Set(
    navigations.map((report) => `${report.sample} ${report.path}`),
  );
  const flowKeys = new Set(flows.map((report) => report.sample));
  for (let sample = 1; sample <= samples; sample += 1) {
    if (
      !flowKeys.has(sample) ||
      NAVIGATION_PATHS.some((path) => !navigationKeys.has(`${sample} ${path}`))
    ) {
      throw new Error("Incomplete Lighthouse reports");
    }
  }
  if ([...navigations, ...flows].some((report) => report.version !== version)) {
    throw new Error("Lighthouse version differs from the manifest");
  }
}

export type { FlowWitness, NavigationWitness };
export { validateLighthouseReports, verifiedNavigation, verifiedTimespan };
