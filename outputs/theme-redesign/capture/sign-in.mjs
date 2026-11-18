// Opens a sign-in link and saves the signed-in session for capture.mjs.
//
// Usage (from the repository root, with the dev server running):
//   node outputs/theme-redesign/capture/sign-in.mjs SIGN_IN_LINK NAME STATE_FILE
//
// SIGN_IN_LINK is the link `mise run sign-in-link EMAIL` prints. NAME fills
// the Name field, which the site asks for only on an account's first sign-in.
// STATE_FILE is where the Playwright storage state, with the session cookie,
// is saved. Keep it outside the repository.
import { chromium } from "playwright";

const [, , url, name, state] = process.argv;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
const field = page.getByRole("textbox", { name: "Name" });
if (await field.count()) {
  await field.fill(name);
}
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL((next) => !next.pathname.startsWith("/login"), {
  timeout: 60_000,
});
await page.waitForLoadState("networkidle");
console.log(page.url());
await context.storageState({ path: state });
await browser.close();
