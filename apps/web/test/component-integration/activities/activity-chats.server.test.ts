// Activities in chats, in the test database with the mock buddy: a chat
// starts in the activity she chooses, whose opening and instructions it
// follows; the buddy moves the chat into another activity with
// select_activity; and she changes it herself. The mock buddy only quotes its
// prompt, so whether a real buddy plays each activity well is the real-Claude
// smoke test's to check (use-cases/README.md).
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { currentActivity } from "@/activities/activity-sessions.ts";
import {
  DEFAULT_ACTIVITY_ID,
  getActivity,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/index.ts";
import {
  SELECT_ACTIVITY_OUTPUT,
  SELECT_ACTIVITY_TOOL,
  type SelectActivityOutput,
} from "@/activities/select-activity-contract.ts";
import { changeActivityAction } from "@/app/(workspace)/chats/[chatId]/actions.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import { listAllChats } from "@/chats/all-chats.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listMessages } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import type { ChatId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  buddyPrompt,
  buddyReply,
  formOf,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const BRAINSTORMING = getActivity("brainstorming");
const BREAKDOWN = getActivity("project-breakdown");
const OPEN_CHAT = getActivity(DEFAULT_ACTIVITY_ID);

// The project breakdown chosen in the new chat page's activity select.
const BREAKDOWN_SELECTED =
  /<option[^>]*value="project-breakdown"[^>]*selected/u;

// What select_activity answered in the reply.
function selectActivityOutput(reply: UIMessage): SelectActivityOutput {
  const call = reply.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === SELECT_ACTIVITY_TOOL,
  );
  if (call === undefined || !("output" in call)) {
    throw new Error("The buddy didn't call select_activity");
  }
  return SELECT_ACTIVITY_OUTPUT.parse(call.output);
}

// Has the mock buddy in the chat call select_activity for activityId.
async function buddySelects(
  chatId: ChatId,
  activityId: string,
): Promise<SelectActivityOutput> {
  const input = JSON.stringify({ activityId });
  return selectActivityOutput(
    await buddyReply(chatId, `/mock-tool ${SELECT_ACTIVITY_TOOL} ${input}`),
  );
}

// The form that changes the chat's activity to activityId.
function activityForm(chat: Pick<Chat, "id">, activityId: string): FormData {
  return formOf({ chatId: chat.id, activityId });
}

describe("use_case_start_chat_in_activity", () => {
  test("a chat started in an activity opens in it, and its prompt holds the activity", async () => {
    const user = await testUser();
    await signIn(user);

    const starting = startChatAction(
      { kind: "idle" },
      formOf({ projectId: "", activityId: "brainstorming", buddyId: "hippy" }),
    );
    await Promise.allSettled([starting]);
    const [chat] = await listAllChats(user.id);
    if (chat === undefined) {
      throw new Error("No chat started");
    }
    await expectRedirect(() => starting, `/chats/${chat.id}`);

    expect(await currentActivity(user.id, chat)).toEqual({
      id: "brainstorming",
      name: BRAINSTORMING.name,
      parts: BRAINSTORMING.parts,
    });
    const messages = await listMessages(user.id, chat.id);
    expect(messages.map(({ role }) => role)).toEqual(["assistant"]);
    const prompt = await buddyPrompt(chat.id);
    expect(prompt).toContain(BRAINSTORMING.parts.instructions);
    expect(prompt).not.toContain(OPEN_CHAT.parts.instructions);
  });

  test("the new chat page chooses the activity its start page names, and offers no interview", async () => {
    await signIn(await testUser());

    const markup = renderToString(
      await NewChatPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ activity: "project-breakdown" }),
      }),
    );

    expect(markup).toMatch(BREAKDOWN_SELECTED);
    expect(markup).not.toContain(`value="${INTERVIEW_ACTIVITY_ID}"`);
  });

  test("the interview can't start a chat with no project", async () => {
    const user = await testUser();
    await signIn(user);

    expect(
      await startChatAction(
        { kind: "idle" },
        formOf({
          projectId: "",
          activityId: INTERVIEW_ACTIVITY_ID,
          buddyId: "hippy",
        }),
      ),
    ).toEqual({
      kind: "invalid",
      message: NEW_CHAT_COPY.interviewNeedsProject,
    });
    expect(await listAllChats(user.id)).toEqual([]);
  });
});

describe("use_case_buddy_changes_activity", () => {
  test("select_activity moves the chat into the activity, which the next reply's prompt holds", async () => {
    const { user, chat } = await signedInChat();

    expect(await buddySelects(chat.id, "project-breakdown")).toEqual({
      status: "entered",
      activityId: "project-breakdown",
      name: BREAKDOWN.name,
      instructions: BREAKDOWN.parts.instructions,
    });

    expect((await currentActivity(user.id, chat)).id).toBe("project-breakdown");
    const prompt = await buddyPrompt(chat.id);
    expect(prompt).toContain(BREAKDOWN.parts.instructions);
    expect(prompt).not.toContain(OPEN_CHAT.parts.instructions);
  });

  test("an unknown activity, or the interview in a standalone chat, enters none", async () => {
    const user = await testUser();
    await signIn(user);
    const chat = await createStandaloneChat(user.id);

    expect(await buddySelects(chat.id, "no-such-activity")).toEqual({
      status: "unknown",
    });
    expect(await buddySelects(chat.id, INTERVIEW_ACTIVITY_ID)).toEqual({
      status: "needsProject",
    });
    expect((await currentActivity(user.id, chat)).id).toBe(DEFAULT_ACTIVITY_ID);
  });
});

describe("use_case_change_activity", () => {
  test("selecting the current activity keeps its existing session", async () => {
    const { chat } = await signedInChat();
    await changeActivityAction(activityForm(chat, "brainstorming"));
    const before = await getDb()
      .select()
      .from(activitySessions)
      .where(eq(activitySessions.chatId, chat.id));
    await changeActivityAction(activityForm(chat, "brainstorming"));
    const after = await getDb()
      .select()
      .from(activitySessions)
      .where(eq(activitySessions.chatId, chat.id));
    expect(after).toEqual(before);
  });

  test("her change applies to the next reply, and to her chat alone", async () => {
    const { user, chat } = await signedInChat();

    await changeActivityAction(activityForm(chat, "brainstorming"));

    expect((await currentActivity(user.id, chat)).id).toBe("brainstorming");
    expect(await buddyPrompt(chat.id)).toContain(
      BRAINSTORMING.parts.instructions,
    );

    const other = await testUser();
    await signIn(other);
    await expectNotFound(() =>
      changeActivityAction(activityForm(chat, "project-breakdown")),
    );
    expect((await currentActivity(user.id, chat)).id).toBe("brainstorming");
  });

  test("the interview is no choice in a standalone chat", async () => {
    const user = await testUser();
    await signIn(user);
    const chat = await createStandaloneChat(user.id);

    await expectNotFound(() =>
      changeActivityAction(activityForm(chat, INTERVIEW_ACTIVITY_ID)),
    );
    expect((await currentActivity(user.id, chat)).id).toBe(DEFAULT_ACTIVITY_ID);
  });
});
