// An action's outcome shows before the server replies, in the built site,
// where only the real App Router and server show when each reply lands.
// Each test holds the reply until it has checked the page in between.

import { expect, type Page, type Route } from "@playwright/test";
import { NEW_QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { test } from "./fixtures.ts";
import { holdPageResponse } from "./hold-page-response.ts";
import { logIn } from "./log-in.ts";
import { waitForHydrated } from "./page-helpers.ts";

const STARTED_QUEST =
  /\/quests\/[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u;
const TIMER_PAGE = /\/timer\/50\/10\/\d+/u;

// The trail band's heading, which names the page.
function trailHeading(page: Page): ReturnType<Page["getByRole"]> {
  return page
    .getByRole("region", { name: "Breadcrumbs" })
    .getByRole("heading", { level: 1 });
}

// Holds the next Server Action's request until the test answers it: the
// returned promise gives its route once the browser has sent it.
async function holdServerAction(page: Page): Promise<Promise<Route>> {
  const held = Promise.withResolvers<Route>();
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      request.method() !== "POST" ||
      (await request.headerValue("next-action")) === null
    ) {
      await route.fallback();
      return;
    }
    held.resolve(route);
  });
  return held.promise;
}

// Opens New quest on Quests and fills in the name.
async function fillNewQuest(
  page: Page,
  name: string,
): Promise<ReturnType<Page["getByRole"]>> {
  await page.getByRole("link", { name: "Quests", exact: true }).click();
  const open = page.getByRole("button", {
    name: NEW_QUEST_COPY.open,
    exact: true,
  });
  await waitForHydrated(open);
  await open.click();
  const dialog = page.getByRole("dialog", { name: NEW_QUEST_COPY.title });
  await dialog
    .getByRole("textbox", { name: NEW_QUEST_COPY.nameLabel, exact: true })
    .fill(name);
  return dialog;
}

test.describe("use_case_new_quest", () => {
  test("the quest's page opens with its name before the server replies, and its Overview follows", async ({
    account,
    page,
  }) => {
    await logIn(page, account);
    const dialog = await fillNewQuest(page, "Pottery");
    const held = await holdServerAction(page);

    await dialog.getByRole("button", { name: NEW_QUEST_COPY.start }).click();
    const route = await held;

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(STARTED_QUEST);
    await expect(trailHeading(page)).toHaveText("Pottery");
    const started = page.url();

    await route.continue();
    await expect(
      page.getByRole("heading", { name: "Tasks", exact: true }),
    ).toBeVisible();
    expect(page.url()).toBe(started);
    await page.unrouteAll({ behavior: "wait" });
  });

  test("a start the server never answers brings Quests back with the dialog as the user left it, saying why", async ({
    account,
    page,
  }) => {
    await logIn(page, account);
    const dialog = await fillNewQuest(page, "Pottery");
    await dialog
      .getByRole("textbox", { name: QUESTS_COPY.motivationLabel })
      .fill("To make a bowl");
    const held = await holdServerAction(page);

    await dialog.getByRole("button", { name: NEW_QUEST_COPY.start }).click();
    const route = await held;
    await expect(page).toHaveURL(STARTED_QUEST);

    await route.abort();
    await expect(page).toHaveURL("/quests");
    await expect(dialog.getByRole("alert")).toHaveText(NEW_QUEST_COPY.failed);
    await expect(
      dialog.getByRole("textbox", {
        name: NEW_QUEST_COPY.nameLabel,
        exact: true,
      }),
    ).toHaveValue("Pottery");
    await expect(
      dialog.getByRole("textbox", { name: QUESTS_COPY.motivationLabel }),
    ).toHaveValue("To make a bowl");
    await expect(trailHeading(page)).toHaveText("Quests");
    await page.unrouteAll({ behavior: "wait" });
  });
});

test.describe("use_case_timer_start", () => {
  test("Start shows the timer from the chosen schedule before the server's page arrives", async ({
    account,
    page,
  }) => {
    await logIn(page, account);
    await page.getByRole("link", { name: "Timer", exact: true }).click();
    const start = page.getByRole("button", { name: "Start", exact: true });
    await waitForHydrated(start);

    await holdPageResponse(page, TIMER_PAGE, async ({ requested, release }) => {
      await start.click({ noWaitAfter: true });
      await requested;
      await expect(
        page.getByRole("region", { name: TIMER_COPY.displayLabel }),
      ).toBeVisible();
      await expect(page).toHaveURL(TIMER_PAGE);
      release();
    });

    await expect(
      page.getByRole("region", { name: TIMER_COPY.displayLabel }),
    ).toBeVisible();
  });
});
