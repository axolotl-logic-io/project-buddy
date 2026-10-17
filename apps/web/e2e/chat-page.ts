// Reading and writing a chat page the way the user does: the conversation's
// messages and the composer. Every spec that sends a message or reads the
// conversation uses these helpers, and takes buddy names from buddyName,
// never as literals.
import { expect, type Locator, type Page } from "@playwright/test";
import { type BuddyId, getBuddy } from "@/buddies/index.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

// The name the site shows for buddyId.
function buddyName(buddyId: BuddyId): string {
  return getBuddy(buddyId).name;
}

// The chat's messages, oldest first: the items of the conversation's list,
// not those of lists inside the messages.
function chatMessages(page: Page): Locator {
  return page
    .getByRole("list", { name: CHAT_COPY.conversationLabel })
    .locator(":scope > li");
}

// The newest message in the chat.
function lastMessage(page: Page): Locator {
  return chatMessages(page).last();
}

// How long one try at typing into the composer waits for Send to enable.
const COMPOSER_TRY_MS = 1000;
// What waitForComposer types to try the composer; it clears it afterwards.
const COMPOSER_PROBE = "Is the composer ready?";

// Waits until the composer takes what is typed. Text typed before the page
// has hydrated fills the box but not the composer's state, so Send stays
// disabled; WebKit hydrates well after the load event that goto waits for.
// Each try clears the box first, because React ignores typing that leaves
// the box's text as it was when the page hydrated.
async function waitForComposer(page: Page): Promise<void> {
  const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  const send = page.getByRole("button", { name: CHAT_COPY.send });
  await expect(async (): Promise<void> => {
    await box.clear();
    await box.fill(COMPOSER_PROBE);
    await expect(send).toBeEnabled({ timeout: COMPOSER_TRY_MS });
  }).toPass();
  await box.clear();
}

// Types text into the composer and sends it, once the composer takes what is
// typed (waitForComposer), so a send right after page.goto never types into
// a page that hasn't hydrated.
async function sendMessage(page: Page, text: string): Promise<void> {
  await waitForComposer(page);
  await page.getByRole("textbox", { name: CHAT_COPY.messageLabel }).fill(text);
  await page.getByRole("button", { name: CHAT_COPY.send }).click();
}

export { buddyName, chatMessages, lastMessage, sendMessage };
