// Reading and writing a chat page the way the user does: the conversation as
// speaker-and-text lines, and the composer. Every spec that sends a message
// or reads the conversation uses these helpers, and takes persona names from
// personaName, never as literals.
import { expect, type Locator, type Page } from "@playwright/test";
import type { SessionUser } from "@/auth/session-token.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import { getPersona, type PersonaId } from "@/personas/index.ts";
import { CHAT_COPY, CITATIONS_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { logIn } from "./log-in.ts";

const MANUAL_PAGES = "https://docs.blender.org/manual/**";

// Signs in as account and opens chat.
async function openChat(
  page: Page,
  account: SessionUser,
  chat: Pick<Chat, "id">,
): Promise<void> {
  await logIn(page, account);
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

// A section of a made-up manual page, for a test's own sections
// (testData.manualSections), with the URL the app links its citation to.
function manualSection(
  page: string,
  anchor: string,
  title: string,
  text: string,
): ManualSection {
  const filePath = `manual/${page}.rst`;
  return { title, text, filePath, anchor, url: manualUrl(filePath, anchor) };
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
  return `${CHAT_COPY.you} ${text}`;
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
    .getByRole("list", { name: CHAT_COPY.conversationLabel })
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
  return page.getByRole("region", { name: CITATIONS_COPY.heading });
}

// The tutor's working notes in message: its text before a later step, shown
// quiet and labelled.
function workingNotes(message: Locator): Locator {
  return message.getByRole("note", { name: CHAT_COPY.workingNote });
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
// typed (waitForComposer), so a send right after openChat or page.goto
// never types into a page that hasn't hydrated.
async function sendMessage(page: Page, text: string): Promise<void> {
  await waitForComposer(page);
  await page.getByRole("textbox", { name: CHAT_COPY.messageLabel }).fill(text);
  await page.getByRole("button", { name: CHAT_COPY.send }).click();
}

// Asks the tutor in the chat on the page for its prompt, and returns its
// reply.
async function tutorPrompt(page: Page): Promise<Locator> {
  await sendMessage(page, "/mock-system-prompt");
  const reply = lastMessage(page);
  await expect(reply).toContainText("You are a Blender tutor");
  return reply;
}

// Has the mock tutor in the chat on the page change the project's memory,
// replacing oldText with newText (an empty oldText adds newText at the end),
// and waits for the notice of the change.
async function tutorEdits(
  page: Page,
  oldText: string,
  newText: string,
): Promise<void> {
  const edit = JSON.stringify({ oldText, newText });
  await sendMessage(page, `/mock-tool update_memory ${edit}`);
  await expect(
    lastMessage(page).getByRole("complementary", {
      name: MEMORY_COPY.changeLabel,
    }),
  ).toContainText(newText);
}

export {
  chatMessages,
  citations,
  exchange,
  expectMessages,
  fromUser,
  lastMessage,
  manualSection,
  openChat,
  personaName,
  sendMessage,
  stubManualSite,
  tutorEdits,
  tutorPrompt,
  waitForComposer,
  workingNotes,
};
