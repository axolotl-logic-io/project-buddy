// The login page, as it opens and after a wrong passphrase.
import { expect, type Locator, type Page } from "@playwright/test";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { submitPassphrase } from "../log-in.ts";
import { describeVisualPage } from "./visual-page.ts";

const WRONG_PASSPHRASE = "not the passphrase";

function passphraseField(page: Page): Locator {
  return page.getByLabel(LOGIN_COPY.passphrase);
}

describeVisualPage({
  name: "login",
  signedIn: false,
  listsEveryProject: false,
  open: async (page: Page): Promise<void> => {
    await page.goto("/login");
    await expect(passphraseField(page)).toBeVisible();
  },
});

describeVisualPage({
  name: "login-danger",
  signedIn: false,
  listsEveryProject: false,
  open: async (page: Page): Promise<void> => {
    await submitPassphrase(page, WRONG_PASSPHRASE);
    // Next's route announcer is an alert too, outside the main landmark.
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  },
});
