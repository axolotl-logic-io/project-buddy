import { createServer, type Server } from "node:http";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { POST } from "@/app/api/stripe/route.ts";
import { availableBatteryCatalog } from "@/batteries/catalog.ts";
import {
  type PaymentSession,
  readBatteryPurchases,
  startBatteryPurchase,
} from "@/batteries/purchases.ts";
import { getDb } from "@/db/client.ts";
import { batteryCashEvents } from "@/db/tables/battery-cash-events.ts";
import { batteryPurchases } from "@/db/tables/battery-purchases.ts";
import { users } from "@/db/tables/users.ts";
import { chargeGold, readGoldBalance } from "@/gold/gold-store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const gateway = vi.hoisted(() => ({ port: 0 }));
vi.mock("stripe", async (original) => {
  const module = await original<typeof import("stripe")>();
  class LocalStripe extends module.default {
    constructor(key: string, config?: Stripe.StripeConfig) {
      super(key, {
        ...config,
        host: "127.0.0.1",
        port: gateway.port,
        protocol: "http",
      });
    }
  }
  return { default: LocalStripe };
});

const TEST_SECRET = "whsec_fixture";
const AMOUNT = 123;
const PARTIAL_REFUND = 40;
const CASH_OBSERVATIONS = 4;
const GRANT = 250_000;
const INITIAL = 1_000_000;
let server: Server;
let purchase = "";
let successUrl: string | null = null;
let cancelUrl: string | null = null;
let paymentStatus: PaymentSession["payment_status"] = "unpaid";
let checkoutStatus: PaymentSession["status"] = "open";
let priceId = "price_fixture";
let requests = 0;
let refuseCreation = false;
let omitUrl = false;
let unrelated = false;
let retrievalFails = false;
let ambiguousCreation = false;
let cashAmount: number = PARTIAL_REFUND;
let cashCurrency = "usd";
let cashPayment = "pi_fixture";
let cashStatus = "succeeded";
let cashRetrievalFails = false;

function session(): PaymentSession & {
  object: "checkout.session";
  url: string;
} {
  return {
    id: "cs_test_fixture",
    object: "checkout.session",
    url: "https://checkout.stripe.com/test",
    livemode: false,
    mode: "payment",
    status: checkoutStatus,
    payment_status: paymentStatus,
    amount_total: AMOUNT,
    currency: "usd",
    client_reference_id: purchase,
    metadata: { purchase },
    payment_intent: "pi_fixture",
  };
}

beforeAll(async () => {
  server = createServer((request, response) => {
    requests += 1;
    response.setHeader("content-type", "application/json");
    if (
      request.url?.includes("/refunds/") ||
      request.url?.includes("/disputes/")
    ) {
      if (cashRetrievalFails) {
        response.statusCode = HTTP_STATUS.notFound;
        response.end(
          JSON.stringify({
            error: {
              type: "invalid_request_error",
              message: "Unavailable fixture",
            },
          }),
        );
        return;
      }
      response.end(
        JSON.stringify({
          id: request.url.split("/").at(-1),
          amount: cashAmount,
          currency: cashCurrency,
          payment_intent: cashPayment,
          status: cashStatus,
        }),
      );
    } else if (request.method === "POST") {
      if (refuseCreation) {
        response.statusCode = HTTP_STATUS.badRequest;
        response.end(
          JSON.stringify({
            error: {
              type: "invalid_request_error",
              message: "Fixture rejection",
            },
          }),
        );
        return;
      }
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        body += chunk;
      });
      request.on("end", () => {
        const form = new URLSearchParams(body);
        purchase = form.get("client_reference_id") ?? "";
        successUrl = form.get("success_url");
        cancelUrl = form.get("cancel_url");
        if (ambiguousCreation) {
          response.statusCode = HTTP_STATUS.internalServerError;
          response.setHeader("stripe-should-retry", "false");
          response.end(
            JSON.stringify({
              error: {
                type: "api_error",
                message: "Ambiguous fixture creation",
              },
            }),
          );
          return;
        }
        response.end(JSON.stringify({ ...session(), ...sessionOverrides() }));
      });
    } else if (request.url?.startsWith("/v1/checkout/sessions?")) {
      response.end(JSON.stringify({ data: [session()], has_more: false }));
    } else if (request.url?.includes("/line_items")) {
      response.end(
        JSON.stringify({
          object: "list",
          data: [{ price: { id: priceId }, quantity: 1 }],
          has_more: false,
        }),
      );
    } else if (request.url?.includes("/prices/")) {
      response.end(
        JSON.stringify({
          id: "price_fixture",
          object: "price",
          active: true,
          type: "one_time",
          livemode: false,
          unit_amount: AMOUNT,
          currency: "usd",
        }),
      );
    } else {
      if (retrievalFails) {
        response.statusCode = HTTP_STATUS.notFound;
        response.end(
          JSON.stringify({
            error: {
              type: "invalid_request_error",
              message: "Fixture retrieval failure",
            },
          }),
        );
        return;
      }
      response.end(JSON.stringify({ ...session(), ...sessionOverrides() }));
    }
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("No fake Stripe address.");
  }
  gateway.port = address.port;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
});

