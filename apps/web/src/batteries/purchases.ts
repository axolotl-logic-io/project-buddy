import { and, desc, eq, isNull } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { batteryPurchasesOwnedBy } from "@/accounts/owner-scope.ts";
import { batteryCatalog } from "@/batteries/catalog.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { batteryPurchases } from "@/db/tables/battery-purchases.ts";
import { readBatteryPayments } from "@/env.ts";
import { logAppError } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { goldInMicroUsd } from "@/gold/gold.ts";
import { adjustGold, readGoldBalance } from "@/gold/gold-store.ts";
import { parseUserId, type UserId } from "@/ids.ts";

const HISTORY_LIMIT = 20;
const PURCHASE_ID = z.uuid();
const SESSION = z.object({
  id: z.string().startsWith("cs_test_"),
  livemode: z.literal(false),
  mode: z.literal("payment"),
  status: z.enum(["open", "complete", "expired"]),
  payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
  amount_total: z.number().int().nonnegative(),
  currency: z.string(),
  client_reference_id: z.uuid(),
  metadata: z.object({ purchase: PURCHASE_ID }),
  payment_intent: z.string().nullable(),
});
type PaymentSession = z.infer<typeof SESSION>;

function paymentClient(): Stripe {
  const config = readBatteryPayments();
  if (config === undefined) {
    throw new Error("Battery purchases are unavailable.");
  }
  return new Stripe(config.key, { maxNetworkRetries: 2 });
}

// Creates only a server-catalog offer for owner. The persisted snapshot is
// authoritative even if the catalog changes before Stripe delivers payment.
async function startBatteryPurchase(
  owner: UserId,
  packageId: string,
): Promise<string | undefined> {
  const offer = batteryCatalog().find((item) => item.id === packageId);
  if (offer === undefined) {
    return undefined;
  }
  return await withAppErrors("battery-checkout", async () => {
    const stripe = paymentClient();
    const config = readBatteryPayments();
    if (config === undefined) {
      throw new Error("Battery purchases are unavailable.");
    }
    const price = await stripe.prices.retrieve(offer.priceId);
    if (
      price.livemode ||
      !price.active ||
      price.type !== "one_time" ||
      price.unit_amount !== offer.amount ||
      price.currency !== offer.currency
    ) {
      throw new Error(
        "Stripe price does not match the configured battery offer.",
      );
    }
    const id = crypto.randomUUID();
    await getDb().insert(batteryPurchases).values({
      id,
      userId: owner,
      packageId: offer.id,
      priceId: offer.priceId,
      batteries: offer.batteries,
      amount: offer.amount,
      currency: offer.currency,
    });
    // No tax, promotion codes, adjustable quantities, subscriptions or
    // delayed methods: each could change the authorized payment contract.
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          adaptive_pricing: { enabled: false },
          automatic_tax: { enabled: false },
          allowed_payment_method_types: ["card"],
          line_items: [{ price: offer.priceId, quantity: 1 }],
          client_reference_id: id,
          metadata: { purchase: id },
          success_url: `${config.origin}/settings?battery=returned#buy-batteries`,
          cancel_url: `${config.origin}/settings?battery=canceled#buy-batteries`,
        },
        { idempotencyKey: id },
      );
    } catch (error) {
      // Connection errors and server errors may have created a payable
      // session. Leave these pending so a paid webhook can recover.
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError ||
        error instanceof Stripe.errors.StripeAuthenticationError ||
        error instanceof Stripe.errors.StripePermissionError
      ) {
        await getDb()
          .update(batteryPurchases)
          .set({ status: "failed" })
          .where(
            and(
              batteryPurchasesOwnedBy(owner),
              eq(batteryPurchases.id, id),
              isNull(batteryPurchases.fulfilledAt),
            ),
          );
      }
      throw error;
    }
    await getDb()
      .update(batteryPurchases)
      .set({ sessionId: session.id })
      .where(and(batteryPurchasesOwnedBy(owner), eq(batteryPurchases.id, id)));
    if (session.url === null || session.url === undefined) {
      await getDb()
        .update(batteryPurchases)
        .set({ status: "failed" })
        .where(
          and(
            batteryPurchasesOwnedBy(owner),
            eq(batteryPurchases.id, id),
            isNull(batteryPurchases.fulfilledAt),
          ),
        );
      throw new Error("Stripe Checkout has no URL.");
    }
    return session.url;
  });
}

