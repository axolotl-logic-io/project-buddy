import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { preload } from "react-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ThemePicker } from "@/components/theme-picker.tsx";
import { chooseMode, chooseTheme } from "@/themes/choose-theme.ts";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { readAppliedMode } from "@/themes/theme-choice.ts";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import {
  DEFAULT_THEME_CHOICE,
  THEME_MODES,
  THEMES,
  type ThemeId,
} from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

function openPicker(): void {
  fireEvent.keyDown(screen.getByRole("button", { name: THEME_COPY.picker }), {
    key: "Enter",
  });
}

function group(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

function choice(groupName: string, name: string): HTMLElement {
  return within(group(groupName)).getByRole("menuitemradio", { name });
}

// The names of a group's choices, or of only its checked ones.
function choiceNames(
  groupName: string,
  options: { readonly checked?: boolean } = {},
): (string | null)[] {
  return within(group(groupName))
    .getAllByRole("menuitemradio", options)
    .map((item) => item.textContent);
}

const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

// The font files preload was asked for, in order.
function preloadedUrls(): unknown[] {
  return vi.mocked(preload).mock.calls.map(([url]) => url);
}

function themeFontUrls(theme: ThemeId): (string | undefined)[] {
  return THEME_TYPEFACES[theme].map((typeface) => TYPEFACE_FONT_URLS[typeface]);
}

function themeName(theme: ThemeId): string {
  return THEMES.find(({ id }) => id === theme)?.name ?? theme;
}

beforeEach(() => {
  vi.mocked(preload).mockClear();
  action.saveThemeChoiceAction.mockResolvedValue();
  chooseTheme(DEFAULT_THEME_CHOICE.theme);
  chooseMode(DEFAULT_THEME_CHOICE.mode);
});

describe("ThemePicker", () => {
  test("offers every theme and the three modes, by name", () => {
    render(<ThemePicker />);
    openPicker();

    expect(choiceNames(THEME_COPY.themeLabel)).toEqual(
      THEMES.map(({ name }) => name),
    );
    expect(choiceNames(THEME_COPY.modeLabel)).toEqual([
      THEME_COPY.modes.light,
      THEME_COPY.modes.dark,
      THEME_COPY.modes.system,
    ]);
  });

  test.each(THEMES)(
    "checks the choice applied to the page: $name",
    ({ id, name }) => {
      chooseTheme(id);
      chooseMode("dark");
      render(<ThemePicker />);
      openPicker();

      expect(choiceNames(THEME_COPY.themeLabel, { checked: true })).toEqual([
        name,
      ]);
      expect(choiceNames(THEME_COPY.modeLabel, { checked: true })).toEqual([
        THEME_COPY.modes.dark,
      ]);
    },
  );

  test("applies a mode at once and stays open for the next choice", async () => {
    render(<ThemePicker />);
    openPicker();

    fireEvent.click(choice(THEME_COPY.modeLabel, THEME_COPY.modes.light));

    expect(readAppliedMode()).toBe("light");
    await waitFor(() => {
      expect(
        choice(THEME_COPY.modeLabel, THEME_COPY.modes.light),
      ).toHaveAttribute("aria-checked", "true");
    });
  });
});

describe("ThemePicker font preloads", () => {
  test("opening the picker preloads no font", () => {
    render(<ThemePicker />);
    openPicker();

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(preload).not.toHaveBeenCalled();
  });

  test("focusing another theme preloads exactly its fonts", () => {
    render(<ThemePicker />);
    openPicker();

    fireEvent.focus(choice(THEME_COPY.themeLabel, themeName("ghost-hasslers")));

    expect(preloadedUrls()).toEqual(themeFontUrls("ghost-hasslers"));
  });

  test("pointing at another theme preloads exactly its fonts", () => {
    render(<ThemePicker />);
    openPicker();

    fireEvent.pointerEnter(
      choice(THEME_COPY.themeLabel, themeName("ay-liens")),
    );

    expect(preloadedUrls()).toEqual(themeFontUrls("ay-liens"));
  });

  test("the applied theme and the modes preload nothing", () => {
    render(<ThemePicker />);
    openPicker();
    const items = [
      choice(THEME_COPY.themeLabel, themeName(DEFAULT_THEME_CHOICE.theme)),
      ...THEME_MODES.map((mode) =>
        choice(THEME_COPY.modeLabel, THEME_COPY.modes[mode]),
      ),
    ];

    for (const item of items) {
      fireEvent.focus(item);
      fireEvent.pointerEnter(item);
    }

    expect(preload).not.toHaveBeenCalled();
  });
});
