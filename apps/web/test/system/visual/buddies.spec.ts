// The buddies page, with the six built-in buddies and two of the user's
// own: a clone of a built-in buddy and a clone of that clone. Then a
// built-in buddy's page, and the page of a buddy of the user's own.

import { expect, type Page } from "@playwright/test";
import { cloneBuddy } from "@/buddies/buddy-store.ts";
import { BUDDIES_COPY, BUDDY_PARTS_COPY } from "@/ui/copy/buddies.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

const OWN_NAMES: readonly string[] = [
  "Mr. Tee (clone)",
  "Mr. Tee (clone) (clone)",
];

describeVisualPage({
  name: "buddies",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    // One after another, so the list's order, oldest first, is fixed.
    const clone = await cloneBuddy(testData.account.id, "mr-tee");
    if (clone === undefined) {
      throw new Error("Mr. Tee could not be cloned");
    }
    await cloneBuddy(testData.account.id, clone.id);
    await page.goto("/buddies");
    await expect(
      page
        .getByRole("region", { name: BUDDIES_COPY.ownHeading })
        .getByRole("listitem"),
    ).toHaveText(
      OWN_NAMES.map(
        (name) => `${name}${BUDDIES_COPY.tweak}${BUDDIES_COPY.clone}`,
      ),
    );
  },
});

describeVisualPage({
  name: "buddy-built-in",
  signedIn: true,
  open: async (page: Page): Promise<void> => {
    await page.goto("/buddies/mr-tee");
    await expect(
      page.getByRole("button", { exact: true, name: BUDDIES_COPY.customize }),
    ).toBeVisible();
  },
});

describeVisualPage({
  name: "buddy-own",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const buddy = await cloneBuddy(testData.account.id, "mr-tee");
    if (buddy === undefined) {
      throw new Error("Mr. Tee could not be cloned");
    }
    await page.goto(`/buddies/${buddy.id}`);
    await expect(
      page.getByRole("button", {
        exact: true,
        name: PROMPT_COPY.resetLabel(BUDDY_PARTS_COPY.voice.label),
      }),
    ).toBeVisible();
  },
});
