// Registered by rate-limits.server.test.ts to share one cleanup clock.
import { eq } from "drizzle-orm";
import { expect, test, vi } from "vitest";
import { countLoginLinkRequest } from "@/accounts/rate-limits.ts";
import { sendInvitationAction } from "@/app/(workspace)/invitations/actions.ts";
import { getDb } from "@/db/client.ts";
import { rateLimits } from "@/db/tables/rate-limits.ts";
import { sendEmail } from "@/email/send-email.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";
import {
  adminUser,
  invitationForm,
  newRecipient,
} from "./invitations-test-kit.ts";

const IDLE = { kind: "idle" } as const;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const ADMIN_BUDGET = 20;
const NEARLY_FULL_BUDGET: number = ADMIN_BUDGET - 1;
const TOTAL_RECIPIENTS: number = ADMIN_BUDGET + 2;
const PUBLIC_PAIR_LIMIT = 3;

test("use_case_admin_invites", async () => {
  const admin = await adminUser();
  await signIn(admin);
  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  const recipients = await Promise.all(
    Array.from({ length: TOTAL_RECIPIENTS }, () => newRecipient()),
  );
  const initial = await Promise.all(
    recipients
      .slice(0, NEARLY_FULL_BUDGET)
      .map((address) => sendInvitationAction(IDLE, invitationForm(address))),
  );
  expect(initial.every(({ kind }) => kind === "sent")).toBe(true);
  const outcomes = await Promise.all(
    recipients
      .slice(NEARLY_FULL_BUDGET)
      .map((address) => sendInvitationAction(IDLE, invitationForm(address))),
  );
  expect(outcomes.filter(({ kind }) => kind === "sent")).toHaveLength(1);
  expect(outcomes.filter(({ kind }) => kind === "error")).toHaveLength(2);
  expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(ADMIN_BUDGET);
  const email = await newRecipient();
  expect(await sendInvitationAction(IDLE, invitationForm(email))).toMatchObject(
    { kind: "error", message: INVITATIONS_COPY.limited },
  );
  // An exhausted admin does not spend a different admin's budget, nor claim
  // a cooldown for a refused recipient.
  await signIn(await adminUser());
  expect(await sendInvitationAction(IDLE, invitationForm(email))).toMatchObject(
    { kind: "sent" },
  );
  await signIn(admin);
  clock.mockReturnValue(now + HOUR_MS - 1);
  const retry = await newRecipient();
  expect(await sendInvitationAction(IDLE, invitationForm(retry))).toMatchObject(
    { kind: "error" },
  );
  clock.mockReturnValue(now + HOUR_MS);
  expect(await sendInvitationAction(IDLE, invitationForm(retry))).toMatchObject(
    { kind: "sent" },
  );
  expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(TOTAL_RECIPIENTS);
});

test.each(["new", "existing"])(
  "the normalized recipient cooldown applies across admins to %s accounts and expires at exactly one minute",
  async (kind) => {
    let email = await newRecipient();
    if (kind === "existing") {
      ({ email } = await testUser());
    }
    const admin = await adminUser();
    await signIn(admin);
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    expect(
      await sendInvitationAction(IDLE, invitationForm(email)),
    ).toMatchObject({ kind: "sent" });
    await signIn(await adminUser());
    clock.mockReturnValue(now + MINUTE_MS - 1);
    expect(
      await sendInvitationAction(
        IDLE,
        invitationForm(` ${email.toUpperCase()} `),
      ),
    ).toMatchObject({ kind: "error", message: INVITATIONS_COPY.limited });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    clock.mockReturnValue(now + MINUTE_MS);
    expect(
      await sendInvitationAction(IDLE, invitationForm(email)),
    ).toMatchObject({ kind: "sent" });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2);
  },
);

test.each(["new", "existing"])(
  "a rejected send to a %s account releases both the last budget slot and the recipient cooldown for immediate retry",
  async (kind) => {
    let email = await newRecipient();
    if (kind === "existing") {
      ({ email } = await testUser());
    }
    const admin = await adminUser();
    await signIn(admin);
    // Arrange the last slot in the real database; the preceding test proves
    // that actual successful sends fill the budget.
    await getDb()
      .insert(rateLimits)
      .values({
        key: `invitation-admin:${admin.id}`,
        count: NEARLY_FULL_BUDGET,
        windowStartedAt: new Date(),
      });
    spyOnErrorLog();
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("delivery rejected"));
    expect(
      await sendInvitationAction(IDLE, invitationForm(email)),
    ).toMatchObject({ kind: "error", message: INVITATIONS_COPY.failed });
    expect(
      await sendInvitationAction(IDLE, invitationForm(email)),
    ).toMatchObject({ kind: "sent" });
    expect(
      await sendInvitationAction(IDLE, invitationForm(await newRecipient())),
    ).toMatchObject({ kind: "error", message: INVITATIONS_COPY.limited });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2);
    const [budget] = await getDb()
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, `invitation-admin:${admin.id}`));
    expect(budget?.count).toBe(ADMIN_BUDGET);
  },
);

test("public sign-in accounting and invitation accounting do not spend each other's limits", async () => {
  const user = await testUser();
  const admin = await adminUser();
  await signIn(admin);
  const now = new Date();
  const client = `invitation-test-${admin.id}`;
  const publicRequests = await Promise.all(
    Array.from({ length: PUBLIC_PAIR_LIMIT }, () =>
      countLoginLinkRequest(user.email, client, now),
    ),
  );
  expect(publicRequests).toEqual([true, true, true]);
  expect(await countLoginLinkRequest(user.email, client, now)).toBe(false);
  expect(
    await sendInvitationAction(IDLE, invitationForm(user.email)),
  ).toMatchObject({ kind: "sent" });
  expect(
    await sendInvitationAction(IDLE, invitationForm(user.email)),
  ).toMatchObject({ kind: "error" });
  expect(await countLoginLinkRequest(user.email, `${client}-other`, now)).toBe(
    true,
  );
  expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
});

test("an in-flight send holds its recipient cooldown against concurrent submissions", async () => {
  await signIn(await adminUser());
  const email = await newRecipient();
  const started = Promise.withResolvers<void>();
  const accepted = Promise.withResolvers<void>();
  vi.mocked(sendEmail).mockImplementationOnce(() => {
    started.resolve();
    return accepted.promise;
  });
  const sending = sendInvitationAction(IDLE, invitationForm(email));
  try {
    await Promise.race([
      started.promise,
      sending.then((): never => {
        throw new Error("Send completed without delivery");
      }),
    ]);
    expect(
      await sendInvitationAction(IDLE, invitationForm(email)),
    ).toMatchObject({ kind: "error", message: INVITATIONS_COPY.limited });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
  } finally {
    accepted.resolve();
    expect(await sending).toMatchObject({ kind: "sent" });
  }
});
