// Starting a performance on a quest's Overview in the built site, where the
// server's page with the performance takes the place of the one without it.

import { expect, type Locator } from "@playwright/test";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { waitForHydrated } from "./page-helpers.ts";

const RITE = "Garden rite";
const RITE_CHOICE = new RegExp(`^${RITE}`, "u");
// A list section's name: its list's name, then its size.
const TASKS_SECTION = /^Tasks/u;

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  phone: { width: 412, height: 839 },
} as const;

// Where a box ends, below the page's top.
async function endOf(box: Locator): Promise<number> {
  const bounds = await box.boundingBox();
  if (bounds === null) {
    throw new Error("The box isn't on the page");
  }
  return bounds.y + bounds.height;
}

async function topOf(box: Locator): Promise<number> {
  const bounds = await box.boundingBox();
  if (bounds === null) {
    throw new Error("The box isn't on the page");
  }
  return bounds.y;
}

test.describe("use_case_perform_rite", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`on Overview on a ${name}, the performance comes after the list sections, with its composer in view and focus on its name`, async ({
      page,
      account,
      testData,
    }) => {
      await page.setViewportSize(viewport);
      const quest = await testData.quest("Garden");
      await testData.task(quest, "Order seeds");
      await testData.rite(RITE);
      await logIn(page, account);
      await page.goto(`/quests/${quest.id}`);
      const candle = page.getByRole("button", {
        name: QUEST_OVERVIEW_COPY.performRiteOn("Tasks"),
      });
      await waitForHydrated(candle);
      await candle.click();
      const dialog = page.getByRole("dialog", {
        name: QUEST_OVERVIEW_COPY.performRite,
      });
      await dialog.getByRole("radio", { name: RITE_CHOICE }).check();

      await dialog
        .getByRole("button", { name: PERFORMANCE_COPY.start, exact: true })
        .click();

      const performance = page.getByRole("region", { name: RITE, exact: true });
      await expect(
        performance.getByRole("heading", { name: RITE, exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole("textbox", { name: PERFORMANCE_COPY.message }),
      ).toBeInViewport();
      const sections = page.getByRole("region", { name: TASKS_SECTION });
      expect(await endOf(sections)).toBeLessThanOrEqual(
        await topOf(performance),
      );
      await expect(
        page.getByRole("button", {
          name: QUEST_OVERVIEW_COPY.performRiteOn("Tasks"),
        }),
      ).toHaveCount(0);
    });
  }
});
