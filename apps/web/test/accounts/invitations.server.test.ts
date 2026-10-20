import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  acceptInvitation,
  readInvitation,
  sendInvitation,
} from "@/accounts/invitations.ts";
import { findUserByEmail, readSessionUser } from "@/accounts/users-store.ts";
import { sendInvitationAction } from "@/app/(workspace)/invitations/actions.ts";
import InvitationsPage from "@/app/(workspace)/invitations/page.tsx";
import { confirmSetupAction } from "@/app/setup/actions.ts";
import SetupPage from "@/app/setup/page.tsx";
import { currentUser } from "@/auth/current-user.ts";
import { getDb } from "@/db/client.ts";
import { invitations } from "@/db/tables/invitations.ts";
import type { EmailMessage } from "@/email/email-message.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn, signOut } from "../test-database/session-test-kit.ts";
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
const LIFETIME_MS = 1_800_000;
const EXPIRY_MARGIN_MS = 1000;
const TOKEN_LENGTH = 43;

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

describe("invitation lifecycle", () => {
  test("admin sends a fixed-address setup link; opening it creates no account or session; confirmation signs in once", async () => {
    const admin = await adminUser();
    const email = await newRecipient();
    await signIn(admin);
    expect(await InvitationsPage()).toBeDefined();
    expect(
      await sendInvitationAction(
        IDLE,
        invitationForm(` ${email.toUpperCase()} `),
      ),
    ).toMatchObject({ kind: "sent", message: INVITATIONS_COPY.sent });
    const [message] = delivery.sendEmail.mock.lastCall ?? [];
    expect(message?.to).toBe(email);
    const token = setupToken(message?.text ?? "");
    signOut();
    expect(
      await SetupPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ token }),
      }),
    ).toBeDefined();
    expect(await readInvitation(token, new Date())).toBe(email);
    expect(await findUserByEmail(email)).toBeUndefined();
    expect(await currentUser()).toBeUndefined();
    const confirmation = invitationForm("different@example.test");
    confirmation.set("token", token);
    await expectRedirect(() => confirmSetupAction(confirmation), "/");
    const created = await findUserByEmail(email);
    expect(created?.role).toBe("user");
    expect((await currentUser())?.id).toBe(created?.id);
    expect(await findUserByEmail("different@example.test")).toBeUndefined();
    expect(await readInvitation(token, new Date())).toBeUndefined();
    signOut();
    await expectRedirect(
      () => confirmSetupAction(confirmation),
      `/setup?token=${token}`,
    );
    expect(await currentUser()).toBeUndefined();
    expect((await findUserByEmail(email))?.id).toBe(created?.id);
  });
});

describe("concurrent acceptance", () => {
  test("two concurrent confirmations create exactly one account and return only one session grant", async () => {
    const email = await newRecipient();
    const token = await invite(email);
    const outcomes = await Promise.all([
      acceptInvitation(token, new Date()),
      acceptInvitation(token, new Date()),
    ]);
    const grants = outcomes.filter((result) => result !== undefined);
    expect(grants).toHaveLength(1);
    expect(outcomes.filter((result) => result === undefined)).toHaveLength(1);
    expect((await findUserByEmail(email))?.id).toBe(grants[0]?.id);
    expect(await acceptInvitation(token, new Date())).toBeUndefined();
  });
});

describe("replacement and expiry", () => {
  test("replacement invalidates the old token and gives a fresh lifetime", async () => {
    const email = await newRecipient();
    const old = await invite(email);
    await getDb()
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() + LIFETIME_MS / 2) })
      .where(eq(invitations.email, email));
    expect(await readInvitation(old, new Date())).toBe(email);
    const fresh = await invite(email);
    expect(fresh).not.toBe(old);
    expect(await acceptInvitation(old, new Date())).toBeUndefined();
    expect(
      await readInvitation(
        fresh,
        new Date(Date.now() + LIFETIME_MS - EXPIRY_MARGIN_MS),
      ),
    ).toBe(email);
    expect(await acceptInvitation(fresh, new Date())).toBeDefined();
  });

  test("an invitation at exactly 30 minutes is expired, even on direct submission", async () => {
    const email = await newRecipient();
    const beforeSend = Date.now();
    const token = await invite(email);
    const [row] = await getDb()
      .select()
      .from(invitations)
      .where(eq(invitations.email, email));
    expect(row).toBeDefined();
    const boundary = row?.expiresAt ?? new Date(0);
    expect(boundary.getTime()).toBeGreaterThanOrEqual(beforeSend + LIFETIME_MS);
    expect(boundary.getTime()).toBeLessThanOrEqual(Date.now() + LIFETIME_MS);
    expect(await readInvitation(token, new Date(boundary.getTime() - 1))).toBe(
      email,
    );
    expect(await readInvitation(token, boundary)).toBeUndefined();
    expect(await acceptInvitation(token, boundary)).toBeUndefined();
    expect(await findUserByEmail(email)).toBeUndefined();
  });
});

describe("use_case_invitation_unusable", () => {
  test.each(["", "bad", "x".repeat(TOKEN_LENGTH)])(
    "invalid or unknown token %s cannot create an account or sign in",
    async (token) => {
      expect(await readInvitation(token, new Date())).toBeUndefined();
      expect(await acceptInvitation(token, new Date())).toBeUndefined();
      expect(await currentUser()).toBeUndefined();
    },
  );

  test("an altered token grants nothing and leaves the original bound to its recipient", async () => {
    const email = await newRecipient();
    const token = await invite(email);
    let altered = `x${token.slice(1)}`;
    if (token.startsWith("x")) {
      altered = `y${token.slice(1)}`;
    }
    expect(await readInvitation(altered, new Date())).toBeUndefined();
    expect(await acceptInvitation(altered, new Date())).toBeUndefined();
    expect(await findUserByEmail(email)).toBeUndefined();
    expect(await readInvitation(token, new Date())).toBe(email);
  });
});

describe("existing accounts", () => {
  test("existing accounts get a normal login link without any account changes", async () => {
    const user = await testUser();
    await sendInvitation(` ${user.email.toUpperCase()} `, REQUEST_HEADERS);
    const [message] = delivery.sendEmail.mock.lastCall ?? [];
    expect(message?.to).toBe(user.email);
    expect(message?.text).toContain("/login/link?token=");
    expect(await findUserByEmail(user.email)).toEqual(user);
    expect(
      await getDb()
        .select()
        .from(invitations)
        .where(eq(invitations.email, user.email)),
    ).toEqual([]);
    expect(await readSessionUser(user.id, user.sessionEpoch)).toEqual(user);
  });
});
