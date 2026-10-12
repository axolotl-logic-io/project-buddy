// "use_case_see_working_note" in USE_CASES.md: the mock tutor's
// `/mock-working-note <text>` writes a note, searches the manual for the
// text, then answers.
import { expect, type Locator } from "@playwright/test";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import { COPY } from "@/ui/copy.ts";
import {
  chatMessages,
  lastMessage,
  openChat,
  sendMessage,
  workingNotes,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";

const TOPIC = "zibble";

// Whether later comes after earlier in the page.
async function follows(earlier: Locator, later: Locator): Promise<boolean> {
  return earlier.evaluate(
    (node: Element, other: Element): boolean =>
      node.compareDocumentPosition(other) === Node.DOCUMENT_POSITION_FOLLOWING,
    await later.elementHandle(),
  );
}

// The font size of element's text, in pixels.
async function fontSize(element: Locator): Promise<number> {
  return Number.parseFloat(
    await element.evaluate(
      (node: Element): string => getComputedStyle(node).fontSize,
    ),
  );
}

// Checks that reply, the mock tutor's answer to /mock-working-note, shows its
// note quiet and labelled before the search, and its answer as prose after.
async function expectNoteThenAnswer(reply: Locator): Promise<void> {
  const answer = reply.getByText(mockWorkingNoteAnswer(TOPIC));
  const search = reply.getByText(COPY.citations.searched(TOPIC));
  const notes = workingNotes(reply);
  await expect(answer).toBeVisible();
  await expect(notes).toHaveCount(1);
  const noteText = notes.getByText(mockWorkingNoteText(TOPIC));
  await expect(noteText).toBeVisible();
  await expect(notes.getByText(mockWorkingNoteAnswer(TOPIC))).toHaveCount(0);
  expect(await follows(noteText, search)).toBe(true);
  expect(await follows(search, answer)).toBe(true);
  expect(await fontSize(noteText)).toBeLessThan(await fontSize(answer));
}

test("use_case_see_working_note", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project());
  await openChat(page, chat);
  await sendMessage(page, `/mock-working-note ${TOPIC}`);

  await test.step("the note shows quiet and labelled before the search, and the answer as prose", async () => {
    await expectNoteThenAnswer(lastMessage(page));
  });

  await test.step("her own message is never a note", async () => {
    await expect(chatMessages(page)).toHaveCount(2);
    await expect(workingNotes(chatMessages(page).first())).toHaveCount(0);
  });

  await test.step("both look the same after she reopens the chat", async () => {
    await page.reload();

    await expectNoteThenAnswer(lastMessage(page));
  });
});
