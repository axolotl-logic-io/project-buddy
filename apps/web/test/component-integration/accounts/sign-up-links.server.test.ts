import { eq, inArray } from "drizzle-orm";
import { afterEach, expect, test, vi } from "vitest";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import {
  readSignInLinkUser,
  requestSignInLink,
} from "@/accounts/sign-in-links.ts";
import {
  confirmSignUp,
  readSignUpEmail,
  sendSignUpLink,
} from "@/accounts/sign-up-links.ts";
import { endEverySession, findUserByEmail } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { signUpLinks } from "@/db/tables/sign-up-links.ts";
import { users } from "@/db/tables/users.ts";
import { goldInMicroUsd, STARTING_GOLD } from "@/gold/gold.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import {
  createTestAccount,
  testUser,
} from "../../support/test-database/user-test-kit.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import {
  continueSignIn,
  type SendEmail,
} from "../test-database/sign-in-link-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);
const SIGN_IN_LINK = /https?:\/\/\S+\/login\/link\?token=[\w-]+/u;
const TOKEN_LENGTH = 43;
const LIFETIME_MS = 1_800_000;
const ORIGIN = "http://localhost:3494";
const addresses: string[] = [];

function newAddress(): string {
  const email = `signup-${crypto.randomUUID()}@example.test`;
  addresses.push(email);
  return email;
}

function emailedToken(): string {
  const [message] = sent.sendEmail.mock.lastCall ?? [];
  const [link = ""] = SIGN_IN_LINK.exec(message?.text ?? "") ?? [];
  return new URL(link).searchParams.get("token") ?? "";
}

async function request(email: string): Promise<string> {
  await requestSignInLink({
    email,
    requestHeaders: new Headers({
      origin: ORIGIN,
      "x-forwarded-for": email.trim().toLowerCase(),
    }),
  });
  await afterTasksDone();
  return emailedToken();
}

afterEach(async () => {
  vi.useRealTimers();
  await afterTasksDone();
  const made = addresses.splice(0);
  if (made.length > 0) {
    await getDb().delete(signUpLinks).where(inArray(signUpLinks.email, made));
    await getDb().delete(users).where(inArray(users.email, made));
    await Promise.all(
      made.map((address) =>
        Promise.all([
          endRateLimitWindowsFor({ address }),
          endRateLimitWindowsFor({ clientKey: address }),
        ]),
      ),
    );
  }
  sent.sendEmail.mockReset();
});

test("public verification creates one ordinary account only after confirmation", async () => {
  const email = newAddress();
  const token = await request(` ${email.toUpperCase()} `);
  expect(await findUserByEmail(email)).toBeUndefined();
  expect(await readSignUpEmail(token, new Date())).toBe(email);
  expect(await readSignInLinkUser(token, new Date())).toBeUndefined();
  expect(await findUserByEmail(email)).toBeUndefined();
  await continueSignIn(token);
  const user = await findUserByEmail(email);
  expect(user?.role).toBe("user");
  if (user === undefined) {
    throw new Error("No verified account was created");
  }
  expect(await readGoldBalance(user.id)).toBe(goldInMicroUsd(STARTING_GOLD));
  expect(await confirmSignUp(token, new Date())).toBeUndefined();
});

test("a new request replaces verification, and links expire at thirty minutes", async () => {
  const email = newAddress();
  const now = new Date();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const oldToken = await request(email);
  const token = await request(email);
  expect(await readSignUpEmail(oldToken, now)).toBeUndefined();
  expect(await confirmSignUp(oldToken, now)).toBeUndefined();
  expect(
    await readSignUpEmail(token, new Date(now.getTime() + LIFETIME_MS - 1)),
  ).toBe(email);
  expect(
    await readSignUpEmail(token, new Date(now.getTime() + LIFETIME_MS)),
  ).toBeUndefined();
  expect(
    await confirmSignUp(token, new Date(now.getTime() + LIFETIME_MS)),
  ).toBeUndefined();
  expect(await findUserByEmail(email)).toBeUndefined();
});

test.each(["", "malformed", "a".repeat(TOKEN_LENGTH)])(
  "invalid or unknown verification %s creates nothing",
  async (token) => {
    expect(await readSignUpEmail(token, new Date())).toBeUndefined();
    expect(await confirmSignUp(token, new Date())).toBeUndefined();
  },
);

test("concurrent confirmations consume verification once and grant batteries once", async () => {
  const email = newAddress();
  const token = await request(email);
  const confirmed = await Promise.all([
    confirmSignUp(token, new Date()),
    confirmSignUp(token, new Date()),
  ]);
  expect(confirmed.filter((value) => value !== undefined)).toHaveLength(1);
  const rows = await getDb().select().from(users).where(eq(users.email, email));
  expect(rows).toHaveLength(1);
  const user = await findUserByEmail(email);
  if (user === undefined) {
    throw new Error("No verified account was created");
  }
  expect(await readGoldBalance(user.id)).toBe(goldInMicroUsd(STARTING_GOLD));
});

test("a signup request for an existing account preserves its identity and balance", async () => {
  const user = await testUser();
  const before = await readGoldBalance(user.id);
  const token = await request(user.email);
  expect((await readSignInLinkUser(token, new Date()))?.id).toBe(user.id);
  expect(await readSignUpEmail(token, new Date())).toBeUndefined();
  await continueSignIn(token);
  expect(await findUserByEmail(user.email)).toEqual(user);
  expect(await readGoldBalance(user.id)).toBe(before);
  await endRateLimitWindowsFor({ address: user.email });
  await endRateLimitWindowsFor({ clientKey: user.email });
});

test("verification returns the same account if it was created before confirmation", async () => {
  const email = newAddress();
  const token = await request(email);
  const existing = await createTestAccount(email);
  expect((await confirmSignUp(token, new Date()))?.id).toBe(existing.id);
  expect(await findUserByEmail(email)).toEqual(existing);
});

test("signing out everywhere revokes pending verification for that account", async () => {
  const user = await testUser();
  await sendSignUpLink(user.email, ORIGIN);
  const token = emailedToken();
  await endEverySession(user.id);
  expect(await confirmSignUp(token, new Date())).toBeUndefined();
});

test("sign-up requests share the public email request limits", async () => {
  const email = newAddress();
  await request(email);
  await request(email);
  await request(email);
  sent.sendEmail.mockClear();
  await requestSignInLink({
    email,
    requestHeaders: new Headers({
      origin: ORIGIN,
      "x-forwarded-for": email.trim().toLowerCase(),
    }),
  });
  await afterTasksDone();
  expect(sent.sendEmail).not.toHaveBeenCalled();
  expect(await findUserByEmail(email)).toBeUndefined();
});
