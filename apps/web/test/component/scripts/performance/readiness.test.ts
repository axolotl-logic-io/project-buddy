import { expect, test } from "vitest";
import {
  parseReadinessRow,
  type ReadinessRow,
  type ReadinessSelection,
  validateReadinessRows,
} from "../../../../scripts/performance/artifacts.ts";

const HOME: ReadinessRow = {
  captureProtocol: "commit-probe-v4",
  hostLoad: [0, 0, 0],
  state: "empty",
  profile: "desktop",
  name: "home",
  mode: "cold-direct",
  sample: 1,
  path: "/home",
  control: {
    firstAttempt: 100,
    confirmed: 200,
    attempts: 1,
    method: "menu-open",
  },
  origin: 0,
  shell: 50,
  primary: 90,
  end: 5000,
  geometry: [
    {
      time: 50,
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
  activated: null,
  initialSessionWindowCls: 0,
  transitionAllShiftSum: 0,
};
const SAMPLES = 3;

test("partial and duplicated audits cannot be reported as completed captures", () => {
  expect(() => validateReadinessRows([HOME], SAMPLES)).toThrow(
    "Incomplete audit matrix",
  );
  expect(() => validateReadinessRows([HOME, HOME], SAMPLES)).toThrow(
    "Duplicate observation",
  );
});

test("redirected or unauthorized detail pages cannot be empty successes", () => {
  expect(() => parseReadinessRow({ ...HOME, path: "/login" })).toThrow();
  expect(() =>
    validateReadinessRows(
      [{ ...HOME, name: "quest", path: "/projects/:id" }],
      SAMPLES,
    ),
  ).toThrow("Invalid authenticated destination");
});

test("observation windows and source metrics remain distinct", () => {
  expect(() =>
    validateReadinessRows([{ ...HOME, end: 1000 }], SAMPLES),
  ).toThrow("Invalid observation window");
  expect(() =>
    validateReadinessRows([{ ...HOME, mode: "client-navigation" }], SAMPLES),
  ).toThrow("Source document attributed");
});

test("repeated observer entries and arbitrary content fields fail validation", () => {
  const shift = { time: 100, value: 0.1, recentInput: true };
  expect(() =>
    validateReadinessRows([{ ...HOME, shifts: [shift, shift] }], SAMPLES),
  ).toThrow("Duplicate layout shift");
  expect(() => parseReadinessRow({ ...HOME, text: "private" })).toThrow();
  expect(() =>
    parseReadinessRow({
      ...HOME,
      resources: [
        {
          path: "/projects/private-id?prompt=private",
          start: 0,
          duration: 1,
          bytes: 1,
          type: "fetch",
        },
      ],
    }),
  ).toThrow();
});

const DISCRETE_EVENT_TYPES = [
  "auxclick",
  "dblclick",
  "mouseenter",
  "mouseleave",
  "pointercancel",
  "gotpointercapture",
  "lostpointercapture",
  "touchcancel",
  "dragstart",
  "dragend",
  "dragenter",
  "dragleave",
  "dragover",
  "drop",
];

test("retains standard discrete Event Timing names and rejects arbitrary text", () => {
  for (const name of DISCRETE_EVENT_TYPES) {
    expect(() =>
      parseReadinessRow({
        ...HOME,
        events: [{ name, time: 100, duration: 16, interaction: 0 }],
      }),
    ).not.toThrow();
  }
  expect(() =>
    parseReadinessRow({
      ...HOME,
      events: [
        { name: "privateText", time: 100, duration: 16, interaction: 0 },
      ],
    }),
  ).toThrow();
});

test("focused diagnostics require explicit scope and cannot masquerade as a full matrix", () => {
  const modes = ["cold-direct", "warm-direct", "client-navigation"] as const;
  const rows = Array.from({ length: SAMPLES }, (_, index) =>
    modes.map((mode): ReadinessRow => {
      const row: ReadinessRow = { ...HOME, sample: index + 1, mode };
      if (mode === "client-navigation") {
        row.activated = {
          region: "route-link",
          rect: { x: 0, y: 0, width: 10, height: 10 },
        };
        row.initialSessionWindowCls = null;
      }
      return row;
    }),
  ).flat();
  const selection: ReadinessSelection = {
    state: HOME.state,
    profile: HOME.profile,
    name: HOME.name,
  };
  expect(() => validateReadinessRows(rows, SAMPLES)).toThrow(
    "Incomplete audit matrix",
  );
  expect(() => validateReadinessRows(rows, SAMPLES, selection)).not.toThrow();
  expect(() =>
    validateReadinessRows(rows.slice(0, -1), SAMPLES, selection),
  ).toThrow("Incomplete audit matrix");
  expect(() =>
    validateReadinessRows(rows, SAMPLES, { ...selection, profile: "phone" }),
  ).toThrow("outside diagnostic scope");
  expect(() =>
    validateReadinessRows([], SAMPLES, {
      state: "empty",
      profile: "desktop",
      name: "editor",
    }),
  ).toThrow("Inaccessible diagnostic selection");
});

test("network attribution keeps only coarse initiators and numeric request facts", () => {
  const request = {
    path: "/_next/static/:asset.js",
    method: "GET",
    resourceType: "Script",
    initiator: "parser",
    prefetch: false,
    start: 0,
    duration: 1,
    bytes: 1,
    status: 200,
    failed: false,
  };
  expect(() =>
    parseReadinessRow({ ...HOME, networkResources: [request] }),
  ).not.toThrow();
  for (const unsafe of [
    { initiator: "private URL" },
    { stack: "private" },
    { url: "private" },
    { headers: { cookie: "private" } },
  ]) {
    expect(() =>
      parseReadinessRow({
        ...HOME,
        networkResources: [{ ...request, ...unsafe }],
      }),
    ).toThrow();
  }
});

test("v5 observations must name their state content check and cannot mix with v4", () => {
  const unchecked: ReadinessRow = {
    ...HOME,
    captureProtocol: "commit-probe-v5",
  };
  expect(() => validateReadinessRows([unchecked], SAMPLES)).toThrow(
    "State content check missing",
  );
  expect(() =>
    validateReadinessRows([{ ...HOME, contentCheck: "fixture-link" }], SAMPLES),
  ).toThrow("State content check missing");
  expect(() =>
    validateReadinessRows(
      [HOME, { ...unchecked, contentCheck: "no-owned-entities", sample: 2 }],
      SAMPLES,
    ),
  ).toThrow("Mixed capture protocols");
  expect(() =>
    parseReadinessRow({ ...unchecked, contentCheck: "message text" }),
  ).toThrow();
});
