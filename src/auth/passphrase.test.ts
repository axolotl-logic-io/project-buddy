// @vitest-environment node
import { describe, expect, it } from "vitest";
import { passphraseMatches } from "@/auth/passphrase";

describe("passphraseMatches", () => {
  it("accepts the exact passphrase", () => {
    expect(passphraseMatches("correct horse", "correct horse")).toBe(true);
  });

  it("rejects a different passphrase", () => {
    expect(passphraseMatches("correct hors", "correct horse")).toBe(false);
    expect(passphraseMatches("Correct horse", "correct horse")).toBe(false);
    expect(passphraseMatches("", "correct horse")).toBe(false);
  });
});
