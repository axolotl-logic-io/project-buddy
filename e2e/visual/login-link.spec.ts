// The page a sign-in link opens: Continue for a link that works, and the
// expired message, with its link to the sign-in page, for one that doesn't.
import { expect, type Page } from "@playwright/test";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";
import type { TestData } from "../fixtures.ts";
import { newSignInLink } from "../sign-in-pages.ts";
import { describeVisualPage } from "./visual-page.ts";

describeVisualPage({
  name: "login-link",
  signedIn: false,
  open: async (page: Page, testData: TestData): Promise<void> => {
    await page.goto(await newSignInLink(page, testData.account.email));
    await expect(
      page.getByRole("button", { name: LINK_PAGE_COPY.continue }),
    ).toBeVisible();
  },
});

describeVisualPage({
  name: "login-link-expired",
  signedIn: false,
  open: async (page: Page): Promise<void> => {
    await page.goto("/login/link");
    await expect(page.getByText(LINK_PAGE_COPY.expired)).toBeVisible();
  },
});
