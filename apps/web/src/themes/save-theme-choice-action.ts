"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { themeChoiceSetCookie } from "@/themes/theme-choice.ts";
import { parseThemeChoice } from "@/themes/themes.ts";

// Anything that isn't an object reads as a choice with no parts.
const RAW_THEME_CHOICE = z
  .object({ theme: z.unknown(), mode: z.unknown() })
  .catch({ theme: undefined, mode: undefined });

// Saves raw, the theme and mode the menu has just applied, to this
// browser's cookie. An unknown or missing part saves the default; nothing
// here throws on bad input. It asks for no user and touches no database:
// the menu is on the signed-out pages too (/login, /signup, /login/link),
// and the theme belongs to the browser, not the account.
export async function saveThemeChoiceAction(raw: unknown): Promise<void> {
  const choice = parseThemeChoice(RAW_THEME_CHOICE.parse(raw));
  (await cookies()).set(themeChoiceSetCookie(choice));
}
