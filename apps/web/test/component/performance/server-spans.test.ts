import { afterEach, expect, test, vi } from "vitest";
import { countServerQuery } from "@/performance/query-counter.ts";
import type { ServerSpan } from "@/performance/server-span.ts";
import { measureServerOperation } from "@/performance/server-spans.ts";

const INNER_START = 3;
const INNER_END = 8;
const OUTER_END = 10;
const FAILURE_END = 7;

const recorder = vi.hoisted((): { enabled: boolean; spans: ServerSpan[] } => ({
  enabled: true,
  spans: [],
}));

vi.mock("@/env.ts", () => ({
  readServerSpans: (): boolean => recorder.enabled,
}));
vi.mock("@/errors/error-log.ts", () => ({
  logServerSpan: (span: ServerSpan): void => {
    recorder.spans.push(span);
  },
}));

afterEach(() => {
  recorder.enabled = true;
  recorder.spans.length = 0;
});

test("disabled recording preserves results without reading the clock or emitting data", async () => {
  recorder.enabled = false;
  const clock = vi.fn(() => 0);
  const result = await measureServerOperation(
    "today",
    () => {
      countServerQuery();
      return Promise.resolve({ privateText: "not exported" });
    },
    clock,
  );
  expect(result.privateText).toBe("not exported");
  expect(clock).not.toHaveBeenCalled();
  expect(recorder.spans).toEqual([]);
});

test("nested operations count descendants without attributing outside work", async () => {
  const clock = vi.fn<() => number>().mockReturnValue(0);
  countServerQuery();
  await measureServerOperation(
    "construct-data",
    async () => {
      countServerQuery();
      clock.mockReturnValue(INNER_START);
      await measureServerOperation(
        "spell-data",
        async () => {
          countServerQuery();
          await Promise.resolve();
          countServerQuery();
          clock.mockReturnValue(INNER_END);
        },
        clock,
      );
      countServerQuery();
      clock.mockReturnValue(OUTER_END);
    },
    clock,
  );
  expect(recorder.spans).toEqual([
    { operation: "spell-data", durationMs: 5, queryCount: 2 },
    { operation: "construct-data", durationMs: 10, queryCount: 4 },
  ]);
});

test("interleaved sibling operations keep independent query counts", async () => {
  const firstEntered = Promise.withResolvers<void>();
  const secondEntered = Promise.withResolvers<void>();
  function clock(): number {
    return 0;
  }
  const first = measureServerOperation(
    "today",
    async () => {
      countServerQuery();
      firstEntered.resolve();
      await secondEntered.promise;
      countServerQuery();
    },
    clock,
  );
  const second = measureServerOperation(
    "spell-data",
    async () => {
      await firstEntered.promise;
      countServerQuery();
      secondEntered.resolve();
    },
    clock,
  );
  await Promise.all([first, second]);
  expect(recorder.spans).toContainEqual({
    operation: "today",
    durationMs: 0,
    queryCount: 2,
  });
  expect(recorder.spans).toContainEqual({
    operation: "spell-data",
    durationMs: 0,
    queryCount: 1,
  });
  expect(recorder.spans).toHaveLength(2);
});

test("failed work preserves its error and exports only numeric measurements and a static name", async () => {
  const failure = new Error("private query and parameters");
  const clock = vi.fn<() => number>().mockReturnValue(1);
  const operation = measureServerOperation(
    "current-user",
    () => {
      countServerQuery();
      clock.mockReturnValue(FAILURE_END);
      return Promise.reject(failure);
    },
    clock,
  );
  await expect(operation).rejects.toBe(failure);
  expect(recorder.spans).toEqual([
    { operation: "current-user", durationMs: 6, queryCount: 1 },
  ]);
  countServerQuery();
  expect(recorder.spans[0]?.queryCount).toBe(1);
});
