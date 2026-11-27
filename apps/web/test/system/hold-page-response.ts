import type { Page } from "@playwright/test";

interface HeldResponse {
  readonly requested: Promise<void>;
  readonly release: () => void;
}

// Holds the destination's response until the test has checked the page
// in progress. Always drains the interception before returning.
async function holdPageResponse(
  page: Page,
  destination: RegExp,
  check: (response: HeldResponse) => Promise<void>,
): Promise<void> {
  const requested = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  await page.route(destination, async (route) => {
    // Hold the navigation response. A speculative response can be canceled
    // by the router as soon as the navigation finishes.
    if ((await route.request().headerValue("next-router-prefetch")) !== null) {
      await route.fulfill({ status: 204 });
      return;
    }
    const response = await route.fetch();
    requested.resolve();
    await release.promise;
    await route.fulfill({ response });
  });

  try {
    await check({ requested: requested.promise, release: release.resolve });
  } finally {
    release.resolve();
    await page.unrouteAll({ behavior: "wait" });
  }
}

export { holdPageResponse };
