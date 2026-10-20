import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { readInvitation, sendInvitation } from "@/accounts/invitations.ts";
import { findUserByEmail } from "@/accounts/users-store.ts";
import { sendInvitationAction } from "@/app/(workspace)/invitations/actions.ts";
import InvitationsPage from "@/app/(workspace)/invitations/page.tsx";
import { signUpAction } from "@/app/signup/actions.ts";
import { getDb } from "@/db/client.ts";
import { invitations } from "@/db/tables/invitations.ts";
import type { EmailMessage } from "@/email/email-message.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { lapsed, signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";
import {
  adminUser,
  cleanInvitations,
  invitationForm,
  newRecipient,
  setupToken,
} from "./invitations-test-kit.ts";

const delivery = vi.hoisted(() => ({
  sendEmail: vi.fn<(message: EmailMessage) => Promise<void>>(),
}));
vi.mock("@/email/send-email.ts", () => delivery);
vi.mock("next/headers", async () => {
  const { sessionCookies } = await import(
    "../test-database/session-test-kit.ts"
  );
  return {
    cookies: sessionCookies,
    headers: (): Promise<Headers> =>
      Promise.resolve(new Headers({ origin: "http://localhost:3494" })),
  };
});
const IDLE = { kind: "idle" } as const;
const REQUEST_HEADERS = new Headers({ origin: "http://localhost:3494" });
async function invite(email: string): Promise<string> {
  await sendInvitation(email, REQUEST_HEADERS);
  const [message] = delivery.sendEmail.mock.lastCall ?? [];
  return setupToken(message?.text ?? "");
}

beforeEach(() => {
  delivery.sendEmail.mockReset().mockResolvedValue();
});
afterEach(async () => {
  await cleanInvitations();
  vi.restoreAllMocks();
});

describe("invitation authorization and failures", () => {
  test("ordinary users cannot open the page or issue invitations", async () => {
    const email = await newRecipient();
    await signIn(await testUser());
    await expectNotFound(InvitationsPage);
    await expectNotFound(() =>
      sendInvitationAction(IDLE, invitationForm(email)),
    );
    expect(delivery.sendEmail).not.toHaveBeenCalled();
    expect(
      await getDb()
        .select()
        .from(invitations)
        .where(eq(invitations.email, email)),
    ).toEqual([]);
  });

  test.each(["signed out", "expired", "revoked"])(
    "%s sessions must sign in before the page or action",
    async (state) => {
      const email = await newRecipient();
      const user = await testUser();
      if (state === "expired") {
        await lapsed(user);
      }
      if (state === "revoked") {
        await signIn({ ...user, sessionEpoch: user.sessionEpoch + 1 });
      }
      await expectRedirect(InvitationsPage, "/login");
      await expectRedirect(
        () => sendInvitationAction(IDLE, invitationForm(email)),
        "/login",
      );
      expect(delivery.sendEmail).not.toHaveBeenCalled();
      expect(
        await getDb()
          .select()
          .from(invitations)
          .where(eq(invitations.email, email)),
      ).toEqual([]);
    },
  );
});

describe("recipient validation", () => {
  test.each(["", "not an email"])(
    "invalid recipient %s sends nothing",
    async (email) => {
      await signIn(await adminUser());
      expect(
        await sendInvitationAction(IDLE, invitationForm(email)),
      ).toMatchObject({
        kind: "invalid",
        message: INVITATIONS_COPY.needsEmail,
      });
      expect(delivery.sendEmail).not.toHaveBeenCalled();
      expect(
        await getDb()
          .select()
          .from(invitations)
          .where(eq(invitations.email, email)),
      ).toEqual([]);
    },
  );
});

describe("send failures and legacy sign-up", () => {
  test("failed delivery is reported, leaves the previous invitation usable, and permits retry", async () => {
    const email = await newRecipient();
    const old = await invite(email);
    await signIn(await adminUser());
    spyOnErrorLog();
    delivery.sendEmail.mockRejectedValueOnce(new Error("delivery rejected"));
    expect(
      await sendInvitationAction(IDLE, invitationForm(email)),
    ).toMatchObject({
      kind: "error",
      message: INVITATIONS_COPY.failed,
    });
    expect(await readInvitation(old, new Date())).toBe(email);
    const [failedMessage] = delivery.sendEmail.mock.lastCall ?? [];
    expect(
      await readInvitation(setupToken(failedMessage?.text ?? ""), new Date()),
    ).toBeUndefined();
    expect(await findUserByEmail(email)).toBeUndefined();
    expect(
      await sendInvitationAction(IDLE, invitationForm(email)),
    ).toMatchObject({
      kind: "sent",
    });
    expect(await readInvitation(old, new Date())).toBeUndefined();
  });

  test("legacy shared-code submissions never create accounts or send emails", async () => {
    const email = await newRecipient();
    const data = invitationForm(email);
    data.set("inviteCode", "the former code");
    expect(await signUpAction(IDLE, data)).toMatchObject({ kind: "error" });
    expect(await findUserByEmail(email)).toBeUndefined();
    expect(delivery.sendEmail).not.toHaveBeenCalled();
  });
});
