import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { chooseMode, chooseTheme } from "@/themes/choose-theme.ts";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";

const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

function rootAttributes(): { theme: string | null; mode: string | null } {
  const root = document.documentElement;
  return {
    theme: root.getAttribute("data-theme"),
    mode: root.getAttribute("data-mode"),
  };
}

beforeEach(() => {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    root.setAttribute(name, value);
  }
  action.saveThemeChoiceAction.mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("chooseTheme and chooseMode", () => {
  test("restyle the page at once and save the whole choice", () => {
    chooseMode("dark");
    chooseTheme("gravy-falls");

    expect(rootAttributes()).toEqual({ theme: "gravy-falls", mode: "dark" });
    expect(action.saveThemeChoiceAction).toHaveBeenLastCalledWith({
      theme: "gravy-falls",
      mode: "dark",
    });
  });

  test("an unknown value applies and saves the default", () => {
    chooseMode("light");

    chooseTheme("no-such-theme");
    chooseMode("dim");

    expect(rootAttributes()).toEqual({
      theme: "gravy-falls",
      mode: "system",
    });
    expect(action.saveThemeChoiceAction).toHaveBeenLastCalledWith({
      theme: "gravy-falls",
      mode: "system",
    });
  });

  test("still restyle the page when the choice can't be saved", async () => {
    action.saveThemeChoiceAction.mockRejectedValue(new Error("offline"));

    chooseMode("dark");
    // Vitest fails the run on an unhandled rejection; a macrotask lets one
    // surface.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(action.saveThemeChoiceAction).toHaveBeenCalled();
    expect(rootAttributes().mode).toBe("dark");
  });
});
