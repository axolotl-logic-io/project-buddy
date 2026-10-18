// "use_case_choose_theme", without the Cookie Store API: browsers before
// 2025, and pages not on HTTPS or localhost, have none, and the picker still
// applies a choice and saves it, through its Server Action (#42). That the
// saved cookie reaches the next page is
// save-theme-choice-action.server.test.ts's and
// src/app/layout-first-paint.test.tsx's to check.
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { ThemePicker } from "@/components/theme-picker.tsx";
import {
  appliedChoice,
  choose,
  closePicker,
  openPicker,
} from "@/components/theme-picker-test-kit.ts";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import {
  DEFAULT_THEME_CHOICE,
  THEMES,
  type ThemeChoice,
} from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

const COOKIE_STORE = "cookieStore";

// Where a browser may define the Cookie Store API, with its definition
// there, put back after the tests.
const COOKIE_STORE_OWNERS: readonly object[] = [globalThis, Window.prototype];
const savedDefinitions = COOKIE_STORE_OWNERS.map((owner) =>
  Object.getOwnPropertyDescriptor(owner, COOKIE_STORE),
);

// A theme other than the default, so that a choice that didn't apply shows.
const OTHER_THEME = THEMES.find(({ id }) => id !== DEFAULT_THEME_CHOICE.theme);
if (OTHER_THEME === undefined) {
  throw new Error("use_case_choose_theme needs a theme besides the default");
}

const OTHER_THEME_DARK: ThemeChoice = { theme: OTHER_THEME.id, mode: "dark" };

beforeAll(() => {
  for (const owner of COOKIE_STORE_OWNERS) {
    Reflect.deleteProperty(owner, COOKIE_STORE);
  }
  action.saveThemeChoiceAction.mockResolvedValue();
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
});

afterAll(() => {
  COOKIE_STORE_OWNERS.forEach((owner, index) => {
    const definition = savedDefinitions[index];
    if (definition !== undefined) {
      Object.defineProperty(owner, COOKIE_STORE, definition);
    }
  });
});

describe("use_case_choose_theme", () => {
  test("saves the choice without the Cookie Store API", async () => {
    expect(COOKIE_STORE in globalThis).toBe(false);
    await render(<ThemePicker />);

    await openPicker();
    await choose(THEME_COPY.themeLabel, OTHER_THEME.name);
    await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    await closePicker();

    expect(appliedChoice()).toStrictEqual(OTHER_THEME_DARK);
    expect(action.saveThemeChoiceAction).toHaveBeenLastCalledWith(
      OTHER_THEME_DARK,
    );
  });
});
