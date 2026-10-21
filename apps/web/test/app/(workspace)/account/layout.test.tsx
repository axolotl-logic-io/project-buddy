import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import AccountLayout from "@/app/(workspace)/account/layout.tsx";
import { UsageMeter } from "@/app/(workspace)/account/usage-meter.tsx";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

vi.mock("@/app/(workspace)/account/actions.ts", () => ({
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));

const DOLLAR_AND_A_QUARTER = 1_250_000;
const USAGE_METER_EXTRA = '[data-extra="usage-meter"]';

describe("Account layout", () => {
  test("heads the page, and offers both ways to sign out below the usage", () => {
    render(
      <AccountLayout params={Promise.resolve({})}>
        <section aria-label="Usage" />
      </AccountLayout>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: ACCOUNT_COPY.heading }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("region", { name: "Usage" })
        .compareDocumentPosition(
          screen.getByRole("region", { name: ACCOUNT_COPY.signOutHeading }),
        ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.getByRole("region", { name: ACCOUNT_COPY.signOutHeading }),
    ).toContainElement(
      screen.getByRole("button", { name: ACCOUNT_COPY.signOut }),
    );
    expect(
      screen.getByRole("button", { name: ACCOUNT_COPY.signOutEverywhere }),
    ).toBeInTheDocument();
  });
});

describe("use_case_see_monthly_usage", () => {
  test("switching the meter off leaves both ways to sign out", () => {
    render(
      <AccountLayout params={Promise.resolve({})}>
        <UsageMeter
          usage={{
            spentMicroUsd: DOLLAR_AND_A_QUARTER,
            limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
            resetsOn: new Date("2026-11-01T00:00:00Z"),
          }}
        />
      </AccountLayout>,
    );

    expect(screen.getByRole("meter").closest(USAGE_METER_EXTRA)).toBe(
      screen.getByRole("region", { name: ACCOUNT_COPY.usageHeading }),
    );
    for (const name of [ACCOUNT_COPY.signOut, ACCOUNT_COPY.signOutEverywhere]) {
      expect(
        screen.getByRole("button", { name }).closest(USAGE_METER_EXTRA),
      ).toBeNull();
    }
  });
});
