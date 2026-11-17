// "use_case_choose_theme" in use-cases/appearance.md, in Chromium and
// WebKit: what choosing a mode in the real site panel does to this
// page, at once. appearance-choices-save.browser.test.tsx checks the choice
// is saved without the Cookie Store API;
// save-theme-choice-action.server.test.ts that a saved choice survives
// signing out, and test/app/layout-first-paint.test.tsx that it shows from the
// next page's first paint. The site's stylesheet comes from
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
import { SitePanel } from "@/components/site-panel.tsx";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  parseThemeChoiceCookie,
  THEME_COOKIE_NAME,
  THEME_PRE_PAINT_SCRIPT,
} from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE, THEME_MODES, THEMES } from "@/themes/themes.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import {
  ALL_FONTS_LOADED,
  fontsLoaded,
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport as resize,
} from "../viewports-test-kit.ts";
import {
  appliedChoice,
  choice,
  choose,
  closePanel,
  openPanel,
} from "./site-panel-test-kit.ts";

// Saving the choice is a round trip to the server, which
// save-theme-choice-action.server.test.ts covers.
const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

// Vitest's own viewport for browser tests, restored after each test.
const MODE_COUNT = 3;
const TEXTURE_SIZE = 1024;
const SWATCH_TARGET_PX = 44;
const BACKGROUND_URL = /^url\(["']?(?<url>[^"')]+)["']?\)$/u;

const VITEST_VIEWPORT = { width: 414, height: 896 } as const;

const siteTitle = page.getByRole("heading", {
  level: 1,
  name: SITE_COPY.name,
});

// The sign-in page's frame, under the header's site panel, as a signed-out
// visitor first meets them.
async function renderSignInPage(): Promise<void> {
  await render(
    <>
      <SitePanel links={null} />
      <SignInPanel intro={SITE_COPY.name}>{null}</SignInPanel>
    </>,
  );
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

// How many lines of text an element takes: its height over its line height,
// to the nearest line.
function lineCount(element: Element): number {
  return Math.round(
    element.getBoundingClientRect().height /
      Number.parseFloat(getComputedStyle(element).lineHeight),
  );
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
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await commands.emulateColorScheme("light");
  await resize(VITEST_VIEWPORT);
});

