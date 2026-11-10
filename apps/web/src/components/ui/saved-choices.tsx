"use client";

import { useLayoutEffect } from "react";
import { applySavedHiddenFlags } from "@/flags/flag-choice.ts";
import { applySavedThemeChoice } from "@/themes/theme-choice.ts";

// A page that fails, or isn't found, while rendering reaches the browser
// without <head>'s pre-paint scripts, and React renders <html> with the
// default theme attributes. This applies the saved theme and hidden extras
// before the first paint; on any other page they are already applied.
function SavedChoices(): null {
  useLayoutEffect(() => {
    applySavedThemeChoice();
    applySavedHiddenFlags();
  }, []);
  return null;
}

export { SavedChoices };
