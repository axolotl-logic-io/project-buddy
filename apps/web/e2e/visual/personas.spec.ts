// The personas page, with the six built-in personas and two of the user's
// own: a clone of a built-in persona and a clone of that clone. Then a
// built-in persona's page, and the page of a persona of the user's own.
import { expect, type Page } from "@playwright/test";
import { clonePersona } from "@/personas/persona-store.ts";
import {
  PERSONA_COPY,
  PERSONA_PARTS_COPY,
  PERSONAS_COPY,
} from "@/ui/copy/personas.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

const OWN_NAMES: readonly string[] = [
  "Mr. Tee (clone)",
  "Mr. Tee (clone) (clone)",
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
    ).toHaveText(
      OWN_NAMES.map(
        (name) => `${name}${PERSONAS_COPY.tweak}${PERSONAS_COPY.clone}`,
      ),
    );
  },
});

describeVisualPage({
  name: "persona-built-in",
  signedIn: true,
  open: async (page: Page): Promise<void> => {
    await page.goto("/personas/mr-tee");
    await expect(
      page.getByRole("button", { exact: true, name: PERSONAS_COPY.customize }),
    ).toBeVisible();
  },
});

describeVisualPage({
  name: "persona-own",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const persona = await clonePersona(testData.account.id, "mr-tee");
    if (persona === undefined) {
      throw new Error("Mr. Tee could not be cloned");
    }
    await page.goto(`/personas/${persona.id}`);
    await expect(
      page.getByRole("button", {
        exact: true,
        name: PERSONA_COPY.resetLabel(PERSONA_PARTS_COPY.role.label),
      }),
    ).toBeVisible();
  },
});
