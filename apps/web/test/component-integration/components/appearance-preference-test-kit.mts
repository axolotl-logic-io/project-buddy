import type { BrowserCommandContext } from "vitest/node";

// Connects the browser fixture to the site's appearance handler so its
// response cookie is processed by the browser's real cookie jar.
async function serveAppearancePreference({
  context,
  project,
}: BrowserCommandContext): Promise<void> {
  const module = await project.vite.ssrLoadModule(
    "/src/app/api/appearance/route.ts",
  );
  const { PUT }: { readonly PUT?: unknown } = module;
  if (typeof PUT !== "function") {
    throw new Error("The appearance handler does not export PUT");
  }
  await context.route("**/api/appearance", async (route): Promise<void> => {
    const request = route.request();
    const pending: unknown = PUT(
      new Request(request.url(), {
        method: request.method(),
        headers: await request.allHeaders(),
        body: request.postData(),
      }),
    );
    if (!(pending instanceof Promise)) {
      throw new Error("The appearance handler must be asynchronous");
    }
    const response: unknown = await pending;
    if (!(response instanceof Response)) {
      throw new Error("The appearance handler did not return a response");
    }
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
    });
  });
}

export { serveAppearancePreference };
