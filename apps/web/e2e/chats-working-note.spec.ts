// "use_case_see_working_note" in use-cases/chats.md: the mock tutor's
// `/mock-working-note <text>` writes a note, searches the manual for the
// text, then answers. That her own messages are never notes is unit-tested
// (working-note-rule.test.ts and working-note.test.tsx): a message she sends
// here can't hold the tool part that would make it one. How the note shows
// as the reply streams is working-note.browser.test.tsx's.
import { expect, type Locator } from "@playwright/test";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";
import {
  chatMessages,
  lastMessage,
  openChat,
  sendMessage,
  workingNotes,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";

const TOPIC = "zibble";
// Her message and the reply.
const EXCHANGE = 2;

// Whether later comes after earlier in the page.
async function follows(earlier: Locator, later: Locator): Promise<boolean> {
  return earlier.evaluate(
    (node: Element, other: Element): boolean =>
      node.compareDocumentPosition(other) === Node.DOCUMENT_POSITION_FOLLOWING,
    await later.elementHandle(),
  );
}

// How a text looks: its font size in pixels, and its colour.
interface TextLook {
  readonly fontSize: number;
  readonly color: string;
}

// How element's text looks.
async function textLook(element: Locator): Promise<TextLook> {
  const { fontSize, color } = await element.evaluate(
    (node: Element): { fontSize: string; color: string } => {
      const style = getComputedStyle(node);
      return { fontSize: style.fontSize, color: style.color };
    },
  );
  return { fontSize: Number.parseFloat(fontSize), color };
}

// Checks that reply, the mock tutor's answer to /mock-working-note, shows its
// note quiet (smaller, in another colour) and labelled before the search, and
// its answer as prose after.
async function expectNoteThenAnswer(reply: Locator): Promise<void> {
  const answer = reply.getByText(mockWorkingNoteAnswer(TOPIC));
  const search = reply.getByText(CITATIONS_COPY.searched(TOPIC));
  const notes = workingNotes(reply);
  await expect(answer).toBeVisible();
  await expect(notes).toHaveCount(1);
  const noteText = notes.getByText(mockWorkingNoteText(TOPIC));
  await expect(noteText).toBeVisible();
  await expect(notes.getByText(mockWorkingNoteAnswer(TOPIC))).toHaveCount(0);
  expect(await follows(noteText, search)).toBe(true);
  expect(await follows(search, answer)).toBe(true);
  const noteLook = await textLook(noteText);
  const answerLook = await textLook(answer);
  expect(noteLook.fontSize).toBeLessThan(answerLook.fontSize);
  expect(noteLook.color).not.toBe(answerLook.color);
}

// Stays in Playwright: it needs a reload to read the saved reply.
test("use_case_see_working_note", async ({ account, page, testData }) => {
  const chat = await testData.chat(await testData.project());
  await openChat(page, account, chat);
  await sendMessage(page, `/mock-working-note ${TOPIC}`);
  // The reply's stream stays open until the reply is saved, so once the
  // message is no longer busy, the reload reads the saved reply.
  await expect(chatMessages(page)).toHaveCount(EXCHANGE);
  await expect(lastMessage(page)).toHaveAttribute("aria-busy", "false");

  await test.step("the saved note shows quiet and labelled before the search, and the answer as prose", async () => {
    await page.reload();

    await expectNoteThenAnswer(lastMessage(page));
  });
});
