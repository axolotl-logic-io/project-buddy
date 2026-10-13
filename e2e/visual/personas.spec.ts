// The personas page, with the six built-in personas and two of the user's
// own: a clone of a built-in persona and a clone of that clone.
import { expect, type Page } from "@playwright/test";
import { clonePersona } from "@/personas/persona-store.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

const OWN_NAMES: readonly string[] = [
  "Mr. Tee (copy)",
  "Mr. Tee (copy) (copy)",
];

describeVisualPage({
  name: "personas",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    // One after another, so the list's order, oldest first, is fixed.
    const clone = await clonePersona(testData.account.id, "mr-tee");
    if (clone === undefined) {
      throw new Error("Mr. Tee could not be cloned");
    }
    await clonePersona(testData.account.id, clone.id);
    await page.goto("/personas");
    await expect(
      page
        .getByRole("region", { name: PERSONAS_COPY.ownHeading })
        .getByRole("listitem"),
    ).toHaveText(OWN_NAMES.map((name) => `${name}${PERSONAS_COPY.clone}`));
  },
});
