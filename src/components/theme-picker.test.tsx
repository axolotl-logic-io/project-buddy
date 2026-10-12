import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { ThemePicker } from "@/components/theme-picker.tsx";
import {
  chooseMode,
  chooseTheme,
  readAppliedMode,
} from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE, THEMES } from "@/themes/themes.ts";
import { COPY } from "@/ui/copy.ts";

function openPicker(): void {
  fireEvent.keyDown(screen.getByRole("button", { name: COPY.theme.picker }), {
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

beforeEach(() => {
  chooseTheme(DEFAULT_THEME_CHOICE.theme);
  chooseMode(DEFAULT_THEME_CHOICE.mode);
});

describe("ThemePicker", () => {
  test("offers every theme and the three modes, by name", () => {
    render(<ThemePicker />);
    openPicker();

    expect(choiceNames(COPY.theme.themeLabel)).toEqual(
      THEMES.map(({ name }) => name),
    );
    expect(choiceNames(COPY.theme.modeLabel)).toEqual([
      COPY.theme.modes.light,
      COPY.theme.modes.dark,
      COPY.theme.modes.system,
    ]);
  });

  test.each(THEMES)(
    "checks the choice applied to the page: $name",
    ({ id, name }) => {
      chooseTheme(id);
      chooseMode("dark");
      render(<ThemePicker />);
      openPicker();

      expect(choiceNames(COPY.theme.themeLabel, { checked: true })).toEqual([
        name,
      ]);
      expect(choiceNames(COPY.theme.modeLabel, { checked: true })).toEqual([
        COPY.theme.modes.dark,
      ]);
    },
  );

  test("applies a mode at once and stays open for the next choice", async () => {
    render(<ThemePicker />);
    openPicker();

    fireEvent.click(choice(COPY.theme.modeLabel, COPY.theme.modes.light));

    expect(readAppliedMode()).toBe("light");
    await waitFor(() => {
      expect(
        choice(COPY.theme.modeLabel, COPY.theme.modes.light),
      ).toHaveAttribute("aria-checked", "true");
    });
  });
});
