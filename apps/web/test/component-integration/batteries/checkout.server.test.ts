import { createServer, type Server } from "node:http";
import Stripe from "stripe";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { POST } from "@/app/api/stripe/route.ts";
import { availableBatteryCatalog } from "@/batteries/catalog.ts";
import {
  type PaymentSession,
  readBatteryPurchases,
  startBatteryPurchase,
} from "@/batteries/purchases.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
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
    if (request.method === "POST") {
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
}

function deliver(eventId: string): Promise<Response> {
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    type: eventType(),
    livemode: false,
    data: { object: { id: "cs_test_fixture" } },
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
