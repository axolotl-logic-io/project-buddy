// The sign-up page: the invite code and email fields, and the link to the
// sign-in page.
import { expect, type Page } from "@playwright/test";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { describeVisualPage } from "./visual-page.ts";

describeVisualPage({
  name: "signup",
  signedIn: false,
  open: async (page: Page): Promise<void> => {
    await page.goto("/signup");
    await expect(page.getByLabel(SIGNUP_COPY.inviteCodeLabel)).toBeVisible();
  },
});
