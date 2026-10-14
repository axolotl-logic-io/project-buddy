import { useSyncExternalStore } from "react";
import {
  readAppliedMode,
  readAppliedTheme,
  subscribeToThemeChoice,
} from "@/themes/theme-choice.ts";
import {
  DEFAULT_THEME_CHOICE,
  parseThemeChoice,
  type ThemeChoice,
  type ThemeId,
  type ThemeMode,
} from "@/themes/themes.ts";

function serverTheme(): ThemeId {
  return DEFAULT_THEME_CHOICE.theme;
}

function serverMode(): ThemeMode {
  return DEFAULT_THEME_CHOICE.mode;
}

// The theme and mode applied to the page, kept current as they change, for
// a client component. The server render and hydration see the default, then
// the applied choice.
export function useThemeChoice(): ThemeChoice {
  const theme = useSyncExternalStore(
    subscribeToThemeChoice,
    readAppliedTheme,
    serverTheme,
  );
  const mode = useSyncExternalStore(
    subscribeToThemeChoice,
    readAppliedMode,
    serverMode,
  );
  return parseThemeChoice({ theme, mode });
}
