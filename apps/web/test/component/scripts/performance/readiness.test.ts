import { expect, test } from "vitest";
import {
  parseReadinessRow,
  type ReadinessRow,
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
