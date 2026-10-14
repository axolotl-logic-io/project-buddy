// "use_case_settings_follow_user" in use-cases/accounts.md: the extras she
// hides are saved to her account, so signing in on another browser hides
// them there too. Another browser is a new browser context, which shares
// nothing with the test's.
import { expect, type Locator, type Page } from "@playwright/test";
import { HIDE_ATTRIBUTE } from "@/flags/flag-choice.ts";
import { FLAG_IDS } from "@/flags/flags.ts";
import { THEME_ATTRIBUTE, themeChoiceCookie } from "@/themes/theme-choice.ts";
import {
  DEFAULT_THEME_CHOICE,
  THEME_IDS,
  type ThemeId,
} from "@/themes/themes.ts";
import { mockWorkingNoteText } from "@/tutor/mock-working-note.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { lastMessage, openChat, sendMessage } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { switchExtra } from "./settings-page.ts";
import { signInByLink } from "./sign-in-pages.ts";

const TOPIC = "zibble";
// A theme other than the default, which she picks in her first browser.
const PICKED_THEME: ThemeId =
  THEME_IDS.find((theme) => theme !== DEFAULT_THEME_CHOICE.theme) ??
  DEFAULT_THEME_CHOICE.theme;

// Opens Settings, and returns its switches that are off.
async function switchesOff(page: Page): Promise<Locator> {
  await page.goto("/settings");
  await expect(page.getByRole("switch")).toHaveCount(FLAG_IDS.length);
  return page.getByRole("switch", { checked: false });
}

// Opens Settings, and expects exactly the switches labelled labels to be
// off, in that order.
async function expectSwitchesOff(
  page: Page,
  labels: readonly string[],
): Promise<void> {
  const off = await switchesOff(page);
  await expect(off).toHaveCount(labels.length);
  await Promise.all(
    labels.map((label, index) =>
      expect(off.nth(index)).toHaveAccessibleName(label),
    ),
  );
}

// Picks PICKED_THEME in this browser.
async function pickTheme(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      ...themeChoiceCookie({ theme: PICKED_THEME, mode: "light" }),
      url: new URL(page.url()).origin,
    },
  ]);
}

test("use_case_settings_follow_user", async ({
  account,
  browser,
  clientAddress,
  otherAccount,
  page,
  testData,
}) => {
  const chat = await testData.chat(await testData.project());
  await openChat(page, account, chat);
  await sendMessage(page, `/mock-working-note ${TOPIC}`);
  await expect(
    lastMessage(page).getByText(mockWorkingNoteText(TOPIC)),
  ).toBeVisible();
  await pickTheme(page);

  await test.step("in Settings, she switches off working notes", async () => {
    await switchExtra(page, FLAG_COPY.workingNotes.label, false, [
      "working-notes",
      "persona-mechanics",
      "interview-persona",
    ]);
  });

  const device = await browser.newContext();
  await device.setExtraHTTPHeaders({ "x-forwarded-for": clientAddress });
  const phone = await device.newPage();

  await test.step("signed in on another browser, the chat hides the note from its first paint", async () => {
    await signInByLink(phone, account.email);
    await phone.goto(`/chats/${chat.id}`);

    await expect(phone.locator("html")).toHaveAttribute(
      HIDE_ATTRIBUTE,
      "working-notes persona-mechanics interview-persona",
    );
    await expect(
      lastMessage(phone).getByText(mockWorkingNoteText(TOPIC)),
    ).toBeHidden();
  });

  await test.step("there, Settings shows the switch off, beside the persona mechanics, off by default", async () => {
    await expectSwitchesOff(phone, [
      FLAG_COPY.workingNotes.label,
      FLAG_COPY.personaMechanics.label,
    ]);
  });

  await test.step("the theme stays the choice of each browser", async () => {
    await expect(phone.locator("html")).toHaveAttribute(
      THEME_ATTRIBUTE,
      DEFAULT_THEME_CHOICE.theme,
    );
  });
  await device.close();

  await test.step("another user's Settings are unchanged", async () => {
    await page.context().clearCookies();
    await signInByLink(page, otherAccount.email);

    await expectSwitchesOff(page, [FLAG_COPY.personaMechanics.label]);
  });
});
