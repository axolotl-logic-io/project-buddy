import { expect, type Page } from "@playwright/test";
import { readSitePassphrase } from "@/env.ts";
import { COPY } from "@/ui/copy.ts";

// Opens a fresh passphrase page and submits passphrase through its form. The
// page is fresh each time, so the answer that follows belongs to this
// attempt, not to an earlier one.
export async function submitPassphrase(
  page: Page,
  passphrase: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(COPY.login.passphrase).fill(passphrase);
  await page.getByRole("button", { name: COPY.login.unlock }).click();
}

// Signs the page's browser in through the login form with the test
// passphrase from .env.test, and waits for the home page.
export async function logIn(page: Page): Promise<void> {
  await submitPassphrase(page, readSitePassphrase());
  await expect(page).toHaveURL("/");
}