// Trusted payment boundary shared by the webhook and replay tests. Locks
// the purchase before checking fulfillment; balance and audit commit once.
// Only verified Stripe data may enter here, never a browser redirect.
async function applyBatteryPayment(
  input: unknown,
  eventId: string,
): Promise<void> {
  const session = SESSION.parse(input);
  await withAppErrors("battery-fulfillment", () =>
    inTransaction(async (tx) => {
      // This system lookup is intentionally not owner-scoped: verified Stripe
      // metadata selects the immutable buyer. No caller supplies a recipient.
      const [purchase] = await tx
        .select()
        .from(batteryPurchases)
        .where(eq(batteryPurchases.id, session.metadata.purchase))
        .for("update");
      if (purchase === undefined) {
        throw new Error("Unknown battery purchase.");
      }
      if (
        session.client_reference_id !== purchase.id ||
        session.amount_total !== purchase.amount ||
        session.currency !== purchase.currency ||
        (purchase.sessionId !== null && purchase.sessionId !== session.id)
      ) {
        throw new Error("Stripe payment does not match the battery purchase.");
      }
      if (purchase.fulfilledAt !== null) {
        return;
      }
      if (
        session.status === "complete" &&
        session.payment_status === "paid" &&
        session.payment_intent !== null
      ) {
        const buyer = parseUserId(purchase.userId);
        if (buyer === undefined) {
          throw new Error("Invalid purchase buyer.");
        }
        await readGoldBalance(buyer, tx);
        await adjustGold(buyer, goldInMicroUsd(purchase.batteries), tx);
        await tx
          .update(batteryPurchases)
          .set({
            sessionId: session.id,
            paymentId: session.payment_intent,
            eventId,
            status: "fulfilled",
            fulfilledAt: new Date(),
          })
          .where(
            and(
              batteryPurchasesOwnedBy(buyer),
              eq(batteryPurchases.id, purchase.id),
            ),
          );
      } else if (session.status === "expired") {
        await tx
          .update(batteryPurchases)
          .set({ sessionId: session.id, eventId, status: "expired" })
          .where(eq(batteryPurchases.id, purchase.id));
      }
    }),
  );
}

const EVENT_REFERENCE = /^evt_[A-Za-z0-9_]{1,100}$/u;

function permanentMismatch(event: string, purchase: string): void {
  let eventRef = "unrecognized";
  let purchaseRef = "unrecognized";
  if (EVENT_REFERENCE.test(event)) {
    eventRef = event;
  }
  if (PURCHASE_ID.safeParse(purchase).success) {
    purchaseRef = purchase;
  }
  logAppError(
    "unknown",
    "battery-webhook-mismatch",
    new Error(
      `Permanent payment mismatch; event ${eventRef}, purchase ${purchaseRef}. Investigate before replay.`,
    ),
  );
}

async function receiveBatteryWebhook(
  body: string,
  signature: string,
): Promise<"accepted" | "invalid"> {
  const config = readBatteryPayments();
  if (config === undefined) {
    return "invalid";
  }
  const stripe = paymentClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.webhookSecret,
    );
  } catch {
    return "invalid";
  }
  if (event.livemode || event.account !== undefined) {
    return "invalid";
  }
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return "accepted";
  }
  // Retrieve from Stripe rather than trusting a stale event snapshot. This
  // also permits replay after temporary storage failures and catalog edits.
  const retrieved = await stripe.checkout.sessions.retrieve(
    event.data.object.id,
  );
  // Other Checkout integrations (including Payment Links) share this endpoint.
  // A missing purchase marker is unrelated; a malformed marker is permanent.
  const { purchase: purchaseReference } = retrieved.metadata ?? {};
  if (purchaseReference === undefined) {
    return "accepted";
  }
  const parsed = SESSION.safeParse(retrieved);
  if (!parsed.success) {
    permanentMismatch(event.id, purchaseReference);
    return "accepted";
  }
  const session = parsed.data;
  const [purchase] = await getDb()
    .select()
    .from(batteryPurchases)
    .where(eq(batteryPurchases.id, session.metadata.purchase));
  if (
    purchase === undefined ||
    session.client_reference_id !== purchase.id ||
    session.amount_total !== purchase.amount ||
    session.currency !== purchase.currency ||
    (purchase.sessionId !== null && purchase.sessionId !== session.id)
  ) {
    permanentMismatch(event.id, session.metadata.purchase);
    return "accepted";
  }
  const lines = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 2,
  });
  const [line] = lines.data;
  if (
    lines.has_more ||
    lines.data.length !== 1 ||
    line?.price?.id !== purchase.priceId ||
    line.quantity !== 1
  ) {
    permanentMismatch(event.id, session.metadata.purchase);
    return "accepted";
  }
  await applyBatteryPayment(session, event.id);
  return "accepted";
}

function readBatteryPurchases(
  owner: UserId,
): Promise<(typeof batteryPurchases.$inferSelect)[]> {
  return withAppErrors("battery-history", () =>
    getDb()
      .select()
      .from(batteryPurchases)
      .where(batteryPurchasesOwnedBy(owner))
      .orderBy(desc(batteryPurchases.createdAt))
      .limit(HISTORY_LIMIT),
  );
}

export type { PaymentSession };
export {
  applyBatteryPayment,
  readBatteryPurchases,
  receiveBatteryWebhook,
  startBatteryPurchase,
};
