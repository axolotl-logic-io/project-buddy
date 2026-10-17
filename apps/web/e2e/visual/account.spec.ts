// The account page, with $1.25 of the test account's own spend this month,
// so the meter shows a part filled. Its reset day changes each month, so
// the shots cover it.
import type { Locator, Page } from "@playwright/test";
import { spend } from "@/test-database/spend-test-kit.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import type { TestData } from "../fixtures.ts";
import { ANY_VALUE, copyPattern, describeVisualPage } from "./visual-page.ts";

const DOLLAR_AND_A_QUARTER = 1_250_000;

describeVisualPage({
  name: "account",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    await spend(testData.account, DOLLAR_AND_A_QUARTER);
    await page.goto("/account");
  },
  changing: (page: Page): readonly Locator[] => [
    page.getByText(copyPattern(ACCOUNT_COPY.resetsOn(ANY_VALUE))),
  ],
});
