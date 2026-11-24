// Guard the CI workflow's isolation: it runs PR code with a test database on
// the runner, so it holds no secret and can write nothing.
import { describe, expect, test } from "vitest";
import { parseWorkflow, textAt } from "./release-config-test-kit.ts";

const WORKFLOWS = import.meta.glob<string>(
  "../../../../.github/workflows/ci.yml",
  { query: "?raw", import: "default", eager: true },
);
const ciWorkflow: string =
  WORKFLOWS["../../../../.github/workflows/ci.yml"] ?? "";

const COMMENT_LINE = /^\s*#/u;
const SECRET_REFERENCE = /\bsecrets\./u;

describe("the CI workflow", () => {
  test("reads no secret and has read-only access to the repository", () => {
    const code = ciWorkflow
      .split("\n")
      .filter((line) => !COMMENT_LINE.test(line))
      .join("\n");
    expect(code).not.toBe("");
    expect(code).not.toMatch(SECRET_REFERENCE);
    expect(textAt(parseWorkflow(ciWorkflow), "permissions", "contents")).toBe(
      "read",
    );
  });
});
