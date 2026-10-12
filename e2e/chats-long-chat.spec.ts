// A chat longer than the screen: the way back to the project, the chat's
// name and the composer stay on screen and in reach wherever she has
// scrolled to, on a laptop and on a phone.
import { expect, type Locator, type Page } from "@playwright/test";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat } from "@/chats/store.ts";
import { THEME_ATTRIBUTE, themeChoiceCookie } from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatMessages, openChat } from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { openLongChat, scrollToBottom } from "./long-chat.ts";
import { LAPTOP_VIEWPORT, PHONE_VIEWPORT } from "./viewports.ts";
import { waitUntilSettled } from "./visual/visual-page.ts";

const PROJECT_NAME = "Low-poly fox den";
const CHAT_NAME = "Beveling the den's roof";

// The pinned header's greatest share of a phone's screen, so the
// conversation keeps most of it.
const MOST_HEADER_SHARE = 0.25;

// The page and test data a test of this case uses.
interface CaseArgs {
  readonly page: Page;
  readonly testData: TestData;
}

// How the page's viewport setting, its <meta name="viewport">, has a phone's
// on-screen keyboard change the page, if it says.
async function keyboardSetting(page: Page): Promise<string | undefined> {
  const content = await page.evaluate(
    (): string =>
      [...document.querySelectorAll("meta")].find(
        (meta) => meta.name === "viewport",
      )?.content ?? "",
  );
  const settings = new Map(
    content.split(",").map((setting): [string, string] => {
      const [name = "", value = ""] = setting.split("=");
      return [name.trim(), value.trim()];
    }),
  );
  return settings.get("interactive-widget");
}

// Checks that target is wholly on screen and that a click would reach it,
// not something drawn over it.
async function expectReachable(target: Locator): Promise<void> {
  await expect(target).toBeInViewport({ ratio: 1 });
  await target.click({ trial: true });
}

// Jumps to target, as a link to it would, and checks that it starts below
// pinned rather than under it.
async function expectJumpLandsBelow(
  target: Locator,
  pinned: Locator,
): Promise<void> {
  await target.evaluate((element) => {
    element.scrollIntoView({ block: "start" });
  });
  const targetBox = await target.boundingBox();
  const pinnedBox = await pinned.boundingBox();
  if (targetBox === null || pinnedBox === null) {
    throw new Error("The jump's target or the pinned element is not shown");
  }
  expect(targetBox.y).toBeGreaterThanOrEqual(pinnedBox.y + pinnedBox.height);
}

// At a phone's size in theme, the chat's pinned header, which holds its
// heading, takes at most MOST_HEADER_SHARE of the screen's height.
function fitPinnedHeaderOnPhone(
  theme: ThemeId,
): (args: CaseArgs) => Promise<void> {
  return async ({ page, testData }: CaseArgs): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    const chat = await testData.chat(project);
    await renameChat(chat.id, chatNameFixture(CHAT_NAME));
    await page.setViewportSize(PHONE_VIEWPORT);
    await logIn(page);
    const cookie = themeChoiceCookie({ theme, mode: "light" });
    await page.context().addCookies([{ ...cookie, url: page.url() }]);
    await page.goto(`/chats/${chat.id}`);
    await expect(page.locator("html")).toHaveAttribute(THEME_ATTRIBUTE, theme);
    await waitUntilSettled(page);

    const chatName = page.getByRole("heading", { level: 1, name: CHAT_NAME });
    const header = page.locator("header").filter({ has: chatName });
    const box = await header.boundingBox();
    expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      PHONE_VIEWPORT.height * MOST_HEADER_SHARE,
    );
  };
}

// The chat page has a phone's keyboard shrink the page, so the pinned
// composer stays above it; the project's page, with nothing pinned, leaves
// the keyboard over the page, the browser's default.
async function shrinkOnlyChatForKeyboard({
  page,
  testData,
}: CaseArgs): Promise<void> {
  const project = await testData.project(PROJECT_NAME);
  const chat = await testData.chat(project);
  await openChat(page, chat);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await keyboardSetting(page)).toBe("resizes-content");

  await page.goto(`/projects/${project.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: PROJECT_NAME }),
  ).toBeVisible();
  expect(await keyboardSetting(page)).toBeUndefined();
}

test.describe("use_case_breadcrumbs_in_long_chat", () => {
  for (const viewport of [LAPTOP_VIEWPORT, PHONE_VIEWPORT]) {
    test(`${viewport.width} px wide`, async ({ account, page, testData }) => {
      const project = await testData.project(PROJECT_NAME);
      const chat = await testData.chat(project);
      await renameChat(account.id, chat.id, chatNameFixture(CHAT_NAME));
      await page.setViewportSize(viewport);
      await openLongChat(page, chat);

      const backLink = page.getByRole("link", { name: PROJECT_NAME });
      const chatName = page.getByRole("heading", { level: 1, name: CHAT_NAME });
      await scrollToBottom(page);
      await expectReachable(backLink);
      await expectReachable(chatName);
      await expectReachable(
        page.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
      );

      await expectJumpLandsBelow(chatMessages(page).first(), chatName);

      await scrollToBottom(page);
      await backLink.click();
      await expect(page).toHaveURL(`/projects/${project.id}`);
    });
  }

  for (const theme of THEME_IDS) {
    test(
      `the pinned header takes at most a quarter of a phone's screen, in ${theme}`,
      fitPinnedHeaderOnPhone(theme),
    );
  }
  test(
    "only the chat page shrinks for a phone's keyboard",
    shrinkOnlyChatForKeyboard,
  );
});
