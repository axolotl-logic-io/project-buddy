import { cookies } from "next/headers";
import { parseThemeChoiceCookie, THEME_COOKIE_NAME } from "./theme-choice.ts";
import type { ThemeChoice } from "./themes.ts";

// The appearance this request's browser saved, for a complete page, whose
// first HTML has it.
async function readSavedThemeChoice(): Promise<ThemeChoice> {
  return parseThemeChoiceCookie(
    (await cookies()).get(THEME_COOKIE_NAME)?.value,
  );
}

export { readSavedThemeChoice };
