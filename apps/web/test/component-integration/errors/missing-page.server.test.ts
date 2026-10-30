// "use_case_open_missing_page" in use-cases/when-things-go-wrong.md, where it
// needs the server: a page for something that doesn't exist, or a garbled
// link, ends in Next's notFound(), which shows src/app/not-found.tsx. Next
// shows the same page for an address the site has no route for; the page's
// link back to her projects is not-found.test.tsx's.
import { expect, test } from "vitest";
import BuddyPage from "@/app/(workspace)/buddies/[buddyId]/page.tsx";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { listProjects } from "@/projects/store.ts";
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
  const project = await testData(user).project();
  await signIn(user);

  await expectNotFound(() =>
    ProjectPage(pageProps({ projectId: crypto.randomUUID() })),
  );
  await expectNotFound(() => ChatPage(pageProps({ chatId: "not-a-chat-id" })));
  await expectNotFound(() =>
    BuddyPage(pageProps({ buddyId: "no-such-buddy" })),
  );

  expect(await listProjects(user.id)).toEqual([project]);
});
