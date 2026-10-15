// "use_case_choose_theme" in use-cases/appearance.md, in Chromium and
// WebKit: what choosing a theme or mode in the real ThemePicker does to this
// page, at once. That a choice is saved, reaches the next page from its
// first paint and survives signing out needs the server, so it stays in
// e2e/theme.spec.ts. The site's stylesheet comes from
// vitest.browser-setup.ts; next/font can't run here, so the fonts come from
// theme-fonts-test-kit.ts.
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { ThemePicker } from "@/components/theme-picker.tsx";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import {
  ALL_FONTS_LOADED,
  fontsLoaded,
  installThemeFonts,
  loadFonts,
} from "@/themes/theme-fonts-test-kit.ts";
import { DEFAULT_THEME_CHOICE, THEMES } from "@/themes/themes.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { LAPTOP_VIEWPORT, PHONE_VIEWPORT } from "../../e2e/viewports.ts";

// Saving the choice is a round trip to the server, which e2e/theme.spec.ts
// covers.
const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

// Vitest's own viewport for browser tests, restored after each test.
const VITEST_VIEWPORT = { width: 414, height: 896 } as const;

// A theme other than the default, so that a choice that didn't apply shows.
const OTHER_THEME = THEMES.find(({ id }) => id !== DEFAULT_THEME_CHOICE.theme);
if (OTHER_THEME === undefined) {
  throw new Error("use_case_choose_theme needs a theme besides the default");
}

const siteTitle = page.getByRole("heading", {
  level: 1,
  name: SITE_COPY.name,
});

// The sign-in page's frame, under the header's picker, as a signed-out
// visitor first meets them.
async function renderSignInPage(): Promise<void> {
  await render(
    <>
      <ThemePicker />
      <SignInPanel intro={SITE_COPY.name}>{null}</SignInPanel>
    </>,
  );
}

function appliedChoice(): { theme: string | null; mode: string | null } {
  const root = document.documentElement;
  return {
    theme: root.getAttribute(THEME_ATTRIBUTE),
    mode: root.getAttribute(MODE_ATTRIBUTE),
  };
}

// Which of the theme's values for the background the page applies: its
// light one or its dark one; "unclear" if they are the same, or the page
// applies neither.
function appliedColors(): "light" | "dark" | "unclear" {
  const style = getComputedStyle(document.documentElement);
  const applied = style.getPropertyValue("--background");
  const light = style.getPropertyValue("--light-background");
  const dark = style.getPropertyValue("--dark-background");
  if (light === dark) {
    return "unclear";
  }
  if (applied === dark) {
    return "dark";
  }
  if (applied === light) {
    return "light";
  }
  return "unclear";
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

// How many lines of text an element takes: its height over its line height,
// to the nearest line.
function lineCount(element: Element): number {
  return Math.round(
    element.getBoundingClientRect().height /
      Number.parseFloat(getComputedStyle(element).lineHeight),
  );
}

// Resizes the page and waits until it has laid out at the new width.
async function resize(viewport: {
  readonly width: number;
  readonly height: number;
}): Promise<void> {
  await page.viewport(viewport.width, viewport.height);
  await vi.waitFor(() => {
    if (window.innerWidth !== viewport.width) {
      throw new Error(`The page is ${window.innerWidth}px wide`);
    }
  });
  await document.fonts.ready;
}

beforeAll(() => {
  installThemeFonts();
});

beforeEach(async () => {
  action.saveThemeChoiceAction.mockResolvedValue();
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  await renderSignInPage();
});

afterEach(async () => {
  document.documentElement.removeAttribute("data-hide");
  vi.clearAllMocks();
  await commands.emulateColorScheme("light");
  await resize(VITEST_VIEWPORT);
});

describe("use_case_choose_theme", () => {
  test("choosing a theme and Dark applies them at once", async () => {
    await openPicker();
    await choose(THEME_COPY.themeLabel, OTHER_THEME.name);
    await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    await closePicker();

    expect(appliedChoice()).toStrictEqual({
      theme: OTHER_THEME.id,
      mode: "dark",
    });
    expect(appliedColors()).toBe("dark");
  });

  test("System follows the computer's setting", async () => {
    await openPicker();
    await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    await choose(THEME_COPY.modeLabel, THEME_COPY.modes.system);
    await closePicker();

    await commands.emulateColorScheme("dark");
    expect(appliedColors()).toBe("dark");
    await commands.emulateColorScheme("light");
    expect(appliedColors()).toBe("light");
    expect(appliedChoice().mode).toBe("system");
  });

  for (const { id, name } of THEMES) {
    test(`the ${name} theme: its own fonts, and the site's name on one line, wide and on a phone`, async () => {
      await openPicker();
      await choose(THEME_COPY.themeLabel, name);
      await closePicker();
      expect(appliedChoice().theme).toBe(id);

      expect(await fontsLoaded()).toStrictEqual(ALL_FONTS_LOADED);
      await loadFonts();

      await resize(LAPTOP_VIEWPORT);
      expect(lineCount(siteTitle.element()), "wide").toBe(1);
      await resize(PHONE_VIEWPORT);
      expect(lineCount(siteTitle.element()), "on a phone").toBe(1);
    });
  }
});
