// The page header across client navigation in the built site, where the
// App Router keeps a page the user left mounted but hidden.

import { expect, type Locator, type Page } from "@playwright/test";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { NEW_QUEST_COPY, QUEST_COPY } from "@/ui/copy/quests.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { waitForHydrated } from "./page-helpers.ts";

// Wide enough that a quest's panel docks beside the page.
const WIDE_SCREEN = { width: 1280, height: 720 };

function newQuest(page: Page): Locator {
  return page.getByRole("button", { name: NEW_QUEST_COPY.open, exact: true });
}

function openQuestPanel(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByRole("button", { name: QUEST_OVERVIEW_COPY.panel.expand });
}

// How far New quest sits from the trail band's right edge, in CSS pixels.
async function roomAfterNewQuest(page: Page): Promise<number> {
  const band = await page
    .getByRole("region", { name: "Breadcrumbs" })
    .boundingBox();
  const button = await newQuest(page).boundingBox();
  if (band === null || button === null) {
    throw new Error("The trail band or New quest isn't on screen");
  }
  return band.x + band.width - (button.x + button.width);
}

// Opens Quests from the trail band or the site panel's link.
async function openQuests(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Quests", exact: true }).click();
  await waitForHydrated(newQuest(page));
}

// Opens the quest from Quests and waits for its page to be interactive.
async function openQuest(page: Page, name: string): Promise<void> {
  await page
    .getByRole("tabpanel")
    .getByRole("link", { name, exact: true })
    .click();
  await waitForHydrated(page.getByRole("button", { name: QUEST_COPY.rename }));
}

test.describe("use_case_new_quest", () => {
  test("New quest stays at the right of Quests' trail band after leaving a quest with its panel docked", async ({
    account,
    page,
    testData,
  }) => {
    await page.setViewportSize(WIDE_SCREEN);
    await testData.quest("Garden");
    await logIn(page, account);
    await openQuests(page);
    const room = await roomAfterNewQuest(page);
    await openQuest(page, "Garden");

    await openQuests(page);

    expect(await roomAfterNewQuest(page)).toBe(room);
  });

  test("leaving a quest with its panel closed takes its tab out of the header, and Back brings it back", async ({
    account,
    page,
    testData,
  }) => {
    await page.setViewportSize(WIDE_SCREEN);
    await testData.quest("Garden");
    await logIn(page, account);
    await openQuests(page);
    const room = await roomAfterNewQuest(page);
    await openQuest(page, "Garden");
    await page
      .getByRole("button", { name: QUEST_OVERVIEW_COPY.panel.collapse })
      .click();
    await expect(openQuestPanel(page)).toBeVisible();

    await openQuests(page);
    expect(await roomAfterNewQuest(page)).toBe(room);
    await expect(openQuestPanel(page)).toHaveCount(0);

    await page.goBack();
    await expect(openQuestPanel(page)).toBeVisible();
  });
});
