// A form filled right after page.goto is filled only once React has hydrated
// it (fillWhenReady in page-helpers.ts). The page's scripts are held back,
// so the form shows long before it hydrates, as WebKit's can; any typing
// before hydration is recorded by a listener the page starts with.
import { expect, type Page } from "@playwright/test";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { fillWhenReady, unique } from "./page-helpers.ts";

// How long the page's scripts are held while fillWhenReady waits. Whether the
// test passes doesn't depend on it: a fill that doesn't wait types at once,
// before the scripts are let go, and a fill that waits types after.
const HOLD_MS = 1000;
// Where the page records typing into a node React hasn't hydrated.
const TYPED_EARLY = "typedBeforeHydration";

// Holds the page's scripts, but not its styles, until the returned function
// is called, so the page shows its server-rendered HTML without hydrating.
async function holdScripts(page: Page): Promise<() => void> {
  const held = Promise.withResolvers<void>();
  await page.route(
    (url) => url.pathname.startsWith("/_next/") && url.pathname.endsWith(".js"),
    async (route) => {
      await held.promise;
      await route.fallback();
    },
  );
  return held.resolve;
}

// Records, before any of the page's own scripts run, whether anything is
// typed into a node without React's props key, which it adds on hydration.
async function recordTypingBeforeHydration(page: Page): Promise<void> {
  await page.addInitScript((flag) => {
    document.addEventListener(
      "input",
      (event) => {
        const target = event.target ?? {};
        if (
          !Object.keys(target).some((key) => key.startsWith("__reactProps$"))
        ) {
          Reflect.set(globalThis, flag, true);
        }
      },
      true,
    );
  }, TYPED_EARLY);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function typedBeforeHydration(page: Page): Promise<boolean> {
  return await page.evaluate(
    (flag) => Reflect.get(globalThis, flag) === true,
    TYPED_EARLY,
  );
}

test.describe("use_case_new_project", () => {
  test("her project's name is typed only once the form has hydrated", async ({
    account,
    page,
  }) => {
    const name = unique("Hydrated project");
    await logIn(page, account);
    await recordTypingBeforeHydration(page);
    const release = await holdScripts(page);
    await page.goto("/projects", { waitUntil: "commit" });
    const field = page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel });
    await expect(field).toBeVisible();

    const filling = fillWhenReady(field, name);
    await Promise.race([filling, delay(HOLD_MS)]);
    release();
    await filling;

    expect(await typedBeforeHydration(page)).toBe(false);
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
    await expect(page.getByRole("link", { exact: true, name })).toBeVisible();
  });
});
