// Reading and writing a chat page the way the user does: the conversation as
// speaker-and-text lines, and the composer. Every spec that sends a message
// or reads the conversation uses these helpers, and takes persona names from
// personaName, never as literals.
import { expect, type Locator, type Page } from "@playwright/test";
import type { Chat } from "@/chats/store.ts";
import { getPersona, type PersonaId } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";
import { logIn } from "./log-in.ts";

const MANUAL_PAGES = "https://docs.blender.org/manual/**";

// Signs in and opens chat.
async function openChat(page: Page, chat: Pick<Chat, "id">): Promise<void> {
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);
}

// Answers requests for the manual's pages instead of docs.blender.org, so
// following a manual link from the chat stays offline.
async function stubManualSite(page: Page): Promise<void> {
  await page
    .context()
    .route(MANUAL_PAGES, (route) =>
      route.fulfill({ contentType: "text/html", body: "<p>The manual</p>" }),
    );
}

// The name the site shows for personaId.
function personaName(personaId: PersonaId): string {
  return getPersona(personaId).name;
}

// The first sentence of the mock tutor's reply to userText. The rest of the
// reply is a list and a Python block that say to press Ctrl+B.
function mockReplyTo(userText: string): string {
  return `This is the mock tutor. You said: "${userText}".`;
}

// A message of hers as expectMessages reads it: her name, then its text.
function fromUser(text: string): string {
  return `${COPY.chat.you} ${text}`;
}

// A message of hers and the mock tutor's reply to it, as expectMessages
// reads them, the reply under the name tutor.
function exchange(tutor: string, userText: string): string[] {
  return [fromUser(userText), `${tutor} ${mockReplyTo(userText)}`];
}

// The chat's messages, oldest first: the items of the conversation's list,
// not those of lists inside the messages.
function chatMessages(page: Page): Locator {
  return page
    .getByRole("list", { name: COPY.chat.conversationLabel })
    .locator(":scope > li");
}

// The newest message in the chat.
function lastMessage(page: Page): Locator {
  return chatMessages(page).last();
}

// Checks that the chat shows exactly these messages, in this order, each
// containing its line from fromUser or exchange.
async function expectMessages(
  page: Page,
  messages: readonly string[],
): Promise<void> {
  const shown = chatMessages(page);
  await expect(shown).toHaveCount(messages.length);
  await expect(shown).toContainText([...messages], { useInnerText: true });
}

// The links to the manual under the tutor's answers.
function citations(page: Page): Locator {
  return page.getByRole("region", { name: COPY.citations.heading });
}

// The tutor's working notes in message: its text before a later step, shown
// quiet and labelled.
function workingNotes(message: Locator): Locator {
  return message.getByRole("note", { name: COPY.chat.workingNote });
}

// Types text into the composer and sends it.
async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByRole("textbox", { name: COPY.chat.messageLabel }).fill(text);
  await page.getByRole("button", { name: COPY.chat.send }).click();
}

export {
  chatMessages,
  citations,
  exchange,
  expectMessages,
  fromUser,
  lastMessage,
  openChat,
  personaName,
  sendMessage,
  stubManualSite,
  workingNotes,
};
