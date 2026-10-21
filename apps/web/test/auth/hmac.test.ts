import { describe, expect, test } from "vitest";
import { constantTimeEqual, hmacSha256 } from "@/auth/hmac.ts";

// RFC 4231, test case 2: the key "Jefe" and the message "what do ya want
// for nothing?".
const RFC_4231_KEY = "Jefe";
const RFC_4231_MESSAGE = "what do ya want for nothing?";
// The HMAC, in hexadecimal, in the RFC's 32-bit words.
const RFC_4231_HMAC_SHA256 = [
  "5bdcc146",
  "bf60754e",
  "6a042426",
  "089575c7",
  "5a003f08",
  "9d273983",
  "9dec58b9",
  "64ec3843",
].join("");
const HEXADECIMAL = 16;
const BYTE_HEX_DIGITS = 2;

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(HEXADECIMAL).padStart(BYTE_HEX_DIGITS, "0"),
  ).join("");
}

describe("hmacSha256", () => {
  test("gives RFC 4231's known answer", async () => {
    expect(hex(await hmacSha256(RFC_4231_KEY, RFC_4231_MESSAGE))).toBe(
      RFC_4231_HMAC_SHA256,
    );
  });
});

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
