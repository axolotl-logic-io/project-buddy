// Starting a chat, in the test database with the mock buddy: the new-chat
// page and its Server Action. A built-in buddy opens with its prepared
// opening; a buddy of the user's own that has been edited has the mock
// write its opening, quoting the project's memory. What the form shows
// while it works, and the choices it keeps, are new-chat-form.test.tsx's.
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { DEFAULT_ACTIVITY_ID, getActivity } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import { getBuddy, snapshotOf } from "@/buddies/index.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listChats, listMessages } from "@/chats/store.ts";
import { editMemory } from "@/memory/memory-store.ts";
import type { Project } from "@/projects/store.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf, messageText } from "../../../test-database/chat-test-kit.ts";
import { expectRedirect } from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

// How the mock buddy's opening of a chat whose project has a memory starts.
const MOCK_OPENING_START = "The mock buddy sums up the project's memory";
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

// A signed-in user's project, whose memory holds a goal.
async function projectWithGoal(
  user: User,
): Promise<{ project: Project; goal: string }> {
  const project = await testData(user).project();
  const goal = `A low-poly fox ${crypto.randomUUID()}`;
  await Promise.all([
    editMemory(user.id, {
      projectId: project.id,
      edit: { oldText: "", newText: `## Goal\n\n- ${goal}` },
      author: "user",
    }),
    signIn(user),
  ]);
  return { project, goal };
}

describe("use_case_new_chat", () => {
  test("starts the chat with the chosen buddy and its prepared opening, first in the project's chats, and opens it", async () => {
    const user = await testUser();
    const { project } = await projectWithGoal(user);
    const earlierChat = await testData(user).chat(project, "hippy");

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
    expect(messageText(opening[0])).toBe(
      preparedOpening(
        getBuddy("mr-tee").parts,
        getActivity(DEFAULT_ACTIVITY_ID).parts,
      ),
    );
    await expectRedirect(() => starting, `/chats/${started.id}`);
  });

  test("an own buddy that has been edited writes its opening, with a synopsis of the memory", async () => {
    const user = await testUser();
    const [{ project, goal }, buddy] = await Promise.all([
      projectWithGoal(user),
      testData(user).editedBuddy(),
    ]);

    const starting = startChatAction(
      { kind: "idle" },
      formOf({ projectId: project.id, buddyId: buddy.id }),
    );
    await Promise.allSettled([starting]);

    const { newest: started } = await newestChat(user, project);
    expect(started.buddy).toEqual({ name: buddy.name, parts: buddy.parts });
    const opening = await listMessages(user.id, started.id);
    expect(opening.map(({ role }) => role)).toEqual(["assistant"]);
    expect(messageText(opening[0])).toMatch(MOCK_OPENING_START);
    expect(messageText(opening[0])).toContain(goal);
    await expectRedirect(() => starting, `/chats/${started.id}`);
  });
});

describe("use_case_new_chat_without_projects", () => {
  test("the new-chat page offers no project, and starts a standalone chat with the buddy's opening", async () => {
    const user = await testUser();
    await signIn(user);

    const markup = renderToString(
      await NewChatPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(markup.replaceAll(MARKUP_TAG, "")).toContain(
      NEW_CHAT_COPY.noProject,
    );
    expect(markup).toContain(NEW_CHAT_COPY.start);

    const starting = startChatAction(
      { kind: "idle" },
      formOf({ projectId: "", buddyId: "mr-tee" }),
    );
    await Promise.allSettled([starting]);
    const [started] = await listAllChats(user.id);
    if (started === undefined) {
      throw new Error("No chat started");
    }
    expect(started.project).toBeUndefined();
    const opening = await listMessages(user.id, started.id);
    expect(opening.map(({ role }) => role)).toEqual(["assistant"]);
    await expectRedirect(() => starting, `/chats/${started.id}`);
  });
});
