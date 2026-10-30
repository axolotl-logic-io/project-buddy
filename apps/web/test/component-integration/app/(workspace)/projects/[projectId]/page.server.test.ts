// A project's page, in the test database: the new-chat form it shows with
// the project chosen, beside the project's chats. Starting a chat from the
// form is the action's (chats/actions.server.test.ts), and what the form
// does in the browser is page.browser.test.tsx's.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/index.ts";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { expectNotFound } from "../../../../test-database/navigation-test-kit.ts";
import { twoUsers } from "../../../../test-database/two-users-test-kit.ts";

const NEW_CHAT_FORM = /<form\b.*?<\/form>/su;
const PROJECT_SELECT = /<select\b[^>]*name="projectId"[^>]*>.*?<\/select>/su;
const ACTIVITY_SELECT = /<select\b[^>]*name="activityId"[^>]*>.*?<\/select>/su;
const OPTION_VALUE = /<option\b[^>]*value="(?<value>[^"]*)"/gu;
const SELECTED_VALUE = /<option\b[^>]*value="(?<value>[^"]*)"[^>]*selected=""/u;
const BUDDY_INPUT = /<input\b[^>]*name="buddyId"[^>]*value="(?<value>[^"]*)"/u;
const CHAT_HREF = /href="(?<href>\/chats\/[^"]+)"/gu;

// The project's page, as the signed-in user sees it.
async function pageHtml(projectId: string): Promise<string> {
  return renderToStaticMarkup(
    await ProjectPage({
      params: Promise.resolve({ projectId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

// The values of a select's options, and the one chosen.
function selectChoices(select: string): {
  readonly values: ReadonlySet<string>;
  readonly chosen: string | undefined;
} {
  const [, chosen] = SELECTED_VALUE.exec(select) ?? [];
  return {
    values: new Set(
      Array.from(select.matchAll(OPTION_VALUE), ([, value]) => value ?? ""),
    ),
    chosen,
  };
}

function chatLinks(html: string): string[] {
  return Array.from(html.matchAll(CHAT_HREF), ([, href]) => href ?? "");
}

describe("use_case_open_project", () => {
  test("shows the new-chat form with the project chosen beside its chats, and starts nothing", async () => {
    const { her, herData, otherData } = await twoUsers();
    const [project, otherProject, foreign] = await Promise.all([
      herData.project("Own fox"),
      herData.project("Own donut"),
      otherData.project("Private den"),
    ]);
    const chat = await herData.chat(project);
    await otherData.chat(foreign);

    const html = await pageHtml(project.id);

    const form = NEW_CHAT_FORM.exec(html)?.[0] ?? "";
    expect(selectChoices(PROJECT_SELECT.exec(form)?.[0] ?? "")).toEqual({
      values: new Set(["", project.id, otherProject.id]),
      chosen: project.id,
    });
    const activities = selectChoices(ACTIVITY_SELECT.exec(form)?.[0] ?? "");
    expect(activities.chosen).toBe(DEFAULT_ACTIVITY_ID);
    expect(activities.values.has(INTERVIEW_ACTIVITY_ID)).toBe(false);
    const [, buddyId] = BUDDY_INPUT.exec(form) ?? [];
    expect(buddyId).toBe(DEFAULT_BUDDY_ID);
    expect(form).toContain(NEW_CHAT_COPY.start);
    expect(html).toContain(PROJECT_COPY.newChatHeading);
    expect(html).not.toContain("/chats/new");
    expect(html).not.toContain(foreign.id);
    expect(html).not.toContain(foreign.name);
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