function configure(): void {
  vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_TEST_WEBHOOK_SECRET", TEST_SECRET);
  vi.stubEnv("STRIPE_TEST_RETURN_ORIGIN", "http://localhost");
  vi.stubEnv(
    "BATTERY_TEST_CATALOG",
    JSON.stringify([
      {
        id: "test",
        priceId: "price_fixture",
        batteries: 25,
        amount: AMOUNT,
        currency: "usd",
      },
    ]),
  );
  paymentStatus = "unpaid";
  checkoutStatus = "open";
  priceId = "price_fixture";
  requests = 0;
  refuseCreation = false;
  omitUrl = false;
  unrelated = false;
  retrievalFails = false;
  ambiguousCreation = false;
  cashAmount = PARTIAL_REFUND;
  cashCurrency = "usd";
  cashPayment = "pi_fixture";
  cashStatus = "succeeded";
  cashRetrievalFails = false;
}

function deliver(
  eventId: string,
  type: string = eventType(),
  objectId = "cs_test_fixture",
  livemode = false,
): Promise<Response> {
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    type,
    livemode,
    data: { object: { id: objectId } },
  });
  const signature = new Stripe(
    "sk_test_fixture",
  ).webhooks.generateTestHeaderString({ payload, secret: TEST_SECRET });
  return POST(
    new Request("http://localhost/api/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": signature },
    }),
  );
}

test("signed events, rather than browser return, credit the catalog offer once", async () => {
  configure();
  const buyer = await testUser();
  expect(await startBatteryPurchase(buyer.id, "test")).toBe(
    "https://checkout.stripe.com/test",
  );
  expect(successUrl).toBe(
    "http://localhost/settings?battery=returned#buy-batteries",
  );
  expect(cancelUrl).toBe(
    "http://localhost/settings?battery=canceled#buy-batteries",
  );
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  expect((await deliver("evt_unpaid")).status).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  paymentStatus = "paid";
  checkoutStatus = "complete";
  // A wrong Stripe price must not credit even a signed, paid event.
  priceId = "price_other";
  expect((await deliver("evt_mismatch")).status).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  priceId = "price_fixture";
  expect((await deliver("evt_paid")).status).toBe(HTTP_STATUS.ok);
  expect((await deliver("evt_again")).status).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL + GRANT);
});

test("invalid route signatures return 400 without contacting Stripe", async () => {
  configure();
  const response = await POST(
    new Request("http://localhost/api/stripe", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "invalid" },
    }),
  );
  expect(response.status).toBe(HTTP_STATUS.badRequest);
  expect(requests).toBe(0);
});

test("configured catalog refuses arbitrary price ids without a request or row", async () => {
  configure();
  const buyer = await testUser();
  expect(
    await startBatteryPurchase(buyer.id, "price_attacker"),
  ).toBeUndefined();
  expect(requests).toBe(0);
  expect(await readBatteryPurchases(buyer.id)).toEqual([]);
});

test("expired signed events record expiry without a grant", async () => {
  configure();
  const buyer = await testUser();
  await startBatteryPurchase(buyer.id, "test");
  checkoutStatus = "expired";
  expect((await deliver("evt_expired")).status).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  expect(await readBatteryPurchases(buyer.id)).toEqual([
    expect.objectContaining({ status: "expired" }),
  ]);
});

