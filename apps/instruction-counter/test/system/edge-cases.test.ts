import { expect, test } from "vitest";
import { runCounter, runInvalidInvocation } from "./cli-test-kit.ts";

const EMPTY_REPLY = JSON.stringify({
  instructions: [],
  descriptiveStatements: [],
  contentLines: [],
});
const OVERSIZED_BYTES = 131_073;

test.each([{ args: [] }, { args: ["one", "two"] }])(
  "rejects invalid argument counts",
  ({ args }: { args: string[] }): void => {
    const result = runInvalidInvocation(args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Usage:");
  },
);

test("rejects nonexistent files before starting pi", (): void => {
  const result = runInvalidInvocation([
    "/nonexistent-instruction-counter-test/input.txt",
  ]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("ENOENT");
});

test("rejects oversized input without a model call or partial result", (): void => {
  const result = runCounter("a".repeat(OVERSIZED_BYTES), EMPTY_REPLY);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("128 KiB limit");
  expect(result.invocation).toBeNull();
});

test("rejects directories rather than reading them", (): void => {
  const result = runInvalidInvocation([import.meta.dirname]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("regular file");
});

test("whitespace-only files need no judge", (): void => {
  const result = runCounter(" \r\n\t\r\n", "not JSON");
  expect(result.status).toBe(0);
  expect(result.invocation).toBeNull();
  expect(JSON.parse(result.stdout)).toEqual(
    expect.objectContaining({ contentLineCount: 0 }),
  );
});

test("validates multiline source ranges and totals compound statements", (): void => {
  const quote = "Use spaces\nand include docstrings.";
  const span = { startLine: 1, endLine: 2 };
  const reply = JSON.stringify({
    instructions: [
      { ...span, statement: "Use spaces." },
      { ...span, statement: "Include docstrings." },
    ],
    descriptiveStatements: [],
    contentLines: [1, 2],
  });
  const result = runCounter(quote, reply);
  expect(result.status).toBe(0);
  expect(result.stdout.trim().split("\n")).toHaveLength(1);
  expect(JSON.parse(result.stdout)).toEqual(
    expect.objectContaining({ instructionCount: 2 }),
  );
});

test("rejects blank content lines", (): void => {
  const result = runCounter(
    "Keep it short.\n\n",
    JSON.stringify({
      instructions: [],
      descriptiveStatements: [],
      contentLines: [2],
    }),
  );
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("blank");
});