describe("use_case_choose_theme", () => {
  test("offers only the three named texture swatches", async () => {
    await openPanel();
    expect(page.getByRole("dialog").getByRole("radio").all()).toHaveLength(
      MODE_COUNT,
    );
    expect(appliedColors()).toBe("light");
    await Promise.all(
      THEME_MODES.map((mode) =>
        expect
          .element(choice(THEME_COPY.modeLabel, THEME_COPY.modes[mode]))
          .toBeInTheDocument(),
      ),
    );
    await Promise.all(
      ["Light", "Dark", "System"].map((name) =>
        expect
          .element(page.getByRole("radio", { name, exact: true }))
          .not.toBeInTheDocument(),
      ),
    );
  });

  test.each(THEME_MODES)(
    "%s has a tooltip with no caption or content over the texture",
    async (mode) => {
      await openPanel();
      const radio = choice(THEME_COPY.modeLabel, THEME_COPY.modes[mode]);
      const label = radio.element().closest("label");
      if (label === null) {
        throw new Error("The swatch has no label");
      }
      // The decorative material is empty and displays the actual page texture.
      const material = label.querySelector('[aria-hidden="true"]');
      if (material === null) {
        throw new Error("The swatch has no material");
      }
      expect(material.childNodes).toHaveLength(0);
      expect(getComputedStyle(material).backgroundImage).toContain(".webp");
      const tooltip = page.getByRole("tooltip", {
        name: THEME_COPY.modes[mode],
      });
      await expect.element(tooltip).not.toBeInTheDocument();
      await radio.hover();
      await expect.element(tooltip).toBeVisible();
      await tooltip.hover();
      await expect.element(tooltip).toBeVisible();
      await userEvent.keyboard("{Escape}");
      await expect.element(tooltip).not.toBeInTheDocument();
      await page.getByRole("heading", { name: THEME_COPY.picker }).hover();
      await radio.hover();
      await expect.element(tooltip).toBeVisible();
      await page.getByRole("heading", { name: THEME_COPY.picker }).hover();
      await expect.element(tooltip).not.toBeInTheDocument();
      expect(label.textContent?.trim()).toBe(THEME_COPY.modes[mode]);
    },
  );

  test("Escape dismisses a focused name without changing the choice or closing the panel", async () => {
    await openPanel();
    await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    const radio = choice(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    const tooltip = page.getByRole("tooltip", { name: THEME_COPY.modes.dark });
    await expect.element(tooltip).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(tooltip).not.toBeInTheDocument();
    await expect.element(radio).toHaveFocus();
    await expect.element(radio).toBeChecked();
    await expect.element(page.getByRole("dialog")).toBeVisible();
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .element(
        page.getByRole("tooltip", { name: THEME_COPY.modes["soot-brass"] }),
      )
      .toBeVisible();
  });

  test.each(["gravy-falls", "ghost-hasslers", "ay-liens"])(
    "a saved %s choice uses parchment and keeps Dark before paint",
    (retiredTheme) => {
      const value = `${retiredTheme}.dark`;
      vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(
        `${THEME_COOKIE_NAME}=${value}`,
      );
      const script = document.createElement("script");
      script.textContent = THEME_PRE_PAINT_SCRIPT;
      document.head.append(script);
      script.remove();
      expect(appliedChoice()).toEqual({ theme: "parchment", mode: "dark" });
      expect(parseThemeChoiceCookie(value)).toEqual(appliedChoice());
      expect(appliedColors()).toBe("dark");
    },
  );
  test("choosing Espresso Leather applies it at once", async () => {
    await openPanel();
    await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    await closePanel();

    expect(appliedChoice()).toStrictEqual({
      theme: DEFAULT_THEME_CHOICE.theme,
      mode: "dark",
    });
    expect(appliedColors()).toBe("dark");
  });

  test.each(THEME_MODES)(
    "%s applies, saves and ignores operating system changes",
    async (mode) => {
      await openPanel();
      await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
      await choose(THEME_COPY.modeLabel, THEME_COPY.modes[mode]);
      expect(appliedChoice().mode).toBe(mode);
      expect(action.saveThemeChoiceAction).toHaveBeenLastCalledWith({
        theme: "parchment",
        mode,
      });
      const rootStyle = getComputedStyle(document.documentElement);
      expect(rootStyle.getPropertyValue("--background")).toBe(
        rootStyle.getPropertyValue(`--${mode}-background`),
      );
      const texture = getComputedStyle(document.body).backgroundImage;
      expect(texture).toContain(".webp");
      const { url = "" } = BACKGROUND_URL.exec(texture)?.groups ?? {};
      const image = new Image();
      image.src = url;
      await image.decode();
      expect(image.naturalWidth).toBe(TEXTURE_SIZE);
      expect(image.naturalHeight).toBe(TEXTURE_SIZE);
      await commands.emulateColorScheme("dark");
      expect(getComputedStyle(document.body).backgroundImage).toBe(texture);
      await commands.emulateColorScheme("light");
      expect(getComputedStyle(document.body).backgroundImage).toBe(texture);
      await closePanel();
    },
  );

  test.each([
    { value: "parchment.light", mode: "light" },
    { value: "parchment.dark", mode: "dark" },
    { value: "parchment.soot-brass", mode: "soot-brass" },
    { value: "parchment.system", mode: "light" },
    { value: "unknown.unknown", mode: "light" },
  ])("restores $value before paint", ({ value, mode }) => {
    vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(
      `${THEME_COOKIE_NAME}=${value}`,
    );
    const script = document.createElement("script");
    script.textContent = THEME_PRE_PAINT_SCRIPT;
    document.head.append(script);
    script.remove();
    expect(appliedChoice()).toEqual({ theme: "parchment", mode });
    expect(parseThemeChoiceCookie(value)).toEqual(appliedChoice());
  });

  test("arrow keys choose the next swatch with visible focus", async () => {
    await openPanel();
    const first = choice(
      THEME_COPY.modeLabel,
      THEME_COPY.modes.light,
    ).element();
    if (!(first instanceof HTMLInputElement)) {
      throw new Error("The swatch has no native radio");
    }
    await userEvent.keyboard("{Shift}");
    first.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(choice(THEME_COPY.modeLabel, THEME_COPY.modes["soot-brass"]))
      .toBeChecked();
    expect(appliedChoice().mode).toBe("soot-brass");
    const label = document.activeElement?.closest("label");
    if (label === null || label === undefined) {
      throw new Error("The focused swatch has no label");
    }
    await expect
      .poll(() => getComputedStyle(label).outlineStyle)
      .toBe("dashed");
  });

  test.each([NARROWEST_VIEWPORT, PHONE_VIEWPORT])(
    "the swatches fit at $width px with 44 px targets",
    async (viewport) => {
      await resize(viewport);
      await openPanel();
      const dialog = page.getByRole("dialog").element();
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
      for (const mode of THEME_MODES) {
        const radio = choice(
          THEME_COPY.modeLabel,
          THEME_COPY.modes[mode],
        ).element();
        const { width: targetWidth, height } = radio.getBoundingClientRect();
        expect(targetWidth).toBeGreaterThanOrEqual(SWATCH_TARGET_PX);
        expect(height).toBeGreaterThanOrEqual(SWATCH_TARGET_PX);
      }
    },
  );

  for (const { id, name } of THEMES) {
    test(`the ${name} theme: its own fonts, and the site's name on one line, wide and on a phone`, async () => {
      await openPanel();
      await closePanel();
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
