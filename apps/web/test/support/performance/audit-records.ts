// Synthetic audit records: Lighthouse results and witnesses, and a complete
// v5 readiness cohort with a manifest, for validator tests at any level.

import type { ReadinessRow } from "../../../scripts/performance/artifacts.ts";
import type {
  FlowWitness,
  NavigationWitness,
} from "../../../scripts/performance/lighthouse-evidence.ts";

const BASE = "http://localhost:4000";
const LIGHTHOUSE_VERSION = "12.8.2";
const SOURCE_TIME_ORIGIN = 1000;
const AUDITED_TIME_ORIGIN = 2000;

function lighthouseResult(
  mode: "navigation" | "timespan",
  url: string,
): Record<string, unknown> {
  return {
    lighthouseVersion: LIGHTHOUSE_VERSION,
    requestedUrl: url,
    finalDisplayedUrl: url,
    gatherMode: mode,
    runWarnings: [],
    configSettings: {
      throttlingMethod: "simulate",
      formFactor: "mobile",
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        requestLatencyMs: 562.5,
        downloadThroughputKbps: 1474.56,
        uploadThroughputKbps: 675,
        cpuSlowdownMultiplier: 4,
      },
    },
    audits: {
      "largest-contentful-paint": {
        score: 1,
        scoreDisplayMode: "numeric",
        numericValue: 900,
        numericUnit: "millisecond",
      },
      viewport: { score: 1, scoreDisplayMode: "binary" },
    },
  };
}
function navigationWitness(url: string): NavigationWitness {
  return {
    url,
    sourceTimeOrigin: SOURCE_TIME_ORIGIN,
    auditedTimeOrigin: AUDITED_TIME_ORIGIN,
    checkedTimeOrigin: AUDITED_TIME_ORIGIN,
    mainFrameUrls: ["about:blank", url],
    pageUrl: url,
    content: true,
  };
}
function flowWitness(url: string): FlowWitness {
  return {
    url,
    viewportBeforeTimespan: "412x823@1.75",
    viewportInTimespan: "412x823@1.75",
    sourceTimeOrigin: SOURCE_TIME_ORIGIN,
    destinationTimeOrigin: SOURCE_TIME_ORIGIN,
    pageUrl: url,
    content: true,
  };
}

const ROUTES: Record<ReadinessRow["name"], ReadinessRow["path"]> = {
  home: "/home",
  quests: "/quests",
  quest: "/quests/:id",
  adventures: "/chat",
  "long-adventure": "/chats/:id",
  activities: "/activities",
  workshop: "/workshop",
  editor: "/constructs/:id",
};
const STATE_JOURNEYS: Record<ReadinessRow["state"], ReadinessRow["name"][]> = {
  populated: [
    "home",
    "quests",
    "quest",
    "adventures",
    "long-adventure",
    "activities",
    "workshop",
    "editor",
  ],
  empty: ["home", "quests", "adventures", "activities", "workshop"],
  "empty-detail": ["quest", "long-adventure"],
};
const CLIENT_ORIGIN = 1000;
// Milliseconds after the observation origin, inside a valid window.
const SHELL_MS = 50;
const PRIMARY_MS = 90;
const FIRST_ATTEMPT_MS = 100;
const CONFIRMED_MS = 200;
const WINDOW_MS = 5000;
const SHA_LENGTH = 40;

// One observation of a cell, valid for its mode.
function readinessRow(
  cell: Pick<ReadinessRow, "state" | "profile" | "name" | "mode" | "sample">,
): ReadinessRow {
  let origin = 0;
  let activated: ReadinessRow["activated"] = null;
  let initialSessionWindowCls: number | null = 0;
  if (cell.mode === "client-navigation") {
    origin = CLIENT_ORIGIN;
    activated = {
      region: "route-link",
      rect: { x: 0, y: 0, width: 10, height: 10 },
    };
    initialSessionWindowCls = null;
  }
  return {
    ...cell,
    captureProtocol: "commit-probe-v5",
    contentCheck: "fixture-link",
    hostLoad: [0, 0, 0],
    path: ROUTES[cell.name],
    control: {
      firstAttempt: origin + FIRST_ATTEMPT_MS,
      confirmed: origin + CONFIRMED_MS,
      attempts: 1,
      method: "menu-open",
    },
    origin,
    shell: origin + SHELL_MS,
    primary: origin + PRIMARY_MS,
    end: origin + WINDOW_MS,
    geometry: [
      {
        time: origin + SHELL_MS,
        parts: [{ region: "main", x: 0, y: 64, width: 1000, height: 800 }],
      },
    ],
    scroll: [],
    shifts: [],
    longtasks: [],
    lcp: [],
    events: [],
    nav: { responseStart: 40, requestStart: 10, start: 0, dom: 90 },
    resources: [],
    networkResources: [],
    prefetches: [],
    activated,
    initialSessionWindowCls,
    transitionAllShiftSum: 0,
  };
}
// Every planned observation of a full matrix.
function readinessCohort(samples: number): ReadinessRow[] {
  const rows: ReadinessRow[] = [];
  for (const state of ["populated", "empty", "empty-detail"] as const) {
    for (const profile of ["desktop", "phone"] as const) {
      for (const name of STATE_JOURNEYS[state]) {
        for (let sample = 1; sample <= samples; sample += 1) {
          for (const mode of [
            "cold-direct",
            "warm-direct",
            "client-navigation",
          ] as const) {
            rows.push(readinessRow({ state, profile, name, mode, sample }));
          }
        }
      }
    }
  }
  return rows;
}
function host(): Record<string, unknown> {
  return { name: "host", cpuCount: 4, memoryBytes: 1024, load: [0, 0, 0] };
}
// The manifest of a finished full audit.
function completeManifest(samples: number): Record<string, unknown> {
  const profile = {
    width: 1,
    height: 1,
    cpuRate: 1,
    latency: 0,
    download: -1,
    upload: -1,
  };
  return {
    schemaVersion: 3,
    scope: "full",
    selection: null,
    captureProtocol: "commit-probe-v5",
    sourceCommit: "0".repeat(SHA_LENGTH),
    buildId: "build_1",
    samples,
    fixture: {
      accounts: 3,
      quests: 2,
      messages: 200,
      ownConstructs: 1,
      emptyDetailMessages: 0,
      editedPromptEnding: "Edited.",
    },
    tools: {
      browser: "HeadlessChrome/156.0.8078.4",
      puppeteerCore: "24.12.1",
      lighthouse: LIGHTHOUSE_VERSION,
      lighthousePuppeteerCore: "24.43.1",
    },
    hostBefore: host(),
    hostAfter: host(),
    cache: "new context per cell",
    theme: "parchment/light",
    profiles: { desktop: profile, phone: profile },
    lighthouseEmulation:
      "Lighthouse mobile screen and user agent, applied before each source page loads",
    probeResolutionMs: 100,
    inputCharacters: 42,
    networkAttribution: "categorical",
    minimumWindowMs: 5000,
    postControlWindowMs: 2000,
    quietWindowMs: 500,
    productionAccess: false,
    fieldCollection: false,
    screenshotPolicy: {
      allowedFiles: ["home.trace.json.gz", "stream.trace.json.gz"],
      manualReviewRequired: true,
    },
    complete: true,
    diagnosticComplete: false,
  };
}

export {
  BASE,
  completeManifest,
  flowWitness,
  LIGHTHOUSE_VERSION,
  lighthouseResult,
  navigationWitness,
  readinessCohort,
  readinessRow,
};
