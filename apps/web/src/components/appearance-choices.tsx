"use client";

import { type ChangeEvent, type JSX, useId } from "react";
import { chooseMode } from "@/themes/choose-theme.ts";
import { THEME_MODES } from "@/themes/themes.ts";
import { useThemeChoice } from "@/themes/use-theme-choice.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

function chooseModeOf(event: ChangeEvent<HTMLInputElement>): void {
  chooseMode(event.currentTarget.value);
}

// The parchment theme's mode (Light, Dark or System), applied at once
// and remembered in this browser.
export function AppearanceChoices({
  settings = false,
}: {
  readonly settings?: boolean;
} = {}): JSX.Element {
  let inputClass = "sr-only";
  let groupClass = "flex flex-col";
  if (settings === true) {
    inputClass = "appearance-setting-input";
    groupClass += " appearance-settings";
  }
  const choice = useThemeChoice();
  const modeGroupId = useId();

  return (
    <fieldset className={groupClass}>
      <legend className="menu-label">{THEME_COPY.modeLabel}</legend>
      <div className="menu-modes">
        {THEME_MODES.map((mode) => (
          <label className="menu-mode" key={mode}>
            <input
              checked={mode === choice.mode}
              className={inputClass}
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
  );
}
