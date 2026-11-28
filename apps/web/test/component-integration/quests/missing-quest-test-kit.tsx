// Checks that a quest's page says the quest can't be found. The page
// renders that itself rather than calling notFound(); its page.tsx says why.

import { renderToStaticMarkup } from "react-dom/server";
import QuestPage from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/page.tsx";
import { QuestNotFound } from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/quest-not-found.tsx";

// Opens the page of questId as the signed-in user, and passes only if it
// is the missing quest's page.
async function expectQuestNotFound(questId: string): Promise<void> {
  const page = await QuestPage({
    params: Promise.resolve({ questId }),
    searchParams: Promise.resolve({}),
  });
  const html = renderToStaticMarkup(page);
  const missing = renderToStaticMarkup(<QuestNotFound />);
  if (html !== missing) {
    throw new Error(
      `Expected the missing quest's page, ${missing}, but the page was ${html}`,
    );
  }
}

export { expectQuestNotFound };
