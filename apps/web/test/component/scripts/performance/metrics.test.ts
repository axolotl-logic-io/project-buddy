import { expect, test } from "vitest";
import {
  initialCls,
  sampleRange,
  startupLongTaskTime,
} from "../../../../scripts/performance/metrics.ts";

const FAST_MS = 100;
const TYPICAL_MS = 120;
const OUTLIER_MS = 999;
const OUTLIER_SAMPLE: readonly number[] = [TYPICAL_MS, FAST_MS, OUTLIER_MS];
const EVEN_LOW = 10;
const EVEN_LOWER_MIDDLE = 20;
const EVEN_UPPER_MIDDLE = 30;
const EVEN_HIGH = 90;
const EVEN_SAMPLE: readonly number[] = [
  EVEN_LOW,
  EVEN_LOWER_MIDDLE,
  EVEN_UPPER_MIDDLE,
  EVEN_HIGH,
];
const EVEN_MEDIAN = 25;
const SEPARATE_WINDOWS_CLS = 0.3;
const MAX_WINDOW_CLS = 1;
const SHIFT_INTERVAL_MS = 500;

test("reports uncertainty as median and full range including outliers", () => {
  expect(sampleRange(OUTLIER_SAMPLE)).toEqual({
    count: 3,
    median: 120,
    min: 100,
    max: 999,
  });
  expect(sampleRange(EVEN_SAMPLE).median).toBe(EVEN_MEDIAN);
  expect(() => sampleRange([])).toThrow();
});

test("initial CLS excludes recent input and separates session windows", () => {
  expect(
    initialCls([
      { time: 0, value: 0.1, recentInput: false },
      { time: 100, value: 0.8, recentInput: true },
      { time: 500, value: 0.2, recentInput: false },
      { time: 2000, value: 0.25, recentInput: false },
    ]),
  ).toBeCloseTo(SEPARATE_WINDOWS_CLS);
});

test("initial CLS caps continuous windows at five seconds", () => {
  expect(
    initialCls(
      Array.from({ length: 12 }, (_, index) => ({
        time: index * SHIFT_INTERVAL_MS,
        value: 0.1,
        recentInput: false,
      })),
    ),
  ).toBeCloseTo(MAX_WINDOW_CLS);
});

test("a one-second gap starts a new CLS session", () => {
  const expected = 0.2;
  expect(
    initialCls([
      { time: 0, value: 0.1, recentInput: false },
      { time: 1000, value: 0.2, recentInput: false },
    ]),
  ).toBe(expected);
});

test("compares long-task work inside a fixed window rather than variable control completion", () => {
  const expected = 150;
  expect(
    startupLongTaskTime({
      mode: "cold-direct",
      origin: 10,
      nav: { start: 0, requestStart: 0, responseStart: 20, dom: 100 },
      longtasks: [
        { time: 100, duration: 100 },
        { time: 4950, duration: 300 },
        { time: 6000, duration: 500 },
      ],
    }),
  ).toBe(expected);
});
