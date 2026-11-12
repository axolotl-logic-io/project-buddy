// A quest's page, in the test database: opening a quest that has no
// conversation yet offers to start it and starts nothing; another user's
// quest is not found. What the page shows in the browser is
// conversation.browser.test.tsx's and page.browser.test.tsx's.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { expectNotFound } from "../../../../test-database/navigation-test-kit.ts";
import { twoUsers } from "../../../../test-database/two-users-test-kit.ts";

// The quest's page, as the signed-in user sees it.
async function pageHtml(questId: string): Promise<string> {
  return renderToStaticMarkup(
    await QuestPage({
      params: Promise.resolve({ questId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

describe("use_case_start_quest_conversation", () => {
  test("a quest without a conversation offers to start it, and opening it starts nothing and spends nothing", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest("Own fox");
    const before = await readGoldBalance(her.id);

    const html = await pageHtml(quest.id);

    expect(html).toContain(QUEST_CONVERSATION_COPY.notStarted);
    expect(html).toContain(QUEST_CONVERSATION_COPY.start);
    expect(await readQuestConversation(her.id, quest.id)).toBeUndefined();
    expect(await readGoldBalance(her.id)).toBe(before);
  });
});

describe("use_case_open_quest", () => {
  test("another user's quest is not found, and starts nothing", async () => {
    const { her, other, otherData } = await twoUsers();
    const foreign = await otherData.quest("Private den");

    await expectNotFound(() => pageHtml(foreign.id));
    expect(await readQuestConversation(her.id, foreign.id)).toBeUndefined();
    expect(await readQuestConversation(other.id, foreign.id)).toBeUndefined();
  });
});
