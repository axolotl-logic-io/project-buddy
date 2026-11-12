// "use_case_open_missing_page" in use-cases/when-things-go-wrong.md, where it
// needs the server: a page for something that doesn't exist, or a garbled
// link, ends in Next's notFound(), which shows src/app/not-found.tsx. Next
// shows the same page for an address the site has no route for; the page's
// link back to her quests is not-found.test.tsx's.

import { expect, test } from "vitest";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { listQuests } from "@/quests/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// A page's props for the route parameters params, with no query.
function pageProps<Params>(params: Params): {
  params: Promise<Params>;
  searchParams: Promise<Record<string, never>>;
} {
  return {
    params: Promise.resolve(params),
    searchParams: Promise.resolve({}),
  };
}

test("use_case_open_missing_page", async () => {
  const user = await testUser();
  const quest = await testData(user).quest();
  await signIn(user);

  await expectNotFound(() =>
    QuestPage(pageProps({ questId: crypto.randomUUID() })),
  );
  await expectNotFound(() => ChatPage(pageProps({ chatId: "not-a-chat-id" })));
  await expectNotFound(() =>
    ConstructPage(pageProps({ constructId: "no-such-construct" })),
  );

  expect(await listQuests(user.id)).toEqual([quest]);
});
