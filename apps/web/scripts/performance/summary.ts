// The readable summary of a readiness cohort. It is derived only from the
// compressed rows, so a validator recomputes it rather than trusting it.

import type { ReadinessRow } from "./artifacts.ts";
import {
  byteBuckets,
  observedStability,
  STARTUP_WINDOW_MS,
  sampleRange,
  startupLongTaskTime,
} from "./metrics.ts";

const SUMMARY_VERSION = 3;
// Geometry quiet means no layout change; it says nothing about the network.
const FINAL_WINDOW_MS = 500;

function origin(row: ReadinessRow): number {
  if (row.mode === "client-navigation") {
    return row.origin;
  }
  return row.nav.start;
}
// Completed CDP requests in one observation, including prefetch and
// requests that kept starting until the window closed.
function network(row: ReadinessRow): {
  requests: number;
  prefetchRequests: number;
  bytes: number;
  finalWindowRequests: number;
} {
  const requests = row.networkResources ?? [];
  return {
    requests: requests.length,
    prefetchRequests: requests.filter((request) => request.prefetch).length,
    bytes: requests.reduce((sum, request) => sum + request.bytes, 0),
    finalWindowRequests: requests.filter(
      (request) => request.start >= row.end - FINAL_WINDOW_MS,
    ).length,
  };
}
function summarizeAudit(rows: readonly ReadinessRow[]): unknown {
  const groups = new Map<string, ReadinessRow[]>();
  for (const row of rows) {
    const key = [row.state, row.profile, row.name, row.mode].join("/");
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const cells = Array.from(groups, ([cell, group]) => {
    const traffic = group.map(network);
    return {
      cell,
      shell: sampleRange(group.map((row) => row.shell - origin(row))),
      stability: group.map((row) => {
        const observed = observedStability(row);
        let stableUseful: number | null = null;
        if (observed.quiet) {
          stableUseful = observed.stableUseful - origin(row);
        }
        return {
          lastChangeMs: observed.lastChange - origin(row),
          quiet: observed.quiet,
          stableUsefulMs: stableUseful,
        };
      }),
      initialSessionWindowCls: group.map((row) => row.initialSessionWindowCls),
      allShiftSums: sampleRange(group.map((row) => row.transitionAllShiftSum)),
      primaryControlProxy: sampleRange(
        group.map((row) => row.primary - origin(row)),
      ),
      control: sampleRange(
        group.map((row) => row.control.confirmed - origin(row)),
      ),
      startupLongTaskBusyMs: sampleRange(group.map(startupLongTaskTime)),
      quietWindows: group.filter((row) => observedStability(row).quiet).length,
      network: {
        requests: sampleRange(traffic.map((row) => row.requests)),
        prefetchRequests: sampleRange(
          traffic.map((row) => row.prefetchRequests),
        ),
        bytes: sampleRange(traffic.map((row) => row.bytes)),
        rowsWithFinalWindowRequests: traffic.filter(
          (row) => row.finalWindowRequests > 0,
        ).length,
      },
      bytes: group.map(byteBuckets),
    };
  });
  return {
    version: SUMMARY_VERSION,
    diagnostic:
      "Median/min–max only; trend warnings, no score gate or field INP inference",
    startupWindowMs: STARTUP_WINDOW_MS,
    finalWindowMs: FINAL_WINDOW_MS,
    byteScope:
      "Resources started and completed within fixed first five seconds; source prefetch before activation separate diagnostic; full variable observation retained in gzip",
    primaryScope:
      "primaryControlProxy is when the journey's primary control was present, not when its content finished",
    networkScope:
      "Completed CDP requests over the whole observation, prefetch included; a quiet window is geometry only, and rowsWithFinalWindowRequests counts rows still starting requests in the final window",
    cells,
  };
}
// A retained summary must equal the one its own rows produce.
function validateSummary(input: unknown, rows: readonly ReadinessRow[]): void {
  if (JSON.stringify(input) !== JSON.stringify(summarizeAudit(rows))) {
    throw new Error("Summary differs from its readiness rows");
  }
}

export { summarizeAudit, validateSummary };
