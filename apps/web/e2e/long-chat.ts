// A chat longer than the screen, for the specs that scroll one: the pinned
// header's (chats-long-chat.spec.ts) and its switch's (hide-extras.spec.ts).
import { expect, type Locator, type Page } from "@playwright/test";
import type { SessionUser } from "@/auth/session-token.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import {
  chatMessages,
  lastMessage,
  openChat,
  sendMessage,
} from "./chat-page.ts";

const MARKDOWN_REPLY_HEADING = "Beveling an edge";
// The Python block that ends the reply.
const MARKDOWN_REPLY_END = "bpy.ops.mesh.bevel";
// The height of the band of the page one screen down that oneScreenDown
// shoots, in CSS px: wider than the pinned header's fade.
const ONE_SCREEN_DOWN_BAND = 64;

// Asks the mock tutor for its Markdown reply, a heading, lists, a table and
// code, longer than a phone's screen, and waits until the reply is shown to
// its end.
async function askForMarkdown(page: Page): Promise<void> {
  const shownBefore = await chatMessages(page).count();
  await sendMessage(page, "/mock-markdown");
  // Her message and the reply.
  await expect(chatMessages(page)).toHaveCount(shownBefore + 2);
  await expect(lastMessage(page)).toContainText(MARKDOWN_REPLY_HEADING);
  await expect(lastMessage(page).getByRole("code")).toContainText(
    MARKDOWN_REPLY_END,
  );
}

// Signs in as account, opens chat and fills it with replies, several
// screens long: three replies fill a laptop's screen several times over.
async function openLongChat(
  page: Page,
  account: SessionUser,
  chat: Pick<Chat, "id">,
): Promise<void> {
  await openChat(page, account, chat);
  await askForMarkdown(page);
  await askForMarkdown(page);
  await askForMarkdown(page);
}

// Opens the long chat that openLongChat filled, already signed in, and waits
// until it is shown to its end.
async function showLongChat(page: Page, chat: Pick<Chat, "id">): Promise<void> {
  await page.goto(`/chats/${chat.id}`);
  await expect(lastMessage(page).getByRole("code")).toContainText(
    MARKDOWN_REPLY_END,
  );
}

// Scrolls the page to its end, again until it stays there, since a reply's
// code blocks may still grow once laid out.
async function scrollToBottom(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((): boolean => {
          const { scrollHeight } = document.documentElement;
          window.scrollTo(0, scrollHeight);
          return (
            window.scrollY > 0 &&
            window.scrollY + window.innerHeight >= scrollHeight - 1
          );
        }),
      "scrolled to the end",
    )
    .toBe(true);
}

// Scrolls the page so that the point one screen down from its top sits in
// the middle of the window, below anything pinned at the top, and returns a
// line of the conversation there and a shot of the band around that point:
// where a header that has lost its pinned place would draw what it draws
// below itself.
async function oneScreenDown(
  page: Page,
): Promise<{ readonly line: Locator; readonly band: Buffer }> {
  const { width, height } = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: window.innerHeight,
  }));
  await page.evaluate((scrollY: number) => {
    window.scrollTo(0, scrollY);
  }, height / 2);
  const lines = chatMessages(page).getByRole("paragraph");
  const nearest = await lines.evaluateAll((elements): number => {
    const distances = elements.map((element) =>
      Math.abs(element.getBoundingClientRect().top - window.innerHeight / 2),
    );
    return distances.indexOf(Math.min(...distances));
  });
  const band = await page.screenshot({
    clip: {
      x: 0,
      y: height / 2 - ONE_SCREEN_DOWN_BAND / 2,
      width,
      height: ONE_SCREEN_DOWN_BAND,
    },
  });
  return { line: lines.nth(nearest), band };
}

export { oneScreenDown, openLongChat, scrollToBottom, showLongChat };
