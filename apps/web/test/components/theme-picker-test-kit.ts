// For the theme picker's browser tests: the picker the way the user meets
// it (open it, choose a theme or a mode, close it), and the choice the page
// has applied.
import { vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

// The theme and mode on <html>, as the page applies them.
interface AppliedChoice {
  readonly theme: string | null;
  readonly mode: string | null;
}

function appliedChoice(): AppliedChoice {
  const root = document.documentElement;
  return {
    theme: root.getAttribute(THEME_ATTRIBUTE),
    mode: root.getAttribute(MODE_ATTRIBUTE),
  };
}

async function openPicker(): Promise<void> {
  await page.getByRole("button", { name: THEME_COPY.picker }).click();
}

// Closes the picker, and waits until the page is no longer hidden behind
// it from screen readers.
async function closePicker(): Promise<void> {
  await userEvent.keyboard("{Escape}");
  await vi.waitFor(() => {
    if (page.getByRole("menu").query() !== null) {
      throw new Error("The picker is still open");
    }
  });
}

// Chooses name in the picker's group, which stays open.
async function choose(group: string, name: string): Promise<void> {
  const item = page
    .getByRole("group", { name: group })
    .getByRole("menuitemradio", { name, exact: true });
  await item.click();
  await vi.waitFor(() => {
    if (item.element().getAttribute("aria-checked") !== "true") {
      throw new Error(`${name} is not checked`);
    }
  });
}

export type { AppliedChoice };
export { appliedChoice, choose, closePicker, openPicker };
