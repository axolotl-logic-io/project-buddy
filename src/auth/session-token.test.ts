// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type SessionUser,
  sessionCookie,
} from "@/auth/session-token.ts";
import { userIdFixture } from "@/id-fixtures.ts";

const MS_PER_SECOND = 1000;
const secret = "test-session-secret";
const issuedAt = new Date("2026-10-10T12:00:00Z");
const user: SessionUser = {
  id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
  sessionEpoch: 3,
};
const BASE64URL_SHA256 = /^[\w-]{43}$/u;
const expiresAtMs: number =
  issuedAt.getTime() + SESSION_MAX_AGE_SECONDS * MS_PER_SECOND;

// The token's four dot-separated parts.
async function tokenParts(): Promise<string[]> {
  return (await createSessionToken(user, secret, issuedAt)).split(".");
}

describe("session tokens", () => {
  test("hold the user id, the epoch, the expiry and a base64url signature", async () => {
    const [id, epoch, expiry, signature, ...rest] = await tokenParts();

    expect([id, epoch, expiry]).toEqual([user.id, "3", String(expiresAtMs)]);
    expect(signature).toMatch(BASE64URL_SHA256);
    expect(rest).toEqual([]);
  });

  test("read back as their user and epoch before they expire", async () => {
    const token = await createSessionToken(user, secret, issuedAt);

    expect(await readSessionToken(token, secret, issuedAt)).toEqual(user);
  });

  test("read as nothing when signed with a different secret", async () => {
    const token = await createSessionToken(user, "other-secret", issuedAt);

    expect(await readSessionToken(token, secret, issuedAt)).toBeUndefined();
  });

  test("read as nothing once they expire", async () => {
    const token = await createSessionToken(user, secret, issuedAt);

    expect(
      await readSessionToken(token, secret, new Date(expiresAtMs)),
    ).toBeUndefined();
  });

  test.each([
    ["user", 0, userIdFixture()],
    ["epoch", 1, "4"],
    ["expiry", 2, String(Date.parse("2099-01-01"))],
  ])(
    "read as nothing when their %s was changed",
    async (_part, index, value) => {
      const parts = await tokenParts();
      parts[index] = value;

      expect(
        await readSessionToken(parts.join("."), secret, issuedAt),
      ).toBeUndefined();
    },
  );
});

describe("malformed session tokens", () => {
  test.each([
    ["missing", undefined],
    ["empty", ""],
    ["a word", "not-a-token"],
    [
      "in the format before accounts",
      "1794225600000.sJGPCn217JcEiQA6cPfJpgm1qkdSl7G3I1a8b5i_wKM",
    ],
    ["with a fifth part", `${user.id}.3.${expiresAtMs}.sig.extra`],
    ["with a negative epoch", `${user.id}.-1.${expiresAtMs}.sig`],
    ["with a fractional expiry", `${user.id}.3.1.5.sig`],
    ["with an empty signature", `${user.id}.3.${expiresAtMs}.`],
  ])("read as nothing when %s", async (_description, token) => {
    expect(await readSessionToken(token, secret, issuedAt)).toBeUndefined();
  });
});

describe("sessionCookie", () => {
  test("is a Secure, HttpOnly, Lax session cookie for the whole site that lasts 30 days", async () => {
    const cookie = await sessionCookie(user, secret, issuedAt);

    expect(cookie).toEqual({
      name: SESSION_COOKIE_NAME,
      value: await createSessionToken(user, secret, issuedAt),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 2_592_000,
    });
    expect(await readSessionToken(cookie.value, secret, issuedAt)).toEqual(
      user,
    );
  });
});
