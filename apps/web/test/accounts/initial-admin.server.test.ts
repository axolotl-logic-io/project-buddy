import { eq } from "drizzle-orm";
import { expect, test, vi } from "vitest";
import { requestLoginLink } from "@/accounts/login-links.ts";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import { findUserByEmail } from "@/accounts/users-store.ts";
import InvitationsPage from "@/app/(workspace)/invitations/page.tsx";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import { currentUser } from "@/auth/current-user.ts";
import { getDb } from "@/db/client.ts";
import { loginLinks } from "@/db/tables/users.ts";
import type { EmailMessage } from "@/email/email-message.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";

const sent = vi.hoisted(() => ({
  sendEmail: vi.fn<(message: EmailMessage) => Promise<void>>(),
}));
vi.mock("@/email/send-email.ts", () => sent);
const LOGIN_LINK = /https?:\/\/\S+\/login\/link\?token=[\w-]+/u;
const ADMIN_EMAIL = "me@modestprogress.com";
const CLIENT = "initial-admin-test";

test("the initial admin must prove ownership by normal emailed-link confirmation before using invitations", async () => {
  const admin = await findUserByEmail(ADMIN_EMAIL);
  expect(admin?.role).toBe("admin");
  expect(await currentUser()).toBeUndefined();
  try {
    await expectRedirect(InvitationsPage, "/login");
    await requestLoginLink({
      email: ` ${ADMIN_EMAIL.toUpperCase()} `,
      requestHeaders: new Headers({
        origin: "http://localhost:3494",
        "x-forwarded-for": CLIENT,
      }),
    });
    await afterTasksDone();
    const [message] = sent.sendEmail.mock.lastCall ?? [];
    expect(message?.to).toBe(ADMIN_EMAIL);
    const [url = ""] = LOGIN_LINK.exec(message?.text ?? "") ?? [];
    const token = new URL(url).searchParams.get("token") ?? "";
    expect(await currentUser()).toBeUndefined();
    const data = new FormData();
    data.set("token", token);
    await expectRedirect(() => continueSignInAction(data), "/");
    expect((await currentUser())?.id).toBe(admin?.id);
    expect((await currentUser())?.role).toBe("admin");
    expect(await InvitationsPage()).toBeDefined();
  } finally {
    if (admin !== undefined) {
      await getDb().delete(loginLinks).where(eq(loginLinks.userId, admin.id));
    }
    await endRateLimitWindowsFor({ address: ADMIN_EMAIL });
    await endRateLimitWindowsFor({ clientKey: CLIENT });
  }
});
