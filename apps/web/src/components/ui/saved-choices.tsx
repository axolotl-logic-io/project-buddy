"use client";

import { useLayoutEffect } from "react";
import { applySavedThemeChoice } from "@/themes/theme-choice.ts";

// A page that fails, or isn't found, while rendering reaches the browser
// without <head>'s pre-paint scripts, and React renders <html> with the
// default theme attributes. This applies the saved theme before the first
// paint; on any other page it is already applied.
function SavedChoices(): null {
  useLayoutEffect(() => {
    applySavedThemeChoice();
  }, []);
  return null;
}

export { SavedChoices };
