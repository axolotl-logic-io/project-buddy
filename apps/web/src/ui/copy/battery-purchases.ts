import { BATTERIES_COPY } from "@/ui/copy/batteries.ts";

const BATTERY_PURCHASES_COPY = {
  separator: " — ",
  heading: "Buy batteries",
  testOnly:
    "Stripe test mode: no real money is charged. Batteries fund model use. Marketplace orbs are separate and cannot fund model use.",
  unavailable:
    "Battery purchases are currently unavailable. Marketplace sales cannot fund model use.",
  buy: "Continue to Stripe Checkout",
  refresh: "Refresh payment status and balance",
  canceled:
    "Checkout was closed. No batteries are granted unless Stripe confirms payment. A paid purchase can still arrive below.",
  returned:
    "Waiting for Stripe confirmation. Returning from Checkout does not confirm payment. Refresh to see your balance after fulfillment.",
  history: "Battery purchase history",
  pending: "Pending payment confirmation",
  fulfilled: "Payment confirmed; batteries added",
  expired: "Checkout expired; no batteries added",
  failed: "Checkout could not start; no batteries added",
  package: (amount: number, price: string): string =>
    `${BATTERIES_COPY.amount(amount)} — ${price}`,
};

export { BATTERY_PURCHASES_COPY };
