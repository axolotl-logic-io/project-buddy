// The sign-in page: the email field, and the link to the sign-up page.
import { expect, type Page } from "@playwright/test";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { describeVisualPage } from "./visual-page.ts";

describeVisualPage({
  name: "login",
  signedIn: false,
  open: async (page: Page): Promise<void> => {
    await page.goto("/login");
    await expect(
      page.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    ).toBeVisible();
  },
});
