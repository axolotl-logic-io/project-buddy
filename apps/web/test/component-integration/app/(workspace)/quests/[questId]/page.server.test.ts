import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import QuestPage from "@/app/(site)/(workspace)/quests/[questId]/(overview)/page.tsx";
import { listPerformances } from "@/performances/performance-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
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

describe("quest without a performance", () => {
  test("a quest without a performance still shows its workspace", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest("Own fox");

    const html = await pageHtml(quest.id);

    expect(html).toContain(quest.name);
    expect(html).not.toContain(PERFORMANCE_COPY.message);
    expect(await listPerformances(her.id, quest.id)).toEqual([]);
  });
});

describe("use_case_open_quest", () => {
  test("another user's quest is not found, and starts nothing", async () => {
    const { her, other, otherData } = await twoUsers();
    const foreign = await otherData.quest("Private den");

    await expectNotFound(() => pageHtml(foreign.id));
    expect(await listPerformances(her.id, foreign.id)).toEqual([]);
    expect(await listPerformances(other.id, foreign.id)).toEqual([]);
  });
});
