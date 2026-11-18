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
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  parseThemeChoiceCookie,
  THEME_COOKIE_NAME,
  THEME_PRE_PAINT_SCRIPT,
} from "@/themes/theme-choice.ts";
import {
  DEFAULT_THEME_CHOICE,
  THEME_MODES,
  THEMES,
  type ThemeMode,
} from "@/themes/themes.ts";
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
import type { MaterialPixels } from "./appearance-material-test-kit.mts";
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
const SWATCH_TARGET_PX = 44;
const COMPACT_ROW_MAX_WIDTH = 460;
// The first image a computed background-image shows, such as
// url("/textures/ivory-vellum.webp") among gradients.
// Chromium can round channels differently after focusing a masked swatch.
// Four steps out of 255 cover that rendering difference. A tint still fails.
const MATERIAL_CHANNEL_TOLERANCE = 4;
const PAINT_URL = /url\("(?<url>[^"]+)"\)/u;
// The colour tokens that tell the appearances apart.
const PALETTE_TOKENS = ["background", "surface", "foreground", "primary"];

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

// The page's palette: the colours its main tokens show.
function palette(): string {
  const style = getComputedStyle(document.documentElement);
  return PALETTE_TOKENS.map((token) =>
    style.getPropertyValue(`--${token}`).trim(),
  ).join(" ");
}

// Which appearance's palette the page shows, found by showing each one in
// turn through the real cascade and comparing; "unclear" if none or more than
// one matches.
function appliedColors(): ThemeMode | "unclear" {
  const root = document.documentElement;
  const applied = palette();
  const chosen = root.getAttribute(MODE_ATTRIBUTE);
  const matches = THEME_MODES.filter((candidate) => {
    root.setAttribute(MODE_ATTRIBUTE, candidate);
    return palette() === applied;
  });
  if (chosen === null) {
    root.removeAttribute(MODE_ATTRIBUTE);
  } else {
    root.setAttribute(MODE_ATTRIBUTE, chosen);
  }
  const [mode] = matches;
  if (matches.length !== 1 || mode === undefined) {
    return "unclear";
  }
  return mode;
}

// The swatch's texture: the element inside its label that shows a
// background image. Ornament drawn over or around it may sit beside it.
function material(name: string): HTMLElement {
  const label = choice(THEME_COPY.modeLabel, name).element().closest("label");
  if (label === null) {
    throw new Error(`The ${name} swatch has no label`);
  }
  const shown = [label, ...label.querySelectorAll<HTMLElement>("*")].find(
    (element) => PAINT_URL.test(getComputedStyle(element).backgroundImage),
  );
  if (shown === undefined) {
    throw new Error(`The ${name} swatch shows no texture image`);
  }
  return shown;
}

// Waits for a computed background or mask image to decode.
async function decodePaint(backgroundImage: string): Promise<void> {
  const { url = "" } = PAINT_URL.exec(backgroundImage)?.groups ?? {};
  const image = new Image();
  image.src = url;
  await image.decode();
}

