// The login page, as it opens and after a wrong passphrase.
import { expect, type Locator, type Page } from "@playwright/test";
import { submitPassphrase } from "../log-in.ts";
import { describeVisualPage } from "./visual-page.ts";

const WRONG_PASSPHRASE = "not the passphrase";

function passphraseField(page: Page): Locator {
  return page.getByLabel("Passphrase");
}

describeVisualPage({
  name: "login",
  listsEveryProject: false,
  open: async (page: Page): Promise<void> => {
    await page.goto("/login");
    await expect(passphraseField(page)).toBeVisible();
  },
});

describeVisualPage({
  name: "login-danger",
  listsEveryProject: false,
  open: async (page: Page): Promise<void> => {
    await submitPassphrase(page, WRONG_PASSPHRASE);
    // Next's route announcer is an alert too, outside the main landmark.
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  },
});
