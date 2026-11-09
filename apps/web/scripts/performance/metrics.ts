import type { ReadinessRow } from "./artifacts.ts";

const SESSION_GAP_MS = 1000;
const SESSION_LENGTH_MS = 5000;
const QUIET_MS = 500;
const MEDIAN_DIVISOR = 2;

interface SampleRange {
  readonly count: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
}

// A finite lab sample supports a median and range, not a field percentile.
function sampleRange(values: readonly number[]): SampleRange {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new Error("A nonempty finite sample is required");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / MEDIAN_DIVISOR);
  const upper = sorted[middle];
  const [min] = sorted;
  const max = sorted.at(-1);
  if (upper === undefined || min === undefined || max === undefined) {
    throw new Error("Missing sample");
  }
  let median = upper;
  if (sorted.length % MEDIAN_DIVISOR === 0) {
    const lower = sorted[middle - 1];
    if (lower === undefined) {
      throw new Error("Missing middle sample");
    }
    median = (lower + upper) / MEDIAN_DIVISOR;
  }
  return { count: sorted.length, median, min, max };
}

// Initial document CLS excludes recent input and uses maximum session windows.
// Transition all-shift sums must be reported separately, never passed as CLS.
function initialCls(shifts: ReadinessRow["shifts"]): number {
  let best = 0;
  let total = 0;
  let first = Number.NEGATIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;
  for (const shift of [...shifts].sort(
    (left, right) => left.time - right.time,
  )) {
    if (!shift.recentInput) {
      if (
        shift.time - last >= SESSION_GAP_MS ||
        shift.time - first >= SESSION_LENGTH_MS
      ) {
        total = 0;
        first = shift.time;
      }
      total += shift.value;
      last = shift.time;
      best = Math.max(best, total);
    }
  }
  return best;
}

// All rectangles are in document coordinates. Scroll is a separate diagnostic.
function observedStability(row: ReadinessRow): {
  lastChange: number;
  quiet: boolean;
  stableUseful: number;
} {
  let lastChange = row.origin;
  let previous = "";
  for (const geometry of row.geometry) {
    const fingerprint = JSON.stringify(geometry.parts);
    if (fingerprint !== previous) {
      lastChange = Math.max(lastChange, geometry.time);
      previous = fingerprint;
    }
  }
  for (const shift of row.shifts) {
    lastChange = Math.max(lastChange, shift.time);
  }
  return {
    lastChange,
    quiet: row.end - lastChange >= QUIET_MS,
    stableUseful: Math.max(lastChange, row.primary, row.control.confirmed),
  };
}

function startupLongTaskTime(
  row: Pick<ReadinessRow, "mode" | "nav" | "origin" | "longtasks">,
): number {
  let { start: origin } = row.nav;
  if (row.mode === "client-navigation") {
    ({ origin } = row);
  }
  const end = origin + SESSION_LENGTH_MS;
  return row.longtasks.reduce(
    (total, task) =>
      total +
      Math.max(
        0,
        Math.min(task.time + task.duration, end) - Math.max(task.time, origin),
      ),
    0,
  );
}

export { initialCls, observedStability, sampleRange, startupLongTaskTime };
