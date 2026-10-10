import { describe, expect, test } from "vitest";
import { constantTimeEqual } from "@/auth/constant-time.ts";

describe("constantTimeEqual", () => {
  test("accepts the exact string", async () => {
    expect(await constantTimeEqual("correct horse", "correct horse")).toBe(
      true,
    );
  });

  test("rejects a different string", async () => {
    expect(await constantTimeEqual("correct hors", "correct horse")).toBe(
      false,
    );
    expect(await constantTimeEqual("Correct horse", "correct horse")).toBe(
      false,
    );
    expect(await constantTimeEqual("", "correct horse")).toBe(false);
  });
});
