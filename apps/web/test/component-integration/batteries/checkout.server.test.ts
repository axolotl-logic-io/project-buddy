import { createServer, type Server } from "node:http";
import Stripe from "stripe";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import {
  type PaymentSession,
  receiveBatteryWebhook,
  startBatteryPurchase,
} from "@/batteries/purchases.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
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
let paymentStatus: PaymentSession["payment_status"] = "unpaid";
let checkoutStatus: PaymentSession["status"] = "open";
let priceId = "price_fixture";

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
    response.setHeader("content-type", "application/json");
    if (request.method === "POST") {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        body += chunk;
      });
      request.on("end", () => {
        const form = new URLSearchParams(body);
        purchase = form.get("client_reference_id") ?? "";
        response.end(JSON.stringify(session()));
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
      response.end(JSON.stringify(session()));
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
}

function deliver(eventId: string): Promise<"accepted" | "invalid"> {
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: { object: { id: "cs_test_fixture" } },
  });
  const signature = new Stripe(
    "sk_test_fixture",
  ).webhooks.generateTestHeaderString({ payload, secret: TEST_SECRET });
  return receiveBatteryWebhook(payload, signature);
}

test("signed events, rather than browser return, credit the catalog offer once", async () => {
  configure();
  const buyer = await testUser();
  expect(await startBatteryPurchase(buyer.id, "test")).toBe(
    "https://checkout.stripe.com/test",
  );
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  expect(await deliver("evt_unpaid")).toBe("accepted");
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  paymentStatus = "paid";
  checkoutStatus = "complete";
  // A wrong Stripe price must not credit even a signed, paid event.
  priceId = "price_other";
  expect(await deliver("evt_mismatch")).toBe("invalid");
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL);
  priceId = "price_fixture";
  expect(await deliver("evt_paid")).toBe("accepted");
  expect(await deliver("evt_again")).toBe("accepted");
  expect(await readGoldBalance(buyer.id)).toBe(INITIAL + GRANT);
});
