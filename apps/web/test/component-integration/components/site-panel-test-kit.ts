// For the site panel's browser tests: the panel the way the user meets it
// (open it, choose a theme or a mode, close it), and the choice the page
// has applied. On a wide screen, such as the tests' own laptop, the panel
// docks beside the page; narrower, it is a modal drawer.

import { vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import { SITE_PANEL_COPY } from "@/ui/copy/site.ts";

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

// The header's button that opens the site panel.
function panelButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", {
    name: SITE_PANEL_COPY.title,
    exact: true,
  });
}

// The open site panel.
function sitePanel(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", { name: SITE_PANEL_COPY.title });
}

// Opens the panel, and waits until it has slid all the way in.
async function openPanel(): Promise<void> {
  await panelButton().click();
  const dialog = await vi.waitFor(() => {
    const open = sitePanel().query();
    if (open === null) {
      throw new Error("The site panel is not open");
    }
    return open;
  });
  await Promise.all(
    dialog.getAnimations().map((animation) => animation.finished),
  );
}

// Closes the panel, and waits until it has gone: a drawer with Escape, and
// a docked panel, which Escape leaves open, with its close button.
async function closePanel(): Promise<void> {
  if (sitePanel().element().matches(":modal")) {
    await userEvent.keyboard("{Escape}");
  } else {
    await sitePanel()
      .getByRole("button", { name: SITE_PANEL_COPY.close })
      .click();
  }
  await vi.waitFor(() => {
    if (sitePanel().query() !== null) {
      throw new Error("The site panel is still open");
    }
  });
}

// The radio button named name in the panel's group, such as the Theme
// choices.
function choice(
  group: string,
  name: string,
): ReturnType<typeof page.getByRole> {
  return page
    .getByRole("group", { name: group })
    .getByRole("radio", { name, exact: true });
}

// Chooses name in the panel's group, which stays open, by clicking its
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

export {
  appliedChoice,
  choice,
  choose,
  closePanel,
  openPanel,
  panelButton,
  sitePanel,
};
