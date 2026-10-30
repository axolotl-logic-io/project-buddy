// For the site menu's browser tests: the menu the way the user meets it
// (open it, choose a theme or a mode, close it), and the choice the page
// has applied.
import { vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import { SITE_MENU_COPY } from "@/ui/copy/site.ts";

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

function menuButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: SITE_MENU_COPY.title, exact: true });
}

// Opens the menu, and waits until it has slid all the way in.
async function openMenu(): Promise<void> {
  await menuButton().click();
  const dialog = await vi.waitFor(() => {
    const open = page
      .getByRole("dialog", { name: SITE_MENU_COPY.title })
      .query();
    if (open === null) {
      throw new Error("The menu is not open");
    }
    return open;
  });
  await Promise.all(
    dialog.getAnimations().map((animation) => animation.finished),
  );
}

// Closes the menu with Escape, and waits until it has gone.
async function closeMenu(): Promise<void> {
  await userEvent.keyboard("{Escape}");
  await vi.waitFor(() => {
    if (page.getByRole("dialog").query() !== null) {
      throw new Error("The menu is still open");
    }
  });
}

// The radio button named name in the menu's group, such as the Theme
// choices.
function choice(
  group: string,
  name: string,
): ReturnType<typeof page.getByRole> {
  return page
    .getByRole("group", { name: group })
    .getByRole("radio", { name, exact: true });
}

// Chooses name in the menu's group, which stays open, by clicking its
// label, as the user does: a mode's radio button is hidden under it.
async function choose(group: string, name: string): Promise<void> {
  const radio = choice(group, name);
  const label = radio.element().closest("label");
  if (label === null) {
    throw new Error(`${name} has no label to click`);
  }
  await userEvent.click(label);
  await vi.waitFor(() => {
    const element = radio.element();
    if (!(element instanceof HTMLInputElement && element.checked)) {
      throw new Error(`${name} is not chosen`);
    }
  });
}

export type { AppliedChoice };
export { appliedChoice, choice, choose, closeMenu, menuButton, openMenu };
