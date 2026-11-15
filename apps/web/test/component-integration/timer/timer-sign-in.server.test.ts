// A timer link opened while signed out, against the test database: the
// sign-in page names the link as its destination, and the emailed sign-in
// link leads back to it once continued.
import { NextRequest } from "next/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import { requestSignInLink } from "@/accounts/sign-in-links.ts";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import { proxy } from "@/proxy.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

const SITE = "http://localhost:3494";
const TIMER_LINK = "/timer/25/15/1763197200000";
const LINK = /https?:\/\/\S+\/login\/link\?\S+/u;

afterEach(() => {
  vi.unstubAllEnvs();
});

// Where the proxy sends a signed-out request for path.
async function signedOutRedirect(path: string): Promise<string | null> {
  vi.stubEnv("SESSION_SECRET", "timer-test-session-secret");
  const response = await proxy(new NextRequest(`${SITE}${path}`));
  return response.headers.get("location");
}

describe("use_case_timer_join_link", () => {
  test("a signed-out timer link leads to sign-in and back to the same schedule", async () => {
    expect(await signedOutRedirect(TIMER_LINK)).toBe(
      `${SITE}/login?next=${encodeURIComponent(TIMER_LINK)}`,
    );

    const user = await testUser();
    const clientKey = `timer-link-${crypto.randomUUID()}`;
    try {
      await requestSignInLink({
        email: user.email,
        requestHeaders: new Headers({
          origin: SITE,
          "x-forwarded-for": clientKey,
        }),
        destination: TIMER_LINK,
      });
      await afterTasksDone();
    } finally {
      await endRateLimitWindowsFor({ clientKey });
    }
    const [message] = sent.sendEmail.mock.lastCall ?? [];
    const [href = ""] = LINK.exec(message?.text ?? "") ?? [];
    const url = new URL(href);
    expect(url.searchParams.get("next")).toBe(TIMER_LINK);

    const form = new FormData();
    form.set("token", url.searchParams.get("token") ?? "");
    form.set("next", TIMER_LINK);
    await expectRedirect(() => continueSignInAction(form), TIMER_LINK);
  });

  test("other signed-out pages, and a link that names no schedule, lead to plain sign-in", async () => {
    expect(await signedOutRedirect("/quests")).toBe(`${SITE}/login`);
    expect(await signedOutRedirect("/timer")).toBe(`${SITE}/login`);
    expect(await signedOutRedirect("/timer/25/16/0")).toBe(`${SITE}/login`);
  });
});
