// Registered by rate-limits.server.test.ts to share one cleanup clock.
import { expect, test, vi } from "vitest";
import { sendWithinInvitationLimits } from "@/accounts/invitation-send-limits.ts";
import {
  adminUser,
  newRecipient,
} from "../../support/accounts/invitations-test-kit.ts";

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const BUDGET = 20;
const OTHER_SENDS: number = BUDGET - 1;

test("concurrent admins cannot both reserve the same recipient", async () => {
  const [first, second, email] = await Promise.all([
    adminUser(),
    adminUser(),
    newRecipient(),
  ]);
  const deliver = vi.fn<() => Promise<void>>().mockResolvedValue();
  const outcomes = await Promise.all([
    sendWithinInvitationLimits(first.id, email, deliver),
    sendWithinInvitationLimits(second.id, email, deliver),
  ]);
  expect(outcomes.filter(Boolean)).toHaveLength(1);
  expect(deliver).toHaveBeenCalledOnce();
});

test.each([MINUTE_MS, HOUR_MS])(
  "an old failed send preserves a newer recipient reservation and refunds only its own budget slot (%i ms later)",
  async (elapsed) => {
    const [admin, email] = await Promise.all([adminUser(), newRecipient()]);
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const started = Promise.withResolvers<void>();
    const failed = Promise.withResolvers<void>();
    const deliver = vi.fn<() => Promise<void>>().mockResolvedValue();
    const oldSend = sendWithinInvitationLimits(admin.id, email, () => {
      started.resolve();
      return failed.promise;
    });
    // Attach the rejection handler before releasing the simulated service.
    const oldResult = expect(oldSend).rejects.toThrow("delivery rejected");
    try {
      await Promise.race([
        started.promise,
        oldSend.then((): never => {
          throw new Error("Send completed without delivery");
        }),
      ]);
      clock.mockReturnValue(now + elapsed);
      expect(await sendWithinInvitationLimits(admin.id, email, deliver)).toBe(
        true,
      );
    } finally {
      failed.reject(new Error("delivery rejected"));
      await oldResult;
    }
    expect(await sendWithinInvitationLimits(admin.id, email, deliver)).toBe(
      false,
    );
    const addresses = await Promise.all(
      Array.from({ length: OTHER_SENDS }, () => newRecipient()),
    );
    const outcomes = await Promise.all(
      addresses.map((address) =>
        sendWithinInvitationLimits(admin.id, address, deliver),
      ),
    );
    expect(outcomes.every(Boolean)).toBe(true);
    expect(
      await sendWithinInvitationLimits(admin.id, await newRecipient(), deliver),
    ).toBe(false);
    expect(deliver).toHaveBeenCalledTimes(BUDGET);
  },
);
