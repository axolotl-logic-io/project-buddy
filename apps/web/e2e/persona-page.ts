// A persona's page (src/app/(workspace)/personas/[personaId]): its part
// fields, its buttons, and the Settings switch that shows its mechanics
// parts, which are off by default.
import { expect, type Locator, type Page } from "@playwright/test";
import { PERSONA_COPY, PERSONA_PARTS_COPY } from "@/ui/copy/personas.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { waitForHydrated } from "./page-helpers.ts";
import { switchExtra } from "./settings-page.ts";

// The field of the part with this label.
function partField(page: Page, label: string): Locator {
  return page.getByRole("textbox", { exact: true, name: label });
}

// Clicks the button, once the page can take the click.
async function press(page: Page, name: string): Promise<void> {
  const button = page.getByRole("button", { exact: true, name });
  await waitForHydrated(button);
  await button.click();
}

// Switches the persona mechanics on in Settings, as they are off by default.
async function showMechanics(page: Page): Promise<void> {
  await switchExtra(page, FLAG_COPY.personaMechanics.label, true, [
    "interview-persona",
  ]);
}

// Expects the page to show the persona's own parts, and to keep its
// citation part, a mechanics part, in the page but hidden.
async function expectMechanicsHidden(page: Page): Promise<void> {
  await expect(partField(page, PERSONA_PARTS_COPY.voice.label)).toBeVisible();
  await expect(partField(page, PERSONA_PARTS_COPY.role.label)).toBeVisible();
  const citation = page.getByRole("textbox", {
    exact: true,
    includeHidden: true,
    name: PERSONA_PARTS_COPY.citation.label,
  });
  await expect(citation).toHaveCount(1);
  await expect(citation).toBeHidden();
}

// Expects the page to show its citation part, a mechanics part, with the
// warning that an edit can break it.
async function expectMechanicsShown(page: Page): Promise<void> {
  const citation = partField(page, PERSONA_PARTS_COPY.citation.label);
  await expect(citation).toBeVisible();
  await expect(citation).toHaveAccessibleDescription(
    new RegExp(PERSONA_COPY.mechanicsWarning, "u"),
  );
}

export {
  expectMechanicsHidden,
  expectMechanicsShown,
  partField,
  press,
  showMechanics,
};
