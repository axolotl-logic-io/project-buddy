import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { ThemePicker } from "@/components/theme-picker.tsx";
import { THEMES } from "@/themes/themes.ts";
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

beforeEach(() => {
  document.documentElement.setAttribute("data-theme", "gravy-falls");
  document.documentElement.setAttribute("data-mode", "system");
});

describe("ThemePicker", () => {
  test("offers every theme and the three modes, by name", () => {
    render(<ThemePicker />);
    openPicker();

    expect(
      within(group(COPY.theme.themeLabel))
        .getAllByRole("menuitemradio")
        .map((item) => item.textContent),
    ).toEqual(THEMES.map(({ name }) => name));
    expect(
      within(group(COPY.theme.modeLabel))
        .getAllByRole("menuitemradio")
        .map((item) => item.textContent),
    ).toEqual([
      COPY.theme.modes.light,
      COPY.theme.modes.dark,
      COPY.theme.modes.system,
    ]);
  });

  test("checks the choice applied to the page", () => {
    document.documentElement.setAttribute("data-mode", "dark");
    render(<ThemePicker />);
    openPicker();

    expect(choice(COPY.theme.themeLabel, "Gravy Falls")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(choice(COPY.theme.modeLabel, COPY.theme.modes.dark)).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      choice(COPY.theme.modeLabel, COPY.theme.modes.system),
    ).toHaveAttribute("aria-checked", "false");
  });

  test("applies a mode at once and stays open for the next choice", async () => {
    render(<ThemePicker />);
    openPicker();

    fireEvent.click(choice(COPY.theme.modeLabel, COPY.theme.modes.light));

    expect(document.documentElement).toHaveAttribute("data-mode", "light");
    await waitFor(() => {
      expect(
        choice(COPY.theme.modeLabel, COPY.theme.modes.light),
      ).toHaveAttribute("aria-checked", "true");
    });
  });
});