test("unrelated signed Checkout is acknowledged without fulfillment", async () => {
  configure();
  unrelated = true;
  expect((await deliver("evt_unrelated")).status).toBe(HTTP_STATUS.ok);
});

test.each(["rejected", "missing-url"])(
  "definite %s initiation failure is recorded and a paid event can recover",
  async (failure) => {
    configure();
    const buyer = await testUser();
    refuseCreation = failure === "rejected";
    omitUrl = failure === "missing-url";
    await expect(startBatteryPurchase(buyer.id, "test")).rejects.toThrow();
    const history = await readBatteryPurchases(buyer.id);
    expect(history).toEqual([expect.objectContaining({ status: "failed" })]);
    const [row] = history;
    if (row === undefined) {
      throw new Error("Missing failed purchase");
    }
    purchase = row.id;
    paymentStatus = "paid";
    checkoutStatus = "complete";
    expect((await deliver("evt_recover")).status).toBe(HTTP_STATUS.ok);
    expect(await readGoldBalance(buyer.id)).toBe(INITIAL + GRANT);
  },
);

test.each(["production", "malformed"])(
  "%s configuration hides offers without breaking presentation",
  (failure) => {
    configure();
    if (failure === "production") {
      vi.stubEnv("VERCEL_ENV", "production");
    } else {
      vi.stubEnv("BATTERY_TEST_CATALOG", "invalid JSON");
    }
    expect(availableBatteryCatalog()).toEqual([]);
  },
);

function sessionOverrides(): {
  url: string | null;
  metadata: Record<string, string>;
} {
  let url: string | null = session().url;
  let metadata: Record<string, string> = session().metadata;
  if (omitUrl) {
    url = null;
  }
  if (unrelated) {
    metadata = {};
  }
  return { url, metadata };
}

function eventType():
  | "checkout.session.expired"
  | "checkout.session.completed" {
  if (checkoutStatus === "expired") {
    return "checkout.session.expired";
  }
  return "checkout.session.completed";
}

test("unknown purchase and malformed mapping are permanent and grant nothing", async () => {
  configure();
  const buyer = await testUser();
  purchase = crypto.randomUUID();
  expect((await deliver("evt_unknown")).status).toBe(HTTP_STATUS.ok);
  purchase = "malformed";
  expect((await deliver("evt_malformed")).status).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  expect(await readBatteryPurchases(buyer.id)).toEqual([]);
});

test("provider retrieval failure returns 500 and a retry can fulfill", async () => {
  configure();
  const buyer = await testUser();
  await startBatteryPurchase(buyer.id, "test");
  paymentStatus = "paid";
  checkoutStatus = "complete";
  retrievalFails = true;
  expect((await deliver("evt_retry")).status).toBe(
    HTTP_STATUS.internalServerError,
  );
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  retrievalFails = false;
  expect((await deliver("evt_retry")).status).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL + GRANT);
});

test("ambiguous creation stays pending and a paid event recovers", async () => {
  configure();
  const buyer = await testUser();
  ambiguousCreation = true;
  await expect(startBatteryPurchase(buyer.id, "test")).rejects.toThrow();
  expect(await readBatteryPurchases(buyer.id)).toEqual([
    expect.objectContaining({ status: "pending", sessionId: null }),
  ]);
  paymentStatus = "paid";
  checkoutStatus = "complete";
  expect((await deliver("evt_ambiguous")).status).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL + GRANT);
});

