// A sign-in link's lifetime, against the test database: the link
// requestSignInLink saves and emails reads as its user for 30 minutes, and
// then as nothing.
import { afterEach, expect, test, vi } from "vitest";
import {
  readSignInLinkUser,
  SIGN_IN_LINK_LIFETIME_MINUTES,
} from "@/accounts/sign-in-links.ts";
import {
  emailedLoginToken,
  type SendEmail,
} from "../test-database/sign-in-link-test-kit.ts";
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
  const expiry =
    sentAt.getTime() + SIGN_IN_LINK_LIFETIME_MINUTES * MS_PER_MINUTE;

  expect((await readSignInLinkUser(token, new Date(expiry - 1)))?.user.id).toBe(
    user.id,
  );
  expect(await readSignInLinkUser(token, new Date(expiry))).toBeUndefined();
});
