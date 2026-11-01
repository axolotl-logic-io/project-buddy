// Signing in by an emailed link in a server test, as the sign-in page and
// the link's page do: requestSignInLink saves a link and emails it, and
// continueSignInAction signs this test's browser in with its token. The test
// file mocks the email service and passes the mock in:
//   const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
//   vi.mock("@/email/send-email.ts", () => sent);
import type { Mock } from "vitest";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import { requestSignInLink } from "@/accounts/sign-in-links.ts";
import type { User } from "@/accounts/users-store.ts";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import type { EmailMessage } from "@/email/email-message.ts";
import { HOME_PATH } from "@/routes.ts";
import { afterTasksDone } from "./after-test-kit.ts";
import { expectRedirect } from "./navigation-test-kit.ts";

type SendEmail = (message: EmailMessage) => Promise<void>;

const SITE = "http://localhost:3494";
const SIGN_IN_LINK = /https?:\/\/\S+\/login\/link\?token=[\w-]+/u;

// Asks for a sign-in link to user, from a client of its own, and answers
// the token of the link emailed to them.
async function emailedLoginToken(
  user: User,
  sendEmail: Mock<SendEmail>,
): Promise<string> {
  const clientKey = `login-link-${crypto.randomUUID()}`;
  try {
    await requestSignInLink({
      email: user.email,
      requestHeaders: new Headers({
        origin: SITE,
        "x-forwarded-for": clientKey,
      }),
    });
    await afterTasksDone();
  } finally {
    await endRateLimitWindowsFor({ clientKey });
  }
  const [message] = sendEmail.mock.lastCall ?? [];
  if (message?.to !== user.email) {
    throw new Error(`No sign-in link was emailed to ${user.email}`);
  }
  const [url = ""] = SIGN_IN_LINK.exec(message.text) ?? [];
  return new URL(url).searchParams.get("token") ?? "";
}

// Continues signing in with the link's token, which lands on the new chat page.
async function continueSignIn(token: string): Promise<void> {
  const form = new FormData();
  form.set("token", token);
  await expectRedirect(() => continueSignInAction(form), HOME_PATH);
}

export type { SendEmail };
export { continueSignIn, emailedLoginToken };
