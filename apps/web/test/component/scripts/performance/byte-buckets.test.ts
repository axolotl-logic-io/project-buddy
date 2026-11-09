import { expect, test } from "vitest";
import type { NetworkResource } from "../../../../scripts/performance/artifacts.ts";
import { byteBuckets } from "../../../../scripts/performance/metrics.ts";

const ACTIVATION_MS = 1000;
const PRIMARY_MS = 1200;

type ByteRow = Parameters<typeof byteBuckets>[0];
function request(changes: Partial<NetworkResource>): NetworkResource {
  return {
    path: "/_next/static/:asset.js",
    method: "GET",
    resourceType: "Script",
    initiator: "parser",
    prefetch: false,
    start: 20,
    duration: 30,
    bytes: 100,
    status: 200,
    failed: false,
    ...changes,
  };
}
function row(networkResources?: NetworkResource[]): ByteRow {
  return {
    mode: "cold-direct",
    nav: { start: 0, requestStart: 0, responseStart: 10, dom: 100 },
    origin: 10,
    primary: 200,
    resources: [],
    networkResources,
  };
}

test("late graph variance does not become an early parser payload reduction", () => {
  const before = byteBuckets(
    row([
      request({}),
      request({ start: 300, bytes: 2000, initiator: "other" }),
    ]),
  );
  const after = byteBuckets(
    row([
      request({ bytes: 110 }),
      request({ start: 300, bytes: 1000, initiator: "other" }),
    ]),
  );
  const {
    networkEarlyParserScripts: earlyBefore,
    networkLateScripts: lateBefore,
  } = before;
  const {
    networkEarlyParserScripts: earlyAfter,
    networkLateScripts: lateAfter,
  } = after;
  expect(earlyBefore).toEqual({ requests: 1, bytes: 100 });
  expect(earlyAfter).toEqual({ requests: 1, bytes: 110 });
  expect(lateBefore).toEqual({ requests: 1, bytes: 2000 });
  expect(lateAfter).toEqual({ requests: 1, bytes: 1000 });
});

test("excludes prefetch, failures and requests unfinished at the fixed cutoff", () => {
  const {
    networkEarlyParserScripts,
    networkWindowPrefetch,
    networkFailedRequests,
  } = byteBuckets(
    row([
      request({}),
      request({ prefetch: true, bytes: 50 }),
      request({ failed: true, status: 0, bytes: 10 }),
      request({ duration: 6000, bytes: 9000 }),
    ]),
  );
  expect(networkEarlyParserScripts).toEqual({ requests: 1, bytes: 100 });
  expect(networkWindowPrefetch).toEqual({ requests: 1, bytes: 50 });
  expect(networkFailedRequests).toEqual({ requests: 1, bytes: 10 });
});

test("missing historical network attribution stays unavailable rather than zero", () => {
  const { networkEarlyParserScripts } = byteBuckets(row());
  expect(networkEarlyParserScripts).toBeUndefined();
});

test("transition windows keep source prefetch outside destination-window totals", () => {
  const input = row([
    request({ prefetch: true, start: 100 }),
    request({ start: 1100, bytes: 60 }),
  ]);
  input.mode = "client-navigation";
  input.origin = ACTIVATION_MS;
  input.primary = PRIMARY_MS;
  const { networkSourcePrefetchBeforeActivation, networkEarlyParserScripts } =
    byteBuckets(input);
  expect(networkSourcePrefetchBeforeActivation).toEqual({
    requests: 1,
    bytes: 100,
  });
  expect(networkEarlyParserScripts).toEqual({ requests: 1, bytes: 60 });
});
