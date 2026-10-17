// Starting a chat, in the test database with the mock tutor: the new-chat
// page and its Server Action. The mock writes a chat's opening by quoting
// the project's memory. What the form shows while it works, and the choices
// it keeps, are new-chat-form.test.tsx's.
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import { getBuddy, snapshotOf } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listChats, listMessages } from "@/chats/store.ts";
import { editMemory } from "@/memory/memory-store.ts";
import { listProjects, type Project } from "@/projects/store.ts";
import { formOf, messageText } from "@/test-database/chat-test-kit.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import { expectRedirect } from "@/test-database/navigation-test-kit.ts";
import { signIn } from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// How the mock tutor's opening of a chat whose project has a memory starts.
const MOCK_OPENING_START = "The mock tutor sums up the project's memory";
// A tag or comment in rendered markup, to read its text.
const MARKUP_TAG = /<[^>]*>/gu;

// The project's chats: the newest, and the rest, newest first.
async function newestChat(
  user: User,
  project: Project,
): Promise<{ newest: Chat; rest: Chat[] }> {
  const [newest, ...rest] = await listChats(user.id, project.id);
  if (newest === undefined) {
    throw new Error("The project has no chats");
  }
  return { newest, rest };
}

describe("use_case_new_chat", () => {
  test("starts the chat with the chosen buddy and the tutor's synopsis of the memory, first in the project's chats, and opens it", async () => {
    const user = await testUser();
    const data = testData(user);
    const project = await data.project();
    const earlierChat = await data.chat(project, "hippy");
    const goal = `A low-poly fox ${crypto.randomUUID()}`;
    await editMemory(user.id, {
      projectId: project.id,
      edit: { oldText: "", newText: `## Goal\n\n- ${goal}` },
      author: "user",
    });
    await signIn(user);

    const starting = startChatAction(
      { kind: "idle" },
      formOf({ projectId: project.id, buddyId: "mr-tee" }),
    );
    await Promise.allSettled([starting]);

    const { newest: started, rest } = await newestChat(user, project);
    expect(rest.map(({ id }) => id)).toEqual([earlierChat.id]);
    expect(started.buddy).toEqual(snapshotOf(getBuddy("mr-tee")));
    expect(started.name).toBeUndefined();
    const opening = await listMessages(user.id, started.id);
    expect(opening.map(({ role }) => role)).toEqual(["assistant"]);
    expect(messageText(opening[0])).toMatch(MOCK_OPENING_START);
    expect(messageText(opening[0])).toContain(goal);
    await expectRedirect(() => starting, `/chats/${started.id}`);
  });
});

describe("use_case_new_chat_without_projects", () => {
  test("the new-chat page asks her to create a project first, and links to her projects", async () => {
    await signIn(await testUser());

    const markup = renderToString(
      await NewChatPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup.replaceAll(MARKUP_TAG, "")).toBe(
      NEW_CHAT_COPY.needsProject(NEW_CHAT_COPY.projectLink).join(""),
    );
    expect(markup).toContain('href="/projects"');
    expect(markup).not.toContain("<select");
    expect(markup).not.toContain('type="radio"');
    expect(markup).not.toContain(NEW_CHAT_COPY.start);
  });

  test("starting a chat in a project not hers starts nothing", async () => {
    const user = await testUser();
    const othersProject = await testData(await testUser()).project();
    await signIn(user);

    const state = await startChatAction(
      { kind: "idle" },
      formOf({ projectId: othersProject.id, buddyId: "mr-tee" }),
    );

    expect(state).toEqual({
      kind: "invalid",
      message: NEW_CHAT_COPY.chooseProject,
    });
    expect(await listProjects(user.id)).toEqual([]);
  });
});
