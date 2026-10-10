// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  createSessionToken,
  isValidSessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token.ts";

const secret = "test-session-secret";
const issuedAt = new Date("2026-10-10T12:00:00Z");

// What the earlier node:crypto implementation issued for `secret` at
// `issuedAt`, so sessions signed before the switch to Web Crypto stay valid.
const NODE_CRYPTO_TOKEN =
  "1794225600000.sJGPCn217JcEiQA6cPfJpgm1qkdSl7G3I1a8b5i_wKM";

describe("session tokens", () => {
  test("keeps the token format: expiry, dot, base64url HMAC-SHA256", async () => {
    expect(await createSessionToken(secret, issuedAt)).toBe(NODE_CRYPTO_TOKEN);
  });

  test("accepts a token signed with the same secret before it expires", async () => {
    const token = await createSessionToken(secret, issuedAt);

    expect(await isValidSessionToken(token, secret, issuedAt)).toBe(true);
  });

  test("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("other-secret", issuedAt);

    expect(await isValidSessionToken(token, secret, issuedAt)).toBe(false);
  });

  test("rejects a token after it expires", async () => {
    const token = await createSessionToken(secret, issuedAt);
    const afterExpiry = new Date(
      issuedAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000 + 1,
    );

    expect(await isValidSessionToken(token, secret, afterExpiry)).toBe(false);
  });

  test("rejects a token whose expiry was changed", async () => {
    const [, signature] = (await createSessionToken(secret, issuedAt)).split(
      ".",
    );
    const forged = `${Date.parse("2099-01-01")}.${signature}`;

    expect(await isValidSessionToken(forged, secret, issuedAt)).toBe(false);
  });

  test("rejects a missing or malformed token", async () => {
    expect(await isValidSessionToken(undefined, secret, issuedAt)).toBe(false);
    expect(await isValidSessionToken("", secret, issuedAt)).toBe(false);
    expect(await isValidSessionToken("not-a-token", secret, issuedAt)).toBe(
      false,
    );
  });
});
