// A project's page, in the test database: its New chat button, with the
// new-chat form closed in its dialog, beside the project's chats. What the
// dialog does in the browser is page.browser.test.tsx's, and starting a
// chat is the action's (chats/actions.server.test.ts).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { listAllChats } from "@/chats/all-chats.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { expectNotFound } from "../../../../test-database/navigation-test-kit.ts";
import { twoUsers } from "../../../../test-database/two-users-test-kit.ts";

const CHAT_HREF = /href="(?<href>\/chats\/[^"]+)"/gu;
const DIALOG_BUTTON =
  /<button\b[^>]*aria-haspopup="dialog"[^>]*>.*?<\/button>/su;

// The project's page, as the signed-in user sees it.
async function pageHtml(projectId: string): Promise<string> {
  return renderToStaticMarkup(
    await ProjectPage({
      params: Promise.resolve({ projectId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

function chatLinks(html: string): string[] {
  return Array.from(html.matchAll(CHAT_HREF), ([, href]) => href ?? "");
}

describe("use_case_open_project", () => {
  test("shows the New chat button with the form closed, beside its chats, and starts nothing", async () => {
    const { her, herData, otherData } = await twoUsers();
    const [project, foreign] = await Promise.all([
      herData.project("Own fox"),
      otherData.project("Private den"),
    ]);
    const chat = await herData.chat(project);
    await herData.interviewChat(chat);
    await otherData.chat(foreign);

    const html = await pageHtml(project.id);

    expect(DIALOG_BUTTON.exec(html)?.[0]).toContain(
      NEW_CHAT_COPY.dialogHeading,
    );
    expect(html).not.toContain(`name="activityId"`);
    expect(html).not.toContain(`name="buddyId"`);
    expect(html).not.toContain(NEW_CHAT_COPY.start);
    expect(html).not.toContain("/chats/new");
    expect(html).not.toContain(foreign.id);
    expect(html).not.toContain(foreign.name);
    // The interview chat is linked once, from the chats, with no button of
    // its own beside the memory link.
    expect(chatLinks(html)).toEqual([`/chats/${chat.id}`]);
    expect((await listAllChats(her.id)).map(({ id }) => id)).toEqual([chat.id]);
  });

  test("another user's project is not found, with no form, and starts nothing", async () => {
    const { her, otherData } = await twoUsers();
    const foreign = await otherData.project("Private den");

    await expectNotFound(() => pageHtml(foreign.id));
    expect(await listAllChats(her.id)).toEqual([]);
  });
});
