// "use_case_choose_theme", the picker's preloads: another theme's fonts
// start loading when the user points at it, or moves the keyboard to it, in
// the open picker, so choosing it shows its typefaces without a flash of the
// fallback font. Each file is preloaded once, and nothing is preloaded for
// the applied theme or on opening. The picker runs with the real
// preload-theme-fonts.ts and React's `preload`, which dedupes per document,
// so each test counts all expected links and rejects unrelated additions.
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
async function waitForFonts(
  urls: readonly (string | undefined)[],
): Promise<void> {
  await vi.waitFor(() => {
    for (const url of urls) {
      if (
        fontPreloadLinks().filter((link) => link.getAttribute("href") === url)
          .length !== 1
      ) {
        throw new Error(`Expected one preload for ${url}`);
      }
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

function unexpectedFontPreloads(
  expected: readonly (string | undefined)[],
): readonly (string | null)[] {
  return addedFontPreloads().filter(
    (url) => !expected.some((expectedUrl) => expectedUrl === url),
  );
}

async function openPickerWithKeyboard(): Promise<void> {
  const trigger = page.getByRole("button", { name: THEME_COPY.picker });
  // Keep WebKit's pointer off the menu so it cannot move keyboard focus.
  await userEvent.hover(trigger);
  trigger.element().focus();
  await userEvent.keyboard("{Enter}");
  await expectFocused("gravy-falls");
}

describe("use_case_choose_theme", () => {
  test("pointing at another theme in the picker preloads its fonts once", async () => {
    await openPicker();
    await vi.waitFor(() => page.getByRole("menu").element());
    expect(addedFontPreloads()).toStrictEqual([]);
    await userEvent.hover(themeItem("ay-liens"));
    const expected = themeFontUrls("ay-liens");
    await waitForFonts(expected);
    expect(preloadCounts(expected)).toEqual(expected.map(() => 1));
    expect(unexpectedFontPreloads(expected)).toEqual([]);
    const linksAfterPreview = fontPreloadLinks();

    await userEvent.hover(
      page
        .getByRole("group", { name: THEME_COPY.modeLabel })
        .getByRole("menuitemradio", { name: THEME_COPY.modes.dark }),
    );
    expect(fontPreloadLinks()).toEqual(linksAfterPreview);
    await userEvent.hover(themeItem("gravy-falls"));
    await expectFocused("gravy-falls");
    expect(fontPreloadLinks()).toEqual(linksAfterPreview);
    await userEvent.hover(themeItem("ay-liens"));
    await expectFocused("ay-liens");
    expect(fontPreloadLinks()).toEqual(linksAfterPreview);
    expect(preloadCounts(expected)).toEqual(expected.map(() => 1));
  });

  test("moving the keyboard to another theme in the picker preloads its fonts once", async () => {
    await openPickerWithKeyboard();
    expect(addedFontPreloads()).toStrictEqual([]);
    await userEvent.keyboard("{ArrowDown}");
    const expected = themeFontUrls("ghost-hasslers");
    await expectFocused("ghost-hasslers");
    await waitForFonts(expected);
    expect(preloadCounts(expected)).toEqual(expected.map(() => 1));
    expect(unexpectedFontPreloads(expected)).toEqual([]);
    const linksAfterPreview = fontPreloadLinks();

    await userEvent.keyboard("{ArrowUp}");
    await expectFocused("gravy-falls");
    expect(fontPreloadLinks()).toEqual(linksAfterPreview);
    await userEvent.keyboard("{ArrowDown}");
    await expectFocused("ghost-hasslers");
    expect(fontPreloadLinks()).toEqual(linksAfterPreview);
    expect(preloadCounts(expected)).toEqual(expected.map(() => 1));
  });
});

function preloadCounts(urls: readonly (string | undefined)[]): number[] {
  return urls.map(
    (url) =>
      fontPreloadLinks().filter((link) => link.getAttribute("href") === url)
        .length,
  );
}
