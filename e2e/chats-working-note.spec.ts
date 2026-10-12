// "use_case_see_working_note" in USE_CASES.md: the mock tutor's
// `/mock-working-note <text>` writes a note, searches the manual for the
// text, then answers. That her own messages are never notes is unit-tested
// (working-note-rule.test.ts and working-note.test.tsx): a message she sends
// here can't hold the tool part that would make it one.
import { expect, type Locator } from "@playwright/test";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import { COPY } from "@/ui/copy.ts";
import {
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
// its answer as prose after. Returns how the note and the answer look.
async function expectNoteThenAnswer(
  reply: Locator,
): Promise<{ note: TextLook; answer: TextLook }> {
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
  const noteLook = await textLook(noteText);
  const answerLook = await textLook(answer);
  expect(noteLook.fontSize).toBeLessThan(answerLook.fontSize);
  expect(noteLook.color).not.toBe(answerLook.color);
  return { note: noteLook, answer: answerLook };
}

test("use_case_see_working_note", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project());
  await openChat(page, chat);
  await sendMessage(page, `/mock-working-note ${TOPIC}`);

  const looks =
    await test.step("the note shows quiet and labelled before the search, and the answer as prose", async () =>
      expectNoteThenAnswer(lastMessage(page)));

  await test.step("both look the same after she reopens the chat", async () => {
    await page.reload();

    expect(await expectNoteThenAnswer(lastMessage(page))).toEqual(looks);
  });
});
