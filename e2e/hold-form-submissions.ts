import type { Page } from "@playwright/test";

// Holds the page's form submissions until the returned function is called,
// so a test can see the form while it is working.
export async function holdFormSubmissions(page: Page): Promise<() => void> {
  const held = Promise.withResolvers<void>();
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      await held.promise;
    }
    await route.fallback();
  });
  return held.resolve;
}
