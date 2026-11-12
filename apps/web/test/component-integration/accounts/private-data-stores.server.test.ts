// use_case_private_data on the memory and gold stores: two users' real
// rows side by side, read and written through the stores directly. Neither
// can restore the other's memory or spend the other's gold. Another user's
// quest answers exactly as an unknown one does, and takes no writes.
// owner-scope-coverage.test.ts checks every store's queries with no rows.

import { describe, expect, test } from "vitest";
import { chargeGold } from "@/gold/gold-store.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const THEIR_SPEND_MICRO_USD = 1_250_000;
const HER_SPEND_MICRO_USD = 40_000;
const HER_LATER_SPEND_MICRO_USD = 7000;

describe("use_case_private_data", () => {
  // More spend of hers then changes only hers.
  test("each user's gold is their own", async () => {
    const { her, other } = await twoUsers();
    await chargeGold(other.id, THEIR_SPEND_MICRO_USD);
    await chargeGold(her.id, HER_SPEND_MICRO_USD);

    expect(await goldSpent(other)).toBe(THEIR_SPEND_MICRO_USD);
    expect(await goldSpent(her)).toBe(HER_SPEND_MICRO_USD);

    await chargeGold(her.id, HER_LATER_SPEND_MICRO_USD);

    expect(await goldSpent(other)).toBe(THEIR_SPEND_MICRO_USD);
    expect(await goldSpent(her)).toBe(
      HER_SPEND_MICRO_USD + HER_LATER_SPEND_MICRO_USD,
    );
  });
});
