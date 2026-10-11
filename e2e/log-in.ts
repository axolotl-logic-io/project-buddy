import { expect, type Page } from "@playwright/test";
import { readSitePassphrase } from "@/env.ts";

// Signs the page's browser in through the login form with the test
// passphrase from .env.test, and waits for the home page.
export async function logIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Passphrase").fill(readSitePassphrase());
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page).toHaveURL("/");
}
