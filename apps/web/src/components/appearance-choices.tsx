"use client";

import { type ChangeEvent, type JSX, useCallback, useId } from "react";
import { chooseMode, chooseTheme } from "@/themes/choose-theme.ts";
import { preloadThemeFonts } from "@/themes/preload-theme-fonts.ts";
import { THEME_MODES, THEMES, type ThemeId } from "@/themes/themes.ts";
import { useThemeChoice } from "@/themes/use-theme-choice.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

function chooseThemeOf(event: ChangeEvent<HTMLInputElement>): void {
  chooseTheme(event.currentTarget.value);
}

function chooseModeOf(event: ChangeEvent<HTMLInputElement>): void {
  chooseMode(event.currentTarget.value);
}

// A theme's choice, which starts loading the theme's fonts when it is
// pointed at or focused, so choosing it shows them without a flash of the
// fallback font. The applied theme's fonts came with the page.
function ThemeChoice({
  theme,
  label,
  appliedTheme,
  group,
}: {
  readonly theme: ThemeId;
  readonly label: string;
  readonly appliedTheme: ThemeId;
  readonly group: string;
}): JSX.Element {
  const preview = useCallback((): void => {
    preloadThemeFonts(theme, appliedTheme);
  }, [theme, appliedTheme]);
  return (
    <label className="menu-choice" onPointerEnter={preview}>
      <input
        checked={theme === appliedTheme}
        className="menu-radio"
        name={group}
        onChange={chooseThemeOf}
        onFocus={preview}
        type="radio"
        value={theme}
      />
      {label}
    </label>
  );
}

// The user's theme and mode (Light, Dark or System), as two groups of
// radio buttons. A choice restyles the page at once and is remembered in
// this browser.
export function AppearanceChoices(): JSX.Element {
  const choice = useThemeChoice();
  const themeGroupId = useId();
  const modeGroupId = useId();

  return (
    <>
      <fieldset className="flex flex-col">
        <legend className="menu-label">{THEME_COPY.themeLabel}</legend>
        {THEMES.map(({ id, name }) => (
          <ThemeChoice
            appliedTheme={choice.theme}
            group={themeGroupId}
            key={id}
            label={name}
            theme={id}
          />
        ))}
      </fieldset>
      <fieldset className="flex flex-col">
        <legend className="menu-label">{THEME_COPY.modeLabel}</legend>
        <div className="menu-modes">
          {THEME_MODES.map((mode) => (
            <label className="menu-mode" key={mode}>
              <input
                checked={mode === choice.mode}
                className="sr-only"
                name={modeGroupId}
                onChange={chooseModeOf}
                type="radio"
                value={mode}
              />
              {THEME_COPY.modes[mode]}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
