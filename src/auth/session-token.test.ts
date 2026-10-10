// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  isValidSessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "@/auth/session-token";

const secret = "test-session-secret";
const issuedAt = new Date("2026-10-10T12:00:00Z");

describe("session tokens", () => {
  it("accepts a token signed with the same secret before it expires", () => {
    const token = createSessionToken(secret, issuedAt);

    expect(isValidSessionToken(token, secret, issuedAt)).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("other-secret", issuedAt);

    expect(isValidSessionToken(token, secret, issuedAt)).toBe(false);
  });

  it("rejects a token after it expires", () => {
    const token = createSessionToken(secret, issuedAt);
    const afterExpiry = new Date(
      issuedAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000 + 1,
    );

    expect(isValidSessionToken(token, secret, afterExpiry)).toBe(false);
  });

  it("rejects a token whose expiry was changed", () => {
    const [, signature] = createSessionToken(secret, issuedAt).split(".");
    const forged = `${Date.parse("2099-01-01")}.${signature}`;

    expect(isValidSessionToken(forged, secret, issuedAt)).toBe(false);
  });

  it("rejects a missing or malformed token", () => {
    expect(isValidSessionToken(undefined, secret, issuedAt)).toBe(false);
    expect(isValidSessionToken("", secret, issuedAt)).toBe(false);
    expect(isValidSessionToken("not-a-token", secret, issuedAt)).toBe(false);
  });
});
