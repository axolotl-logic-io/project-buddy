import { expect, test } from "vitest";
import type { Analysis } from "../src/report.ts";
import { runCounter } from "./cli-test-kit.ts";

const SOURCE =
  "Prefer small functions.\nThe project uses TypeScript.\nPrefer small functions.\n{\n}\n";
const FIRST = {
  statement: "Prefer small functions.",
  startLine: 1,
  endLine: 1,
};
const REPEAT_LINE = 3;
const INVALID_UTF8_BYTE = 255;
const OUT_OF_RANGE_LINE = 9;
const REPLY: Analysis = {
  instructions: [FIRST, { ...FIRST, startLine: 3, endLine: 3 }],
  descriptiveStatements: [
    {
      statement: "The project uses TypeScript.",
      startLine: 2,
      endLine: 2,
    },
  ],
  contentLines: [1, 2, REPEAT_LINE],
};

test("emits one JSON line with only the filename and derived totals", (): void => {
  const result = runCounter(SOURCE, JSON.stringify(REPLY, null, 2));
  expect(result.status).toBe(0);
  expect(result.stdout.trim().split("\n")).toHaveLength(1);
  expect(JSON.parse(result.stdout)).toEqual({
    filename: expect.stringContaining("/source.txt"),
    instructionCount: 2,
    descriptiveStatementCount: 1,
    contentLineCount: 3,
  });
  expect(result.invocation).toEqual(
    expect.objectContaining({
      args: expect.arrayContaining([
        "--print",
        "--no-tools",
        "--no-context-files",
        "--no-extensions",
        "--no-skills",
        "--no-prompt-templates",
        "--no-mcp",
        "--no-session",
        "--no-approve",
        "--model",
        "openai/gpt-6-luna",
      ]),
      input: expect.stringContaining("Prefer small functions."),
    }),
  );
  expect(result.stdout).not.toContain("fake pi diagnostic");
});

test.each([new Uint8Array([0, 1, 2]), new Uint8Array([INVALID_UTF8_BYTE])])(
  "skips binary files without invoking pi",
  (source: Uint8Array): void => {
    const result = runCounter(source, "not JSON");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      filename: expect.stringContaining("/source.txt"),
      status: "skipped",
      reason: "binary",
    });
    expect(result.invocation).toBeNull();
  },
);

test("accepts source-code extensions and preserves CRLF line locations", (): void => {
  const result = runCounter(
    "// Prefer small functions.\r\n{\r\n}\r\n",
    JSON.stringify({
      instructions: [FIRST],
      descriptiveStatements: [],
      contentLines: [1],
    }),
    { fileName: "source.ts" },
  );
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(
    expect.objectContaining({ instructionCount: 1 }),
  );
});

test.each([
  "not JSON",
  "\x60\x60\x60json\n{}\n\x60\x60\x60",
  JSON.stringify({ ...REPLY, contentLines: [1, 1] }),
  JSON.stringify({ ...REPLY, contentLines: [OUT_OF_RANGE_LINE] }),
  JSON.stringify({ ...REPLY, instructions: [{ ...FIRST, startLine: 0 }] }),
  JSON.stringify({
    ...REPLY,
    instructions: [{ ...FIRST, startLine: 2, endLine: 1 }],
  }),
  JSON.stringify({
    ...REPLY,
    instructions: [{ ...FIRST, startLine: 9, endLine: 9 }],
  }),
  JSON.stringify({ ...REPLY, instructionCount: 999 }),
])(
  "rejects malformed results and invalid source ranges without stdout",
  (reply: string): void => {
    const result = runCounter(SOURCE, reply);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Pi ");
  },
);

test("does not accept partial output from a failed pi process", (): void => {
  const result = runCounter(SOURCE, JSON.stringify(REPLY), { exitCode: 1 });
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
});

test("handles empty text without a model call", (): void => {
  const result = runCounter("", "not JSON");
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(
    expect.objectContaining({
      instructionCount: 0,
      descriptiveStatementCount: 0,
      contentLineCount: 0,
    }),
  );
  expect(result.invocation).toBeNull();
});
