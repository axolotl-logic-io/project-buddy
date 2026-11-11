// Guard the Full suite workflow's isolation: it runs PR code with a test
// database on the runner, so it holds no secret and can write nothing.
import { describe, expect, test } from "vitest";
import { parseWorkflow, textAt } from "./release-config-test-kit.ts";

const WORKFLOWS = import.meta.glob<string>(
  "../../../../.github/workflows/full-suite.yml",
  { query: "?raw", import: "default", eager: true },
);
const fullSuiteWorkflow: string =
  WORKFLOWS["../../../../.github/workflows/full-suite.yml"] ?? "";

const COMMENT_LINE = /^\s*#/u;
const SECRET_REFERENCE = /\bsecrets\./u;

describe("the full suite workflow", () => {
  test("reads no secret and has read-only access to the repository", () => {
    const code = fullSuiteWorkflow
      .split("\n")
      .filter((line) => !COMMENT_LINE.test(line))
      .join("\n");
    expect(code).not.toBe("");
    expect(code).not.toMatch(SECRET_REFERENCE);
    expect(
      textAt(parseWorkflow(fullSuiteWorkflow), "permissions", "contents"),
    ).toBe("read");
  });
});
