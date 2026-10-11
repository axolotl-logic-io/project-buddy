import { describe, expect, test } from "vitest";
import { constantTimeEqual, hmacSha256 } from "@/auth/hmac.ts";

const SHA256_BYTES = 32;

async function signatureBytes(
  secret: string,
  message: string,
): Promise<Uint8Array> {
  return new Uint8Array(await hmacSha256(secret, message));
}

// session-token.test.ts pins the exact bytes through its known-answer token.
describe("hmacSha256", () => {
  test("signs a message the same way every time under one secret", async () => {
    const signature = await signatureBytes("secret", "message");

    expect(signature).toHaveLength(SHA256_BYTES);
    expect(await signatureBytes("secret", "message")).toEqual(signature);
  });

  test("signs differently under another secret or for another message", async () => {
    const signature = await signatureBytes("secret", "message");

    expect(await signatureBytes("other secret", "message")).not.toEqual(
      signature,
    );
    expect(await signatureBytes("secret", "other message")).not.toEqual(
      signature,
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