test("refund and dispute observations survive deletion without changing spent batteries", async () => {
  configure();
  const buyer = await testUser();
  await startBatteryPurchase(buyer.id, "test");
  paymentStatus = "paid";
  checkoutStatus = "complete";
  await deliver("evt_paid");
  await chargeGold(buyer.id, INITIAL + GRANT);
  function refund(): Promise<Response> {
    return deliver("evt_refund", "refund.created", "re_partial");
  }
  const duplicates = await Promise.all([refund(), refund(), refund()]);
  expect(duplicates.map((response) => response.status)).toEqual([
    HTTP_STATUS.ok,
    HTTP_STATUS.ok,
    HTTP_STATUS.ok,
  ]);
  cashStatus = "needs_response";
  expect(
    (await deliver("evt_dispute", "charge.dispute.created", "dp_fixture"))
      .status,
  ).toBe(HTTP_STATUS.ok);
  cashStatus = "won";
  expect(
    (await deliver("evt_won", "charge.dispute.closed", "dp_fixture")).status,
  ).toBe(HTTP_STATUS.ok);
  cashAmount = AMOUNT;
  cashStatus = "succeeded";
  expect(
    (await deliver("evt_full", "refund.updated", "re_partial")).status,
  ).toBe(HTTP_STATUS.ok);
  expect(await readGoldBalance(buyer.id)).toBe(0);
  const [row] = await readBatteryPurchases(buyer.id);
  if (row === undefined) {
    throw new Error("Missing audit purchase");
  }
  await getDb().delete(users).where(eq(users.id, buyer.id));
  expect(await readBatteryPurchases(buyer.id)).toEqual([row]);
  const observations = await getDb()
    .select()
    .from(batteryCashEvents)
    .where(eq(batteryCashEvents.purchaseId, row.id));
  expect(observations).toHaveLength(CASH_OBSERVATIONS);
  expect(observations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectId: "re_partial",
        amount: PARTIAL_REFUND,
        kind: "refund",
      }),
      expect.objectContaining({
        objectId: "re_partial",
        amount: AMOUNT,
        status: "succeeded",
      }),
      expect.objectContaining({
        objectId: "dp_fixture",
        status: "won",
        kind: "dispute",
      }),
    ]),
  );
});

test("cash event retrieval and mismatches retry without storing invalid observations", async () => {
  configure();
  const buyer = await testUser();
  await startBatteryPurchase(buyer.id, "test");
  paymentStatus = "paid";
  checkoutStatus = "complete";
  await deliver("evt_paid");
  cashRetrievalFails = true;
  expect(
    (await deliver("evt_retry_cash", "refund.created", "re_fixture")).status,
  ).toBe(HTTP_STATUS.internalServerError);
  cashRetrievalFails = false;
  cashCurrency = "eur";
  expect(
    (await deliver("evt_retry_cash", "refund.created", "re_fixture")).status,
  ).toBe(HTTP_STATUS.internalServerError);
  cashCurrency = "usd";
  expect(
    (await deliver("evt_retry_cash", "refund.created", "re_fixture")).status,
  ).toBe(HTTP_STATUS.ok);
  const [row] = await readBatteryPurchases(buyer.id);
  if (row === undefined) {
    throw new Error("Missing purchase");
  }
  expect(
    await getDb()
      .select()
      .from(batteryCashEvents)
      .where(eq(batteryCashEvents.purchaseId, row.id)),
  ).toHaveLength(1);
});

test("deleted buyers retain pending audits and cannot be falsely fulfilled", async () => {
  configure();
  const buyer = await testUser();
  await startBatteryPurchase(buyer.id, "test");
  await getDb().delete(users).where(eq(users.id, buyer.id));
  paymentStatus = "paid";
  checkoutStatus = "complete";
  expect((await deliver("evt_deleted")).status).toBe(
    HTTP_STATUS.internalServerError,
  );
  expect(await readBatteryPurchases(buyer.id)).toEqual([
    expect.objectContaining({ status: "pending", fulfilledAt: null }),
  ]);
  expect(
    await getDb()
      .select()
      .from(batteryPurchases)
      .where(eq(batteryPurchases.id, purchase)),
  ).toHaveLength(1);
});

test("live cash events are refused before provider retrieval", async () => {
  configure();
  expect(
    (await deliver("evt_live", "refund.created", "re_live", true)).status,
  ).toBe(HTTP_STATUS.badRequest);
  expect(requests).toBe(0);
});

test("cash events before fulfillment retry and replay after the grant", async () => {
  configure();
  const buyer = await testUser();
  await startBatteryPurchase(buyer.id, "test");
  expect(
    (await deliver("evt_early", "refund.created", "re_early")).status,
  ).toBe(HTTP_STATUS.internalServerError);
  paymentStatus = "paid";
  checkoutStatus = "complete";
  await deliver("evt_paid");
  expect(
    (await deliver("evt_early", "refund.created", "re_early")).status,
  ).toBe(HTTP_STATUS.ok);
});
