// "use_case_settings_follow_user" in use-cases/accounts.md: the extras she
// hides are saved to her account, so signing in on another browser hides
// them there too, while the theme stays each browser's own. Another browser
// is a new session with no cookies, signed in as continueSignInAction signs
// one in: the hidden extras her account holds are seeded into its cookie
// (src/app/login/link/actions.ts). The cookie is what the pre-paint script
// and Settings read; hide-extras.browser.test.tsx checks they hide by it.
import { cookies } from "next/headers";
import { expect, test } from "vitest";
import { findUserByEmail, type User } from "@/accounts/users-store.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS, knownFlags } from "@/flags/flags.ts";
import { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import { seedHiddenFlags } from "@/flags/seed-hidden-flags.ts";
import { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import {
  parseThemeChoiceCookie,
  THEME_COOKIE_NAME,
} from "@/themes/theme-choice.ts";
import {
  DEFAULT_THEME_CHOICE,
  THEME_IDS,
  type ThemeChoice,
  type ThemeId,
} from "@/themes/themes.ts";
import { clearCookies, signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

// A theme other than the default, which she picks in her first browser.
const PICKED_THEME: ThemeId =
  THEME_IDS.find((theme) => theme !== DEFAULT_THEME_CHOICE.theme) ??
  DEFAULT_THEME_CHOICE.theme;

// The extras she hides: working notes, beside those hidden by default.
const HIDDEN = knownFlags(["working-notes", ...DEFAULT_HIDDEN_FLAGS]);

// This browser's hidden-extras cookie.
async function hiddenExtrasCookie(): Promise<string | undefined> {
  return (await cookies()).get(hiddenFlagsCookie([]).name)?.value;
}

// This browser's choice of theme.
async function themeChoice(): Promise<ThemeChoice> {
  return parseThemeChoiceCookie(
    (await cookies()).get(THEME_COOKIE_NAME)?.value,
  );
}

// Signs user in on a new browser, with no cookies, as signing in by link
// does: the extras their account hides first, then the session.
async function signInOnNewBrowser(user: User): Promise<void> {
  clearCookies();
  const found = await findUserByEmail(user.email);
  if (found === undefined) {
    throw new Error("The test user could not be found");
  }
  await seedHiddenFlags(found.hiddenExtras);
  await signIn(found);
}

test("use_case_settings_follow_user", async () => {
  const her = await testUser();
  const other = await testUser();
  await signIn(her);
  await saveThemeChoiceAction({ theme: PICKED_THEME, mode: "light" });
  await saveHiddenFlagsAction(HIDDEN);
  const first = await hiddenExtrasCookie();

  expect(first).toBe(hiddenFlagsCookie(HIDDEN).value);
  expect(await themeChoice()).toStrictEqual({
    theme: PICKED_THEME,
    mode: "light",
  });

  await signInOnNewBrowser(her);

  expect(await hiddenExtrasCookie()).toBe(first);
  expect(await themeChoice()).toStrictEqual(DEFAULT_THEME_CHOICE);

  await signInOnNewBrowser(other);

  expect(await hiddenExtrasCookie()).toBe(
    hiddenFlagsCookie(DEFAULT_HIDDEN_FLAGS).value,
  );
});
