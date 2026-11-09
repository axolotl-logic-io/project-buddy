import { eq } from "drizzle-orm";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  applyBatteryPayment,
  type PaymentSession,
  readBatteryPurchases,
  receiveBatteryWebhook,
  startBatteryPurchase,
} from "@/batteries/purchases.ts";
import { getDb } from "@/db/client.ts";
import { batteryPurchases } from "@/db/tables/battery-purchases.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import type { UserId } from "@/ids.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const OFFER = {
  packageId: "sandbox",
  priceId: "price_sandbox",
  batteries: 25,
  amount: 100,
  currency: "usd",
};
const GRANT = 250_000;
const BASELINE = 1_000_000;

async function pending(owner: UserId): Promise<PaymentSession> {
  const id = crypto.randomUUID();
  await getDb()
    .insert(batteryPurchases)
    .values({ id, userId: owner, ...OFFER });
  return {
    id: `cs_test_${id}`,
    livemode: false,
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: OFFER.amount,
    currency: OFFER.currency,
    client_reference_id: id,
    metadata: { purchase: id },
    payment_intent: `pi_${id}`,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("battery payment fulfillment", () => {
  test("use_case_buy_batteries", async () => {
    const buyer = await testUser();
    const other = await testUser();
    const session = await pending(buyer.id);
    await applyBatteryPayment(session, "evt_paid");
    expect(await readGoldBalance(buyer.id)).toBe(BASELINE + GRANT);
    expect(await readGoldBalance(other.id)).toBe(BASELINE);
    expect(await readBatteryPurchases(other.id)).toEqual([]);
    expect(await readBatteryPurchases(buyer.id)).toEqual([
      expect.objectContaining({
        status: "fulfilled",
        batteries: OFFER.batteries,
        eventId: "evt_paid",
        paymentId: session.payment_intent,
        fulfilledAt: expect.any(Date),
      }),
    ]);
  });

  test("concurrent distinct events and reloads grant once", async () => {
    const buyer = await testUser();
    const session = await pending(buyer.id);
    await Promise.all([
      applyBatteryPayment(session, "evt_one"),
      applyBatteryPayment(session, "evt_two"),
      applyBatteryPayment(session, "evt_one"),
    ]);
    await readBatteryPurchases(buyer.id);
    await applyBatteryPayment(session, "evt_three");
    expect(await readGoldBalance(buyer.id)).toBe(BASELINE + GRANT);
  });

  test.each(["unpaid", "no_payment_required"] as const)(
    "a %s session grants nothing",
    async (paymentStatus) => {
      const buyer = await testUser();
      const session = await pending(buyer.id);
      await applyBatteryPayment(
        { ...session, payment_status: paymentStatus },
        "evt_unpaid",
      );
      expect(await readGoldBalance(buyer.id)).toBe(BASELINE);
    },
  );

  test("expired Checkout grants nothing", async () => {
    const buyer = await testUser();
    const session = await pending(buyer.id);
    await applyBatteryPayment(
      { ...session, status: "expired", payment_status: "unpaid" },
      "evt_expired",
    );
    expect(await readGoldBalance(buyer.id)).toBe(BASELINE);
    expect(await readBatteryPurchases(buyer.id)).toEqual([
      expect.objectContaining({ status: "expired" }),
    ]);
  });

  test("mismatched amount, currency, environment and purchase mapping cannot grant", async () => {
    const buyer = await testUser();
    const session = await pending(buyer.id);
    await Promise.all(
      [
        { amount_total: 101 },
        { currency: "eur" },
        { livemode: true },
        { client_reference_id: crypto.randomUUID() },
      ].map((changed) =>
        expect(
          applyBatteryPayment({ ...session, ...changed }, "evt_bad"),
        ).rejects.toThrow(),
      ),
    );
    expect(await readGoldBalance(buyer.id)).toBe(BASELINE);
  });

  test("a failed transaction rolls back the balance and safely replays", async () => {
    const buyer = await testUser();
    const first = await pending(buyer.id);
    const second = await pending(buyer.id);
    await applyBatteryPayment(first, "evt_first");
    // Force a failure after the balance update, using the unique payment
    // constraint. PostgreSQL must roll back the whole second fulfillment.
    await expect(
      applyBatteryPayment(
        { ...second, payment_intent: first.payment_intent },
        "evt_conflict",
      ),
    ).rejects.toThrow();
    expect(await readGoldBalance(buyer.id)).toBe(BASELINE + GRANT);
    expect(await readBatteryPurchases(buyer.id)).toContainEqual(
      expect.objectContaining({
        id: second.metadata.purchase,
        status: "pending",
        fulfilledAt: null,
      }),
    );
    await applyBatteryPayment(second, "evt_replay");
    expect(await readGoldBalance(buyer.id)).toBe(BASELINE + GRANT * 2);
  });

  test("a purchase bound to another Checkout Session cannot grant", async () => {
    const buyer = await testUser();
    const session = await pending(buyer.id);
    await getDb()
      .update(batteryPurchases)
      .set({ sessionId: "cs_test_other" })
      .where(eq(batteryPurchases.id, session.metadata.purchase));
    await expect(applyBatteryPayment(session, "evt_other")).rejects.toThrow();
    expect(await readGoldBalance(buyer.id)).toBe(BASELINE);
  });

  test("invalid signatures are refused before processing", async () => {
    vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_TEST_WEBHOOK_SECRET", "whsec_fixture");
    vi.stubEnv("BATTERY_TEST_CATALOG", "[]");
    vi.stubEnv("STRIPE_TEST_RETURN_ORIGIN", "http://localhost");
    expect(
      await receiveBatteryWebhook(
        '{"type":"checkout.session.completed"}',
        "invalid",
      ),
    ).toBe("invalid");
  });

  test("unknown or client-chosen price identifiers cannot initiate Checkout", async () => {
    const buyer = await testUser();
    vi.stubEnv("STRIPE_TEST_SECRET_KEY", "");
    expect(
      await startBatteryPurchase(buyer.id, "price_attacker"),
    ).toBeUndefined();
    expect(await readBatteryPurchases(buyer.id)).toEqual([]);
  });
});
