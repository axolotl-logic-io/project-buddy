// Reading and writing a chat page the way the user does: the conversation as
// speaker-and-text lines, and the composer.
import { expect, type Locator, type Page } from "@playwright/test";
import { getPersona, type PersonaId } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

// The name the site shows for personaId.
function personaName(personaId: PersonaId): string {
  const persona = getPersona(personaId);
  if (persona === undefined) {
    throw new Error(`No persona has the id ${personaId}`);
  }
  return persona.name;
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

// The chat's messages, oldest first. The conversation is the page's first
// list; lists inside replies come after it.
function chatMessages(page: Page): Locator {
  return page.getByRole("list").first().locator(":scope > li");
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

// Types text into the composer and sends it.
async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByLabel(COPY.chat.messageLabel).fill(text);
  await page.getByRole("button", { name: COPY.chat.send }).click();
}

export {
  chatMessages,
  exchange,
  expectMessages,
  fromUser,
  personaName,
  sendMessage,
};
