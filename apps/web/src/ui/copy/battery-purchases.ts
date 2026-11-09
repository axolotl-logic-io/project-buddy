const BATTERY_PURCHASES_COPY = {
  separator: " — ",
  heading: "Buy batteries",
  testOnly:
    "Stripe test mode: no real money is charged. Batteries fund model use. Before the Marketplace cutover, grants and sales use the existing shared balance. Separate orbs require the operator cutover.",
  unavailable: "Battery purchases are not configured yet.",
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
    `${amount} batteries — ${price}`,
};

export { BATTERY_PURCHASES_COPY };
