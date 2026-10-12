// A chat page with one of everything a reply shows: a search with its
// citations, a working note, a memory change, a tool that failed, and
// Markdown with a heading. The mock tutor's commands make each reply.
import { expect, type Page } from "@playwright/test";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat } from "@/chats/store.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { mockWorkingNoteAnswer } from "@/tutor/mock-working-note.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  chatMessages,
  lastMessage,
  manualSection,
  sendMessage,
  tutorEdits,
} from "../chat-page.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

// A word in no manual section but the ones this spec adds.
const TOPIC = "snorkelwump";
const CHAT_NAME = "Snorkelwump the den's roof";

const SNORKELWUMP_SECTIONS: readonly ManualSection[] = [
  manualSection(
    "modeling/meshes/editing/edge/snorkelwump",
    "snorkelwump-edges",
    "Snorkelwump Edges",
    "Press Ctrl-Shift-W to snorkelwump the selected edges.",
  ),
  manualSection(
    "modeling/meshes/editing/edge/snorkelwump",
    "snorkelwump-depth",
    "Snorkelwump Depth",
    "Drag the mouse to set how deep each snorkelwump goes.",
  ),
];

// The tool input the mock sends, which update_memory's input schema refuses,
// so the tool fails.
const FAILING_TOOL_COMMAND = '/mock-tool update_memory {"oldText":1}';
const MOCK_CALLED_UPDATE_MEMORY = "The mock tutor called update_memory.";
const MEMORY_ADDITION = "- [x] Bevel the roof's edges";

// Her five messages and a reply to each.
const MESSAGE_COUNT = 10;
// How long one try at typing into the composer waits for Send to enable.
const COMPOSER_TRY_MS = 1000;

// Waits until the composer takes what is typed. Text typed before the page
// has hydrated fills the box but not the composer's state, so Send stays
// disabled; WebKit hydrates well after the load event that goto waits for.
// Each try clears the box first, because React ignores typing that leaves
// the box's text as it was when the page hydrated.
async function waitForComposer(page: Page): Promise<void> {
  const message = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  const send = page.getByRole("button", { name: CHAT_COPY.send });
  await expect(async (): Promise<void> => {
    await message.clear();
    await message.fill(TOPIC);
    await expect(send).toBeEnabled({ timeout: COMPOSER_TRY_MS });
  }).toPass();
  await message.clear();
}

// Sends text and waits until the tutor's reply to it shows replyText.
async function ask(page: Page, text: string, replyText: string): Promise<void> {
  await sendMessage(page, text);
  await expect(lastMessage(page)).toContainText(replyText);
}

describeVisualPage({
  name: "chat",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    await testData.manualSections(SNORKELWUMP_SECTIONS);
    const chat = await testData.chat(
      await testData.project("Low-poly fox den"),
      "mr-tee",
    );
    // Named by hand, so the tutor's automatic names never change it.
    await renameChat(testData.account.id, chat.id, chatNameFixture(CHAT_NAME));
    await page.goto(`/chats/${chat.id}`);
    await waitForComposer(page);
    await ask(page, `/mock-search ${TOPIC}`, `The manual covers "${TOPIC}":`);
    await ask(
      page,
      `/mock-working-note ${TOPIC}`,
      mockWorkingNoteAnswer(TOPIC),
    );
    await tutorEdits(page, "", MEMORY_ADDITION);
    await expect(lastMessage(page)).toContainText(MOCK_CALLED_UPDATE_MEMORY);
    await ask(page, FAILING_TOOL_COMMAND, MOCK_CALLED_UPDATE_MEMORY);
    await ask(page, "/mock-markdown", "Beveling an edge");
    // The chat as it opens from the database, not as it streamed in.
    await page.reload();
    await expect(chatMessages(page)).toHaveCount(MESSAGE_COUNT);
    await expect(lastMessage(page).getByRole("code")).toContainText(
      "import bpy",
    );
  },
});
