import { expect, test } from "vitest";
import { runCounter } from "./cli-test-kit.ts";

test("accepts statements normalized from Markdown without requiring exact quote transcription", (): void => {
  const source =
    "- **Conflict predictions are tested,** not guessed: lane reports don't predict merges.";
  const result = runCounter(
    source,
    JSON.stringify({
      instructions: [
        {
          statement: "Test conflict predictions rather than guessing.",
          startLine: 1,
          endLine: 1,
        },
      ],
      descriptiveStatements: [],
      contentLines: [1],
    }),
  );
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    filename: expect.stringContaining("/source.txt"),
    instructionCount: 1,
    descriptiveStatementCount: 0,
    contentLineCount: 1,
  });
});

test("rejects statement ranges that contain only blank space", (): void => {
  const result = runCounter(
    "Run tests.\n\n",
    JSON.stringify({
      instructions: [{ statement: "Run tests.", startLine: 2, endLine: 2 }],
      descriptiveStatements: [],
      contentLines: [1],
    }),
  );
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("source range");
});
