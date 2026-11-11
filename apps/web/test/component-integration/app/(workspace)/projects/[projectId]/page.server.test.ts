// A quest's page, in the test database: opening a quest that has no
// conversation yet offers to start it and starts nothing; another user's
// quest is not found. What the page shows in the browser is
// conversation.browser.test.tsx's and page.browser.test.tsx's.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { expectNotFound } from "../../../../test-database/navigation-test-kit.ts";
import { twoUsers } from "../../../../test-database/two-users-test-kit.ts";

// The quest's page, as the signed-in user sees it.
async function pageHtml(projectId: string): Promise<string> {
  return renderToStaticMarkup(
    await ProjectPage({
      params: Promise.resolve({ projectId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

describe("use_case_start_quest_conversation", () => {
  test("a quest without a conversation offers to start it, and opening it starts nothing and spends nothing", async () => {
    const { her, herData } = await twoUsers();
    const project = await herData.project("Own fox");
    const before = await readGoldBalance(her.id);

    const html = await pageHtml(project.id);

    expect(html).toContain(QUEST_CONVERSATION_COPY.notStarted);
    expect(html).toContain(QUEST_CONVERSATION_COPY.start);
    expect(await readQuestConversation(her.id, project.id)).toBeUndefined();
    expect(await readGoldBalance(her.id)).toBe(before);
  });
});

describe("use_case_open_project", () => {
  test("another user's quest is not found, and starts nothing", async () => {
    const { her, other, otherData } = await twoUsers();
    const foreign = await otherData.project("Private den");

    await expectNotFound(() => pageHtml(foreign.id));
    expect(await readQuestConversation(her.id, foreign.id)).toBeUndefined();
    expect(await readQuestConversation(other.id, foreign.id)).toBeUndefined();
  });
});
