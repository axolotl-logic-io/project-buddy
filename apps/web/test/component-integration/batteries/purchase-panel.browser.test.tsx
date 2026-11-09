import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BatteryPurchases } from "@/app/(workspace)/account/battery-purchases.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { BATTERY_PURCHASES_COPY } from "@/ui/copy/battery-purchases.ts";

vi.mock("@/app/(workspace)/account/battery-actions.ts", () => ({
  buyBatteries: vi.fn(),
  refreshBatteryPayments: vi.fn(),
}));

test("offers show amount, monetary price, currency and test mode before Checkout", async () => {
  await render(
    <BatteryPurchases
      result={undefined}
      purchases={[]}
      catalog={[
        {
          id: "sandbox",
          priceId: "price_sandbox",
          batteries: 25,
          amount: 123,
          currency: "usd",
        },
      ]}
    />,
  );
  await expect.element(page.getByText("25 batteries — USD 1.23")).toBeVisible();
  await expect
    .element(page.getByText(BATTERY_PURCHASES_COPY.testOnly))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: BATTERY_PURCHASES_COPY.buy }))
    .toBeVisible();
});

test("a return URL does not claim confirmed payment", async () => {
  await render(
    <BatteryPurchases result="returned" catalog={[]} purchases={[]} />,
  );
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent(BATTERY_PURCHASES_COPY.returned);
  await expect
    .element(page.getByText(BATTERY_PURCHASES_COPY.fulfilled))
    .not.toBeInTheDocument();
});

test("closed Checkout does not claim a paid purchase failed", async () => {
  await render(
    <BatteryPurchases result="canceled" catalog={[]} purchases={[]} />,
  );
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent(BATTERY_PURCHASES_COPY.canceled);
});

test("out of batteries links to Account purchase guidance", async () => {
  await render(<EarnGoldLink />);
  await expect
    .element(page.getByRole("link", { name: BATTERY_PURCHASES_COPY.heading }))
    .toHaveAttribute("href", "/account#buy-batteries");
});
