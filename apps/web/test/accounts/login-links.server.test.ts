// A sign-in link's lifetime, against the test database: the link
// requestLoginLink saves and emails reads as its user for 30 minutes, and
// then as nothing. login-links.test.ts checks the email itself.
import { afterEach, expect, test, vi } from "vitest";
import {
  LOGIN_LINK_LIFETIME_MINUTES,
  readLoginLinkUser,
} from "@/accounts/login-links.ts";
import {
  emailedLoginToken,
  type SendEmail,
} from "../test-database/login-link-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

const MS_PER_MINUTE = 60_000;

afterEach(() => {
  vi.useRealTimers();
});

test("a sign-in link signs its user in for 30 minutes, and then not", async () => {
  const user = await testUser();
  const sentAt = new Date();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(sentAt);
  const token = await emailedLoginToken(user, sent.sendEmail);
  const expiry = sentAt.getTime() + LOGIN_LINK_LIFETIME_MINUTES * MS_PER_MINUTE;

  expect((await readLoginLinkUser(token, new Date(expiry - 1)))?.user.id).toBe(
    user.id,
  );
  expect(await readLoginLinkUser(token, new Date(expiry))).toBeUndefined();
});
