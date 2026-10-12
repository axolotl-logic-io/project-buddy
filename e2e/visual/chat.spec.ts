// A chat page with one of everything a reply shows: a search with its
// citations, a working note, a memory change, a tool that failed, and
// Markdown with a heading. The mock tutor's commands make each reply.
import { expect, type Page } from "@playwright/test";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat } from "@/chats/store.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import { mockWorkingNoteAnswer } from "@/tutor/mock-working-note.ts";
import {
  chatMessages,
  lastMessage,
  openChat,
  sendMessage,
  tutorEdits,
} from "../chat-page.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

// A word in no manual section but the ones this spec adds.
const TOPIC = "snorkelwump";
const CHAT_NAME = "Snorkelwump the den's roof";

// A section of a made-up manual page, as chats-manual.spec.ts makes them.
function manualSection(
  page: string,
  anchor: string,
  title: string,
  text: string,
): ManualSection {
  const filePath = `manual/${page}.rst`;
  return { title, text, filePath, anchor, url: manualUrl(filePath, anchor) };
}

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

// Sends text and waits until the tutor's reply to it shows replyText.
async function ask(page: Page, text: string, replyText: string): Promise<void> {
  await sendMessage(page, text);
  await expect(lastMessage(page)).toContainText(replyText);
}

describeVisualPage({
  name: "chat",
  listsEveryProject: false,
  open: async (page: Page, testData: TestData): Promise<void> => {
    await testData.manualSections(SNORKELWUMP_SECTIONS);
    const chat = await testData.chat(
      await testData.project("Low-poly fox den"),
      "mr-tee",
    );
    // Named by hand, so the tutor's automatic names never change it.
    await renameChat(chat.id, chatNameFixture(CHAT_NAME));
    await openChat(page, chat);
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
