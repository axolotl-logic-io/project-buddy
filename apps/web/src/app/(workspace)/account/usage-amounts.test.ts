import { describe, expect, test } from "vitest";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { usageAmounts } from "./usage-amounts.ts";

const RESETS_ON = new Date("2026-11-01T00:00:00Z");
const LIMIT_CENTS = 500;
const DOLLAR_AND_A_QUARTER = 1_250_000;
const MICRO_USD_PER_CENT = 10_000;
// Just over $4.99: a cent less than the limit once rounded up would be
// $5.00.
const JUST_OVER_4_99 = 4_990_001;
const OVER_THE_LIMIT = 5_120_000;

function usageOf(spentMicroUsd: number): ReturnType<typeof usageAmounts> {
  return usageAmounts({
    spentMicroUsd,
    limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
    resetsOn: RESETS_ON,
  });
}

describe("usageAmounts", () => {
  test("states the spend and the limit in cents and in dollars and cents", () => {
    expect(usageOf(DOLLAR_AND_A_QUARTER)).toEqual({
      spentCents: 125,
      limitCents: LIMIT_CENTS,
      spent: "$1.25",
      limit: "$5.00",
    });
  });

  test("shows no spend as nothing", () => {
    expect(usageOf(0)).toMatchObject({ spentCents: 0, spent: "$0.00" });
  });

  test("rounds any spend up to the cent, so a fraction of a cent shows", () => {
    expect(usageOf(1)).toMatchObject({ spentCents: 1, spent: "$0.01" });
    expect(usageOf(DOLLAR_AND_A_QUARTER + 1).spent).toBe("$1.26");
    expect(usageOf(DOLLAR_AND_A_QUARTER + MICRO_USD_PER_CENT).spent).toBe(
      "$1.26",
    );
  });

  test("under the limit, shows a cent less than it at most", () => {
    expect(usageOf(JUST_OVER_4_99).spent).toBe("$4.99");
    expect(usageOf(MONTHLY_QUOTA_MICRO_USD - 1)).toMatchObject({
      spentCents: LIMIT_CENTS - 1,
      spent: "$4.99",
    });
  });

  test("shows the limit once the spend reaches it, and the spend past it", () => {
    expect(usageOf(MONTHLY_QUOTA_MICRO_USD)).toMatchObject({
      spentCents: LIMIT_CENTS,
      spent: "$5.00",
    });
    expect(usageOf(OVER_THE_LIMIT).spent).toBe("$5.12");
  });
});
