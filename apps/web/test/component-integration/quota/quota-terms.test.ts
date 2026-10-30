import { describe, expect, test } from "vitest";

// This module's own source, to check what it imports.
const QUOTA_TERMS_SOURCE = Object.values(
  import.meta.glob<string>("./quota-terms.ts", {
    base: "/src/quota",
    query: "?raw",
    import: "default",
    eager: true,
  }),
).join("");

// An import of anything, by path: the quota's terms are a domain module, so
// the UI's copy depends on them and not the other way round.
const IMPORTS = /\bfrom\s+["']|\bimport\s*\(|^\s*import\s+["']/mu;

describe("quota-terms.ts", () => {
  test("imports nothing, so the UI copy can use it without a cycle", () => {
    expect(QUOTA_TERMS_SOURCE).toContain("function quotaResetsOn");
    expect(QUOTA_TERMS_SOURCE).not.toMatch(IMPORTS);
  });
});
