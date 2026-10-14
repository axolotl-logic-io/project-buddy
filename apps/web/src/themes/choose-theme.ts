// What the theme picker does: it applies the chosen theme or mode to this
// page at once, then saves the whole choice to this browser's cookie through
// a Server Action (theme-choice.ts's header has where the cookie is written
// and read).
import { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import {
  MODE_ATTRIBUTE,
  readAppliedMode,
  readAppliedTheme,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { parseThemeChoice, type ThemeChoice } from "@/themes/themes.ts";

function keepUnsaved(): void {
  // The choice still applies to this page; this browser keeps the one saved
  // before.
}

// The one place the browser saves the choice. The Server Action writes it
// to this browser's cookie. Each call carries the whole choice, and Next
// runs a page's Server Actions one at a time, so the last pick wins.
function saveThemeChoice(choice: ThemeChoice): void {
  saveThemeChoiceAction(choice).catch(keepUnsaved);
}

// Restyles the page at once and saves the choice for the next visit.
function applyThemeChoice(raw: {
  readonly theme: unknown;
  readonly mode: unknown;
}): void {
  const choice = parseThemeChoice(raw);
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, choice.theme);
  root.setAttribute(MODE_ATTRIBUTE, choice.mode);
  saveThemeChoice(choice);
}

// The user picks a theme (by id) and keeps the mode, or the reverse. A value
// that isn't a known theme or mode applies the default.
function chooseTheme(theme: string): void {
  applyThemeChoice({ theme, mode: readAppliedMode() });
}

function chooseMode(mode: string): void {
  applyThemeChoice({ theme: readAppliedTheme(), mode });
}

export { chooseMode, chooseTheme };
