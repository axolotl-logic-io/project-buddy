// "use_case_choose_theme", the picker's preloads: another theme's fonts
// start loading when the user points at it, or moves the keyboard to it, in
// the open picker, so choosing it shows its typefaces without a flash of the
// fallback font. Each file is preloaded once, and nothing is preloaded for
// the applied theme or on opening. The picker runs with the real
// preload-theme-fonts.ts and React's `preload`, which dedupes per document,
// so each test points at a theme the other doesn't, and the two share no
// font.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ThemePicker } from "@/components/theme-picker.tsx";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { THEMES, type ThemeId } from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { themeFontUrls } from "../themes/font-preloads-test-kit.ts";
import { openPicker } from "./theme-picker-test-kit.ts";

const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

// The font preload links in <head> when the test began.
let linksBefore: ReadonlySet<Element> = new Set();

function fontPreloadLinks(): readonly HTMLLinkElement[] {
  return [...document.head.querySelectorAll("link")].filter(
    (link) => link.rel === "preload" && link.as === "font",
  );
}

// The hrefs of the font preload links added to <head> since the test
// began, in document order.
function addedFontPreloads(): readonly (string | null)[] {
  return fontPreloadLinks()
    .filter((link) => !linksBefore.has(link))
    .map((link) => link.getAttribute("href"));
}

function themeItemName(theme: ThemeId): string {
  return THEMES.find(({ id }) => id === theme)?.name ?? theme;
}

function themeItem(theme: ThemeId): Element {
  return page
    .getByRole("group", { name: THEME_COPY.themeLabel })
    .getByRole("menuitemradio", { name: themeItemName(theme), exact: true })
    .element();
}

// Waits until the theme's item has the keyboard's focus.
async function expectFocused(theme: ThemeId): Promise<void> {
  await vi.waitFor(() => {
    if (document.activeElement !== themeItem(theme)) {
      throw new Error(`${theme} is not focused`);
    }
  });
}

// Waits until count font preloads have been added since the test began.
async function waitForAdded(count: number): Promise<void> {
  await vi.waitFor(() => {
    if (addedFontPreloads().length < count) {
      throw new Error(`${addedFontPreloads().length} preloads added`);
    }
  });
}

beforeEach(async () => {
  action.saveThemeChoiceAction.mockResolvedValue();
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  linksBefore = new Set(fontPreloadLinks());
  await render(<ThemePicker />);
});

describe("use_case_choose_theme", () => {
  test("pointing at another theme in the picker preloads its fonts once", async () => {
    await openPicker();
    await vi.waitFor(() => page.getByRole("menu").element());
    expect(addedFontPreloads()).toStrictEqual([]);

    await userEvent.hover(themeItem("ay-liens"));

    const expected = themeFontUrls("ay-liens");
    await waitForAdded(expected.length);
    expect(addedFontPreloads()).toStrictEqual(expected);

    await userEvent.hover(
      page
        .getByRole("group", { name: THEME_COPY.modeLabel })
        .getByRole("menuitemradio", { name: THEME_COPY.modes.dark }),
    );
    await userEvent.hover(themeItem("ay-liens"));
    await expectFocused("ay-liens");

    expect(addedFontPreloads()).toStrictEqual(expected);
  });

  test("moving the keyboard to another theme in the picker preloads its fonts once", async () => {
    const trigger = page.getByRole("button", { name: THEME_COPY.picker });
    // The pointer stays where the last test left it. WebKit sends a mouse
    // move to the pointer's place after the menu lays out, and Radix then
    // focuses the item under it, so the pointer waits on the trigger, which
    // the menu doesn't cover.
    await userEvent.hover(trigger);
    trigger.element().focus();
    await userEvent.keyboard("{Enter}");
    await expectFocused("gravy-falls");
    expect(addedFontPreloads()).toStrictEqual([]);

    await userEvent.keyboard("{ArrowDown}");

    const expected = themeFontUrls("ghost-hasslers");
    await expectFocused("ghost-hasslers");
    await waitForAdded(expected.length);
    expect(addedFontPreloads()).toStrictEqual(expected);

    await userEvent.keyboard("{ArrowUp}");
    await expectFocused("gravy-falls");
    await userEvent.keyboard("{ArrowDown}");
    await expectFocused("ghost-hasslers");

    expect(addedFontPreloads()).toStrictEqual(expected);
  });
});
