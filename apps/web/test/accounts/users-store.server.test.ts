// The user store against the test database: which rows its reads find, and
// what ending every session leaves. users-store.test.ts reads rows as
// users.
import { expect, test, vi } from "vitest";
import { readLoginLinkUser } from "@/accounts/login-links.ts";
import {
  endEverySession,
  findUserByEmail,
  readSessionUser,
} from "@/accounts/users-store.ts";
import {
  emailedLoginToken,
  type SendEmail,
} from "../test-database/login-link-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

test("an account is found by its address in any case, with spaces around", async () => {
  const user = await testUser();

  expect((await findUserByEmail(` ${user.email.toUpperCase()}\n`))?.id).toBe(
    user.id,
  );
});

test("endEverySession ends the user's sessions and sign-in links, and no one else's", async () => {
  const [user, other] = [await testUser(), await testUser()];
  const token = await emailedLoginToken(user, sent.sendEmail);
  const otherToken = await emailedLoginToken(other, sent.sendEmail);

  await endEverySession(user.id);

  expect(await readSessionUser(user.id, user.sessionEpoch)).toBeUndefined();
  expect(await readLoginLinkUser(token, new Date())).toBeUndefined();
  expect((await readSessionUser(other.id, other.sessionEpoch))?.id).toBe(
    other.id,
  );
  expect((await readLoginLinkUser(otherToken, new Date()))?.user.id).toBe(
    other.id,
  );
});
