"use client";

import {
  type ChangeEvent,
  type JSX,
  type SyntheticEvent,
  useEffect,
  useId,
} from "react";
import { chooseMode } from "@/themes/choose-theme.ts";
import { THEME_SWATCHES } from "@/themes/theme-choice.ts";
import { useThemeChoice } from "@/themes/use-theme-choice.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

function chooseModeOf(event: ChangeEvent<HTMLInputElement>): void {
  chooseMode(event.currentTarget.value);
}

// The tooltip stays available while the choice has focus, including after a
// touch. Escape dismisses just the tooltip before the site panel handles Escape.
function revealThemeName(event: SyntheticEvent<HTMLElement>): void {
  event.currentTarget
    .closest("label")
    ?.removeAttribute("data-tooltip-dismissed");
}

function focusThemeChoice(event: SyntheticEvent<HTMLInputElement>): void {
  event.currentTarget.focus();
  revealThemeName(event);
}

function listenForTooltipEscape(): () => void {
  function dismissThemeNames(event: KeyboardEvent): void {
    if (event.key !== "Escape") {
      return;
    }
    const choices = document.querySelectorAll(
      "[data-theme-choice]:not([data-tooltip-dismissed]):is(:hover, :focus-within)",
    );
    if (choices.length > 0) {
      for (const choice of choices) {
        choice.setAttribute("data-tooltip-dismissed", "");
      }
      event.preventDefault();
      event.stopPropagation();
    }
  }

  document.addEventListener("keydown", dismissThemeNames, true);
  return (): void => {
    document.removeEventListener("keydown", dismissThemeNames, true);
  };
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
  useEffect(listenForTooltipEscape, []);
  const choice = useThemeChoice();
  const modeGroupId = useId();

  return (
    <fieldset className={groupClass}>
      <legend className="panel-label">{THEME_COPY.modeLabel}</legend>
      <div className="panel-modes">
        {THEME_SWATCHES.map(({ mode, attributes }) => (
          <label
            className="panel-mode"
            data-theme-choice=""
            key={mode}
            onPointerEnter={revealThemeName}
          >
            <input
              aria-label={THEME_COPY.modes[mode]}
              checked={mode === choice.mode}
              className="theme-choice-input"
              name={modeGroupId}
              onChange={chooseModeOf}
              onClick={focusThemeChoice}
              onFocus={revealThemeName}
              type="radio"
              value={mode}
            />
            <span aria-hidden="true" className="theme-swatch" {...attributes} />
            <span className="theme-choice-tooltip" role="tooltip">
              <span className="theme-choice-name">
                {THEME_COPY.modes[mode]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
