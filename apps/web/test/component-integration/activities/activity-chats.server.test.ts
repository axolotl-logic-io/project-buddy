// Activities in chats, in the test database with the mock buddy: a chat
// starts in the activity she chooses, whose opening and instructions it
// follows; the buddy moves the chat into another activity with
// select_activity. The mock buddy only quotes its
// prompt, so whether a real buddy plays each activity well is the real-Claude
// smoke test's to check (use-cases/README.md).
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/activity.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { getActivity } from "@/activities/index.ts";
import {
  SELECT_ACTIVITY_OUTPUT,
  SELECT_ACTIVITY_TOOL,
  type SelectActivityOutput,
} from "@/activities/select-activity-contract.ts";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import { listAllChats } from "@/chats/all-chats.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listMessages, saveMessage, saveReply } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { messages as messageRows } from "@/db/tables/projects-and-chats.ts";
import type { ChatId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  buddyPrompt,
  buddyReply,
  formOf,
  question,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const BRAINSTORMING = getActivity("brainstorming");
const BREAKDOWN = getActivity("project-breakdown");
const OPEN_CHAT = getActivity(DEFAULT_ACTIVITY_ID);

// The project breakdown chosen in the new chat page's activity select.
const BREAKDOWN_SELECTED =
  /<option[^>]*value="project-breakdown"[^>]*selected/u;
// The interview, and a new project, chosen in the new chat page's selects.
const INTERVIEW_SELECTED = /<option[^>]*value="interview"[^>]*selected/u;
const NEW_PROJECT_SELECTED = /<option[^>]*value="new"[^>]*selected/u;

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
      definition: BRAINSTORMING.definition,
    });
    const messages = await listMessages(user.id, chat.id);
    expect(messages.map(({ role }) => role)).toEqual(["assistant"]);
    const prompt = await buddyPrompt(chat.id);
    expect(prompt).toContain(BRAINSTORMING.definition.prompt);
    expect(prompt).not.toContain(OPEN_CHAT.definition.prompt);
  });

  test("the new chat page chooses the activity its start page names, and offers the interview", async () => {
    await signIn(await testUser());

    const markup = renderToString(
      await NewChatPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ activity: "project-breakdown" }),
      }),
    );

    expect(markup).toMatch(BREAKDOWN_SELECTED);
    expect(markup).toContain(`value="${INTERVIEW_ACTIVITY_ID}"`);
  });

  test("the interview's start page chooses a new project", async () => {
    await signIn(await testUser());

    const markup = renderToString(
      await NewChatPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ activity: INTERVIEW_ACTIVITY_ID }),
      }),
    );

    expect(markup).toMatch(INTERVIEW_SELECTED);
    expect(markup).toMatch(NEW_PROJECT_SELECTED);
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

    // The saved result holds what the chat shows, not the instructions,
    // which the reply's model call alone received.
    expect(await buddySelects(chat.id, "project-breakdown")).toEqual({
      status: "entered",
      activityId: "project-breakdown",
      name: BREAKDOWN.name,
    });

    expect((await currentActivity(user.id, chat)).id).toBe("project-breakdown");
    const prompt = await buddyPrompt(chat.id);
    expect(prompt).toContain(BREAKDOWN.definition.prompt);
    expect(prompt).not.toContain(OPEN_CHAT.definition.prompt);
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

  // A reply saved before results left them out still holds them in its
  // row, which is left as it is.
  test("a saved result's instructions are not served, and its row is not rewritten", async () => {
    const { user, chat } = await signedInChat();
    const asked = question("Let's break it down");
    await saveMessage(user.id, chat.id, asked);
    const replyId = crypto.randomUUID();
    await saveReply(
      user.id,
      chat.id,
      {
        id: replyId,
        role: "assistant",
        parts: [
          {
            type: `tool-${SELECT_ACTIVITY_TOOL}`,
            toolCallId: "call-1",
            state: "output-available",
            input: { activityId: "project-breakdown" },
            output: {
              status: "entered",
              activityId: "project-breakdown",
              name: BREAKDOWN.name,
              instructions: BREAKDOWN.definition.prompt,
            },
          },
        ],
      },
      asked.id,
    );

    const served = (await listMessages(user.id, chat.id)).find(
      ({ id }) => id === replyId,
    );
    if (served === undefined) {
      throw new Error("The reply was not saved");
    }
    expect(selectActivityOutput(served)).toEqual({
      status: "entered",
      activityId: "project-breakdown",
      name: BREAKDOWN.name,
    });
    expect(JSON.stringify(served)).not.toContain(BREAKDOWN.definition.prompt);
    const [row] = await getDb()
      .select({ parts: messageRows.parts })
      .from(messageRows)
      .where(eq(messageRows.id, replyId));
    expect(row?.parts).toMatchObject([
      { output: { instructions: BREAKDOWN.definition.prompt } },
    ]);
  });
});
