// @vitest-environment node
import { describe, expect, test } from "vitest";
import { passphraseMatches } from "@/auth/passphrase.ts";

describe("passphraseMatches", () => {
  test("accepts the exact passphrase", () => {
    expect(passphraseMatches("correct horse", "correct horse")).toBe(true);
  });

  test("rejects a different passphrase", () => {
    expect(passphraseMatches("correct hors", "correct horse")).toBe(false);
    expect(passphraseMatches("Correct horse", "correct horse")).toBe(false);
    expect(passphraseMatches("", "correct horse")).toBe(false);
  });
});
