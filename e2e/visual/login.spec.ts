// The sign-in page, which until sign-in by email link only says it is
// coming.
import { expect, type Page } from "@playwright/test";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { describeVisualPage } from "./visual-page.ts";

describeVisualPage({
  name: "login",
  signedIn: false,
  open: async (page: Page): Promise<void> => {
    await page.goto("/login");
    await expect(page.getByText(LOGIN_COPY.comingSoon)).toBeVisible();
  },
});
