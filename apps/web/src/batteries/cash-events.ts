import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";
import { getDb } from "@/db/client.ts";
import { batteryCashEvents } from "@/db/tables/battery-cash-events.ts";
import { batteryPurchases } from "@/db/tables/battery-purchases.ts";

const CASH_OBJECT = z.object({
  id: z.string(),
  amount: z.number().int().safe().nonnegative(),
  currency: z.string(),
  status: z.string(),
  payment_intent: z.string().nullable(),
  charge: z.string().nullable().optional(),
  livemode: z.literal(false).optional(),
});

// Called only after signature, environment and account verification.
// Retrieve current provider state; retain only reconciliation fields.
// A policy decision is still required before any battery deduction.
async function recordBatteryCashEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<boolean> {
  let kind: string;
  let input: unknown;
  switch (event.type) {
    case "refund.created":
    case "refund.updated":
    case "refund.failed":
      kind = "refund";
      input = await stripe.refunds.retrieve(event.data.object.id);
      break;
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
    case "charge.dispute.funds_withdrawn":
    case "charge.dispute.funds_reinstated":
      kind = "dispute";
      input = await stripe.disputes.retrieve(event.data.object.id);
      break;
    default:
      return false;
  }
  const object = CASH_OBJECT.parse(input);
  if (object.id !== event.data.object.id) {
    throw new Error("Cash observation reference mismatch.");
  }
  let paymentId = object.payment_intent;
  if (
    paymentId === null &&
    object.charge !== null &&
    object.charge !== undefined
  ) {
    const charge = await stripe.charges.retrieve(object.charge);
    const parsedCharge = z
      .object({
        livemode: z.literal(false),
        payment_intent: z.string().nullable(),
      })
      .parse(charge);
    paymentId = parsedCharge.payment_intent;
  }
  if (paymentId === null) {
    return true;
  }
  // Verified provider payment reference selects the immutable purchase.
  // There is no browser-supplied buyer or purchase reference.
  const [purchase] = await getDb()
    .select()
    .from(batteryPurchases)
    .where(eq(batteryPurchases.paymentId, paymentId));
  if (purchase === undefined) {
    // An adjustment can arrive before fulfillment. Retry rather than lose
    // the observation; unrelated payments need no battery reconciliation.
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentId,
      limit: 1,
    });
    if (
      sessions.data.some((session) => {
        const { purchase: reference } = session.metadata ?? {};
        return reference !== undefined;
      })
    ) {
      throw new Error(
        "Battery payment needs fulfillment before cash reconciliation.",
      );
    }
    return true;
  }
  if (
    object.currency !== purchase.currency ||
    object.amount > purchase.amount
  ) {
    throw new Error("Cash observation does not match the battery purchase.");
  }
  await getDb()
    .insert(batteryCashEvents)
    .values({
      eventId: event.id,
      purchaseId: purchase.id,
      objectId: object.id,
      kind,
      eventType: event.type,
      amount: object.amount,
      currency: object.currency,
      status: object.status,
    })
    .onConflictDoNothing();
  return true;
}

export { recordBatteryCashEvent };
