// A tool call that fails as the reply streams, end to end: the mock tutor
// calls update_memory with the input of `/mock-tool update_memory <input>`,
// and an input the tool's schema refuses fails the call. The chat saves the
// failed call with the reply and shows its failure line, live and after a
// reload. The visual chat shot (e2e/visual/chat.spec.ts) shows the same line
// from a stored reply.
import { expect } from "@playwright/test";
import { TOOL_FAILURES_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { lastMessage, openChat, sendMessage } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { expectHistory, openMemory } from "./memory-page.ts";

// An edit whose oldText is not text, which update_memory's input refuses.
const MALFORMED_EDIT = JSON.stringify({ oldText: 1 });

test.describe("use_case_tutor_updates_memory", () => {
  test("a malformed memory edit shows the failure line and leaves the memory unchanged", async ({
    account,
    page,
    testData,
  }) => {
    const project = await testData.project();
    const chat = await testData.chat(project);
    await openChat(page, account, chat);

    await test.step("the reply shows that the memory update failed", async () => {
      await sendMessage(page, `/mock-tool update_memory ${MALFORMED_EDIT}`);
      await expect(
        lastMessage(page).getByText(TOOL_FAILURES_COPY.updateMemory),
      ).toBeVisible();
    });

    await test.step("the saved reply still shows it after a reload", async () => {
      // The reply's stream stays open until the reply is saved, so once the
      // message is no longer busy, the reload reads the saved reply.
      await expect(lastMessage(page)).toHaveAttribute("aria-busy", "false");
      await page.reload();
      await expect(
        lastMessage(page).getByText(TOOL_FAILURES_COPY.updateMemory),
      ).toBeVisible();
    });

    await test.step("the memory has no new version", async () => {
      await openMemory(page, project);
      await expect(page.getByText(MEMORY_COPY.noHistory)).toBeVisible();
      await expectHistory(page, []);
    });
  });
});
