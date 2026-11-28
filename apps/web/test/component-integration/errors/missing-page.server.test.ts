// "use_case_open_missing_page" in use-cases/when-things-go-wrong.md, where it
// needs the server: a page for something that doesn't exist, or a garbled
// link, ends in Next's notFound(), which shows src/app/(stream)/(site)/not-found.tsx. Next
// shows the same page for an address the site has no route for; the page's
// link back to the user's quests is not-found.test.tsx's. A missing quest's
// page says so itself, without notFound().

import { expect, test } from "vitest";
import ConstructPage from "@/app/(stream)/(site)/(workspace)/constructs/[constructId]/page.tsx";
import { listQuests } from "@/quests/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectQuestNotFound } from "../quests/missing-quest-test-kit.tsx";
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

  await expectQuestNotFound(crypto.randomUUID());
  await expectNotFound(() =>
    ConstructPage(pageProps({ constructId: "no-such-construct" })),
  );

  expect(await listQuests(user.id)).toEqual([quest]);
});
