// The activities page, with the four built-in activities and one of the
// user's own, a clone of a built-in activity. Then a built-in activity's
// page, and the page of an activity of the user's own.

import { expect, type Page } from "@playwright/test";
import { cloneActivity } from "@/activities/activity-store.ts";
import { ACTIVITIES_COPY, ACTIVITY_PARTS_COPY } from "@/ui/copy/activities.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

const OWN_NAME = "Brainstorming (clone)";

describeVisualPage({
  name: "activities",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    await cloneActivity(testData.account.id, "brainstorming");
    await page.goto("/activities");
    await expect(
      page
        .getByRole("region", { name: ACTIVITIES_COPY.ownHeading })
        .getByRole("listitem"),
    ).toHaveText([
      `${OWN_NAME}${ACTIVITIES_COPY.start}${ACTIVITIES_COPY.tweak}${ACTIVITIES_COPY.clone}`,
    ]);
  },
});

describeVisualPage({
  name: "activity-built-in",
  signedIn: true,
  open: async (page: Page): Promise<void> => {
    await page.goto("/activities/brainstorming");
    await expect(
      page.getByRole("button", {
        exact: true,
        name: ACTIVITIES_COPY.customize,
      }),
    ).toBeVisible();
  },
});

describeVisualPage({
  name: "activity-own",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const activity = await cloneActivity(testData.account.id, "brainstorming");
    if (activity === undefined) {
      throw new Error("Brainstorming could not be cloned");
    }
    await page.goto(`/activities/${activity.id}`);
    await expect(
      page.getByRole("button", {
        exact: true,
        name: PROMPT_COPY.resetLabel(ACTIVITY_PARTS_COPY.instructions.label),
      }),
    ).toBeVisible();
  },
});
