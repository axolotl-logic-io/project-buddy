"use client";

import { type ChangeEvent, type JSX, useId } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { chooseMode } from "@/themes/choose-theme.ts";
import { THEME_SWATCHES } from "@/themes/theme-choice.ts";
import { useThemeChoice } from "@/themes/use-theme-choice.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

function chooseModeOf(event: ChangeEvent<HTMLInputElement>): void {
  chooseMode(event.currentTarget.value);
}

// Three fixed texture swatches, applied at once and remembered in this browser.
export function AppearanceChoices({
  settings = false,
}: {
  readonly settings?: boolean;
} = {}): JSX.Element {
  let groupClass = "flex flex-col";
  if (settings === true) {
    groupClass += " appearance-settings";
  }
  const choice = useThemeChoice();
  const modeGroupId = useId();

  return (
    <fieldset className={groupClass}>
      <legend className="panel-label">{THEME_COPY.modeLabel}</legend>
      <div className="panel-modes">
        {THEME_SWATCHES.map(({ mode, attributes }) => (
          <label className="panel-mode" key={mode}>
            <input
              checked={mode === choice.mode}
              className="theme-choice-input"
              name={modeGroupId}
              onChange={chooseModeOf}
              type="radio"
              value={mode}
            />
            <span aria-hidden="true" className="theme-swatch" {...attributes}>
              <span className="theme-swatch-panel" />
              <span className="theme-swatch-accent" />
            </span>
            {THEME_COPY.modes[mode]}
            <span aria-hidden="true" className="theme-choice-mark">
              {mode === choice.mode && <Icon name="check" />}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
