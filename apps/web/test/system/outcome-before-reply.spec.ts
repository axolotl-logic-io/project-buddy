// An action's outcome shows before the server replies, in the built site,
// where only the real App Router and server show when each reply lands.
// Each test holds the reply until it has checked the page in between.

import { expect, type Page, type Request } from "@playwright/test";
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

interface HeldAction {
  readonly requested: Promise<Request>;
  readonly answer: (reply: "continue" | "abort") => void;
}

// Holds the next Server Action until the test has checked the page in progress.
async function holdServerAction<T>(
  page: Page,
  check: (action: HeldAction) => Promise<T>,
): Promise<T> {
  const requested = Promise.withResolvers<Request>();
  const answer = Promise.withResolvers<"continue" | "abort">();
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      request.method() !== "POST" ||
      (await request.headerValue("next-action")) === null
    ) {
      await route.fallback();
      return;
    }
    requested.resolve(request);
    if ((await answer.promise) === "abort") {
      await route.abort();
      return;
    }
    await route.continue();
  });
  try {
    return await check({
      requested: requested.promise,
      answer: answer.resolve,
    });
  } finally {
    answer.resolve("abort");
    await page.unrouteAll({ behavior: "wait" });
  }
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
    await holdServerAction(page, async ({ requested, answer }) => {
      await dialog.getByRole("button", { name: NEW_QUEST_COPY.start }).click();
      await expect(dialog).toHaveCount(0);
      await expect(trailHeading(page)).toHaveText("Pottery");
      expect(new URL((await requested).url()).pathname).toBe("/quests");
      answer("continue");
    });

    await expect(page).toHaveURL(STARTED_QUEST);
    await expect(
      page.getByRole("radio", { name: "Tasks", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/quests");
    await expect(trailHeading(page)).toHaveText("Quests");
  });

  test("a refused start brings Quests back with the dialog as the user left it, saying why", async ({
    account,
    page,
    testData,
  }) => {
    const { id } = await testData.quest("Ceramics");
    await logIn(page, account);
    const dialog = await fillNewQuest(page, "Pottery");
    await dialog
      .getByRole("textbox", { name: QUESTS_COPY.motivationLabel })
      .fill("To make a bowl");
    await page.evaluate((existingId: string): void => {
      Object.defineProperty(crypto, "randomUUID", { value: () => existingId });
    }, id);
    await holdServerAction(page, async ({ requested, answer }) => {
      await dialog.getByRole("button", { name: NEW_QUEST_COPY.start }).click();
      await expect(trailHeading(page)).toHaveText("Pottery");
      await requested;
      answer("continue");
    });

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
    await expect(
      dialog.getByRole("button", { name: NEW_QUEST_COPY.close }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: NEW_QUEST_COPY.open, exact: true }),
    ).toBeFocused();
    await expect(trailHeading(page)).toHaveText("Quests");
    await page.goBack();
    await expect(page).toHaveURL("/");
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
      release();
    });

    // The link's URL comes with the server's page.
    await expect(page).toHaveURL(TIMER_PAGE);
    await expect(
      page.getByRole("region", { name: TIMER_COPY.displayLabel }),
    ).toBeVisible();
  });
});