// Compare rendered pixels and dimensions so meaningful tints or geometry changes fail.
function materialDifference(
  previous: MaterialPixels,
  next: MaterialPixels,
): number {
  if (
    next.width !== previous.width ||
    next.height !== previous.height ||
    next.channels.length !== previous.channels.length
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return next.channels.reduce(
    (max, channel, index) =>
      Math.max(max, Math.abs(channel - (previous.channels[index] ?? 0))),
    0,
  );
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
    expect(appliedColors()).toBe(DEFAULT_THEME_CHOICE.mode);
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
      // The texture carries no caption, and whatever the swatch draws besides
      // its radio and tooltip, such as ornament, is hidden from assistive
      // technology, so the radio's name is all it announces.
      const texture = material(THEME_COPY.modes[mode]);
      expect(texture.textContent?.trim()).toBe("");
      expect(texture.closest('[aria-hidden="true"]')).not.toBeNull();
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
      await page.getByText(THEME_COPY.modeLabel, { exact: true }).hover();
      await radio.hover();
      await expect.element(tooltip).toBeVisible();
      await page.getByText(THEME_COPY.modeLabel, { exact: true }).hover();
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

  test.each([LAPTOP_VIEWPORT, NARROWEST_VIEWPORT])(
    "Settings keeps compact swatches and tooltips clear of the legend at $width px",
    async (viewport) => {
      await resize(viewport);
      await render(<AppearanceChoices settings={true} />);
      const group = page.getByRole("group", { name: THEME_COPY.modeLabel });
      const first = group.getByRole("radio", { name: THEME_COPY.modes.light });
      const last = group.getByRole("radio", { name: THEME_COPY.modes.dark });
      const rowWidth =
        last.element().getBoundingClientRect().right -
        first.element().getBoundingClientRect().left;
      expect(rowWidth).toBeLessThanOrEqual(COMPACT_ROW_MAX_WIDTH);
      await first.hover();
      const tooltip = page.getByRole("tooltip", {
        name: THEME_COPY.modes.light,
      });
      await expect.element(tooltip).toBeVisible();
      const legend = group.element().querySelector("legend");
      if (legend === null) {
        throw new Error("The theme choices have no legend");
      }
      expect(
        tooltip.element().getBoundingClientRect().top,
      ).toBeGreaterThanOrEqual(legend.getBoundingClientRect().bottom);
    },
  );

  test.each(THEME_MODES)(
    "%s tooltip never tints the rendered material",
    async (mode) => {
      await render(<AppearanceChoices settings={true} />);
      const radio = choice(THEME_COPY.modeLabel, THEME_COPY.modes[mode]);
      await radio.click();
      await page
        .getByRole("heading", { name: SITE_COPY.name, exact: true })
        .hover();
      await userEvent.keyboard("{Escape}");
      const texture = material(THEME_COPY.modes[mode]);
      await decodePaint(getComputedStyle(texture).backgroundImage);
      const { selector } = page.elementLocator(texture);
      const uncovered = await commands.materialPixels(selector);
      await radio.hover();
      await expect
        .element(page.getByRole("tooltip", { name: THEME_COPY.modes[mode] }))
        .toBeVisible();
      const covered = await commands.materialPixels(selector);
      expect(materialDifference(uncovered, covered)).toBeLessThanOrEqual(
        MATERIAL_CHANNEL_TOLERANCE,
      );
    },
  );

  test.each(
    THEME_MODES.flatMap((mode) => [
      { mode, settings: true },
      { mode, settings: false },
    ]),
  )(
    "$mode keeps every material unchanged when settings=$settings",
    async ({ mode, settings }) => {
      if (settings) {
        await render(<AppearanceChoices settings={true} />);
      } else {
        await openPanel();
      }
      const materials = THEME_MODES.map((swatchMode) =>
        material(THEME_COPY.modes[swatchMode]),
      );
      await Promise.all(
        materials.flatMap((texture) =>
          [
            getComputedStyle(texture).backgroundImage,
            getComputedStyle(texture, "::before").maskImage,
            getComputedStyle(texture, "::after").maskImage,
          ]
            .filter((paint) => PAINT_URL.test(paint))
            .map(decodePaint),
        ),
      );
      const selectors = materials.map(
        (texture) => page.elementLocator(texture).selector,
      );
      const before = await Promise.all(
        selectors.map((selector) => commands.materialPixels(selector)),
      );
      await choose(THEME_COPY.modeLabel, THEME_COPY.modes[mode]);
      await userEvent.keyboard("{Escape}");
      const after = await Promise.all(
        selectors.map((selector) => commands.materialPixels(selector)),
      );
      for (const [index, previous] of before.entries()) {
        const next = after[index];
        if (next === undefined) {
          throw new Error("A swatch disappeared after changing appearance");
        }
        expect(materialDifference(previous, next)).toBeLessThanOrEqual(
          MATERIAL_CHANNEL_TOLERANCE,
        );
      }
    },
  );

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
      expect(appliedColors()).toBe(mode);
      const texture = getComputedStyle(document.body).backgroundImage;
      expect(texture, "the page shows a texture image").toMatch(PAINT_URL);
      await decodePaint(texture);
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
