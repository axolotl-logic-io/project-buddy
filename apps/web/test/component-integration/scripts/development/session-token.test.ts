// The development commands sign session tokens without the site's code, so
// these check that the site reads them as its own, and that each side
// refuses the other's tokens under a different secret.
import { expect, test } from "vitest";
import { readSessionToken as siteReads } from "@/auth/session-token.ts";
import { parseUserId } from "@/ids.ts";
import {
  createSessionToken,
  readSessionToken,
} from "../../../../scripts/development/session-token.ts";

const SECRET = "development-test-secret";
const USER = "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
const EPOCH = 3;
const NOW = new Date("2026-11-15T12:00:00Z");

test("the site reads a development token as its user and epoch", async () => {
  const token = createSessionToken(
    { id: USER, sessionEpoch: EPOCH },
    SECRET,
    NOW,
  );
  expect(await siteReads(token, SECRET, NOW)).toEqual({
    id: parseUserId(USER),
    sessionEpoch: EPOCH,
  });
  expect(await siteReads(token, `${SECRET}-other`, NOW)).toBeUndefined();
});

test("a development token reads back with its claims, and only under its secret", () => {
  const token = createSessionToken(
    { id: USER, sessionEpoch: EPOCH },
    SECRET,
    NOW,
  );
  expect(readSessionToken(token, SECRET)).toEqual({
    id: USER,
    sessionEpoch: EPOCH,
    expiresAtMs: expect.any(Number),
  });
  expect(readSessionToken(token, `${SECRET}-other`)).toBeUndefined();
  expect(readSessionToken(`${token}.extra`, SECRET)).toBeUndefined();
});
