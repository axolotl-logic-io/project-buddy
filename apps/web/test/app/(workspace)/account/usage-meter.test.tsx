import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { UsageMeter } from "@/app/(workspace)/account/usage-meter.tsx";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const DOLLAR_AND_A_QUARTER = 1_250_000;
const SPENT_CENTS = 125;
const LIMIT_CENTS = 500;

const OVER_THE_LIMIT = 5_120_000;

function renderMeter(spentMicroUsd: number = DOLLAR_AND_A_QUARTER): void {
  render(
    <UsageMeter
      usage={{
        spentMicroUsd,
        limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
        resetsOn: new Date("2026-11-01T00:00:00Z"),
      }}
    />,
  );
}

describe("UsageMeter", () => {
  test("states the spend out of the limit, and the reset day in UTC", () => {
    renderMeter();

    expect(
      screen.getByText(ACCOUNT_COPY.usage("$1.25", "$5.00")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ACCOUNT_COPY.resetsOn("November 1, 2026")),
    ).toBeInTheDocument();
  });

  test("shows the spend on a meter named by its heading", () => {
    renderMeter();

    const meter = screen.getByRole("meter", {
      name: ACCOUNT_COPY.usageHeading,
    });
    expect(meter).toHaveAttribute("value", String(SPENT_CENTS));
    expect(meter).toHaveAttribute("max", String(LIMIT_CENTS));
  });

  test("past the limit, states the spend, and fills the meter", () => {
    renderMeter(OVER_THE_LIMIT);

    expect(
      screen.getByText(ACCOUNT_COPY.usage("$5.12", "$5.00")),
    ).toBeInTheDocument();
    expect(screen.getByRole("meter")).toHaveAttribute(
      "value",
      String(LIMIT_CENTS),
    );
  });
});

describe("use_case_see_monthly_usage", () => {
  test("the meter tells a screen reader the spend out of the quota", () => {
    renderMeter();

    expect(
      screen.getByRole("meter", { name: ACCOUNT_COPY.usageHeading }),
    ).toHaveAttribute("aria-valuetext", ACCOUNT_COPY.usage("$1.25", "$5.00"));
  });
});
