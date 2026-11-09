import Stripe from "stripe";
import { expect, test, vi } from "vitest";
import { logAppError } from "@/errors/error-log.ts";

test("Stripe failures retain classification without payment payload or credentials", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {
    // Read the log without printing it.
  });
  const sensitive = "private-payment-payload";
  const error = new Stripe.errors.StripeInvalidRequestError({
    message: sensitive,
  });
  logAppError("unknown", "checkout", error);
  expect(log).toHaveBeenCalledWith(
    "[app-error] unknown in checkout",
    JSON.stringify({ name: error.type }),
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain(sensitive);
  log.mockRestore();
});
