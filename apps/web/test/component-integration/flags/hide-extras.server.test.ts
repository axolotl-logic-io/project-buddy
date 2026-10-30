// "use_case_hide_extras" in use-cases/appearance.md, where it needs the
// server: her switch is saved to her account and to this browser's cookie,
// for her alone. That the cookie hides the extra after a reload, and that
// each switch hides only its own extra, is hide-extras.browser.test.tsx's;
// that a switch applies at once is
// test/component-integration/app/(workspace)/settings/flag-switches.browser.test.tsx's.
import { cookies } from "next/headers";
import { describe, expect, test } from "vitest";
import { findUserByEmail, type User } from "@/accounts/users-store.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS, type FlagId } from "@/flags/flags.ts";
import { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const NOTES_HIDDEN: readonly FlagId[] = [
  "working-notes",
  ...DEFAULT_HIDDEN_FLAGS,
];

// The extras user's account keeps switched from their default.
async function savedChoice(user: User): Promise<readonly string[]> {
  const saved = await findUserByEmail(user.email);
  if (saved === undefined) {
    throw new Error("The test user is gone");
  }
  return saved.hiddenExtras;
}

// The hidden-extras cookie this browser now keeps.
async function cookieValue(): Promise<string | undefined> {
  return (await cookies()).get(hiddenFlagsCookie([]).name)?.value;
}

describe("use_case_hide_extras", () => {
  test("her switch is saved to her account and this browser, and not to another user's", async () => {
    const her = await testUser();
    const other = await testUser();
    await signIn(her);

    await saveHiddenFlagsAction(NOTES_HIDDEN);

    expect(await savedChoice(her)).toEqual(["working-notes"]);
    expect(await cookieValue()).toBe(hiddenFlagsCookie(NOTES_HIDDEN).value);
    expect(await savedChoice(other)).toEqual([]);
  });

  test("switching back to the defaults saves no choice", async () => {
    const her = await testUser();
    await signIn(her);
    await saveHiddenFlagsAction(NOTES_HIDDEN);

    await saveHiddenFlagsAction([...DEFAULT_HIDDEN_FLAGS]);

    expect(await savedChoice(her)).toEqual([]);
    expect(await cookieValue()).toBe(
      hiddenFlagsCookie(DEFAULT_HIDDEN_FLAGS).value,
    );
  });
});
