import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import type { readMonthlyUsage } from "@/quota/spend-store.ts";
import AccountPage from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  readMonthlyUsage: vi.fn<typeof readMonthlyUsage>(),
}));
vi.mock("@/quota/spend-store.ts", () => store);

const TWO_DOLLARS = 2_000_000;

describe("Account page", () => {
  test("shows her own spend this month", async () => {
    signInAs(SIGNED_IN_USER);
    store.readMonthlyUsage.mockResolvedValue({
      spentMicroUsd: TWO_DOLLARS,
      limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
      resetsOn: new Date("2026-11-01T00:00:00Z"),
    });

    render(await AccountPage());

    expect(screen.getByText("$2.00 of $5.00")).toBeInTheDocument();
    expect(store.readMonthlyUsage).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      expect.any(Date),
    );
  });
});
