import { describe, expect, test } from "vitest";
import {
  DEFAULT_THEME_CHOICE,
  parseThemeChoice,
  THEME_IDS,
  THEMES,
} from "@/themes/themes.ts";

const KEBAB_CASE = /^[a-z]+(?:-[a-z]+)*$/u;

describe("parseThemeChoice", () => {
  test("keeps a known theme and mode", () => {
    expect(parseThemeChoice({ theme: "gravy-falls", mode: "dark" })).toEqual({
      theme: "gravy-falls",
      mode: "dark",
    });
  });

  test("an unknown theme is the default theme, keeping the mode", () => {
    expect(parseThemeChoice({ theme: "no-such-theme", mode: "light" })).toEqual(
      { theme: DEFAULT_THEME_CHOICE.theme, mode: "light" },
    );
  });

  test("an unknown mode is the default mode, keeping the theme", () => {
    expect(parseThemeChoice({ theme: "gravy-falls", mode: "dim" })).toEqual({
      theme: "gravy-falls",
      mode: DEFAULT_THEME_CHOICE.mode,
    });
  });

  test("missing or malformed parts are the default", () => {
    expect(parseThemeChoice({ theme: null, mode: undefined })).toEqual(
      DEFAULT_THEME_CHOICE,
    );
    expect(parseThemeChoice({ theme: 7, mode: { mode: "dark" } })).toEqual(
      DEFAULT_THEME_CHOICE,
    );
  });
});

describe("THEMES", () => {
  test("Gravy Falls is the default, under System", () => {
    expect(DEFAULT_THEME_CHOICE).toEqual({
      theme: "gravy-falls",
      mode: "system",
    });
  });

  test("ids are unique kebab-case and every theme has a name", () => {
    expect(new Set(THEME_IDS).size).toBe(THEMES.length);
    for (const { id, name } of THEMES) {
      expect(id).toMatch(KEBAB_CASE);
      expect(name).not.toBe("");
    }
  });
});
