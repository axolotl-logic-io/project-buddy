// Activities in conversations, in the test database with the mock construct:
// the construct moves the conversation into another activity with
// select_activity. The mock construct only quotes its
// prompt, so whether a real construct plays each activity well is the real-Claude
// smoke test's to check (use-cases/README.md).
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
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
import { listMessages, saveMessage, saveReply } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { getDb } from "@/db/client.ts";
import { messages as messageRows } from "@/db/tables/projects-and-chats.ts";
import type { ChatId } from "@/ids.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  constructPrompt,
  constructReply,
  question,
  signedInChat,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const BREAKDOWN = getActivity("project-breakdown");
const OPEN_CHAT = getActivity(DEFAULT_ACTIVITY_ID);

// What select_activity answered in the reply.
function selectActivityOutput(reply: UIMessage): SelectActivityOutput {
  const call = reply.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === SELECT_ACTIVITY_TOOL,
  );
  if (call === undefined || !("output" in call)) {
    throw new Error("The construct didn't call select_activity");
  }
  return SELECT_ACTIVITY_OUTPUT.parse(call.output);
}

// Has the mock construct in the chat call select_activity for activityId.
async function constructSelects(
  chatId: ChatId,
  activityId: string,
): Promise<SelectActivityOutput> {
  const input = JSON.stringify({ activityId });
  return selectActivityOutput(
    await constructReply(chatId, `/mock-tool ${SELECT_ACTIVITY_TOOL} ${input}`),
  );
}

describe("use_case_construct_changes_activity", () => {
  test("select_activity moves the chat into the activity, which the next reply's prompt holds", async () => {
    const { user, chat } = await signedInChat();

    // The saved result holds what the chat shows, not the instructions,
    // which the reply's model call alone received.
    expect(await constructSelects(chat.id, "project-breakdown")).toEqual({
      status: "entered",
      activityId: "project-breakdown",
      name: BREAKDOWN.name,
    });

    expect((await currentActivity(user.id, chat)).id).toBe("project-breakdown");
    const prompt = await constructPrompt(chat.id);
    expect(prompt).toContain(BREAKDOWN.definition.prompt);
    expect(prompt).not.toContain(OPEN_CHAT.definition.prompt);
  });

  test("an unknown activity enters none; an older interview request enters breakdown", async () => {
    const user = await testUser();
    await signIn(user);
    const chat = await privateChat(user.id);

    expect(await constructSelects(chat.id, "no-such-activity")).toEqual({
      status: "unknown",
    });
    expect(await constructSelects(chat.id, INTERVIEW_ACTIVITY_ID)).toEqual({
      status: "entered",
      activityId: "project-breakdown",
      name: BREAKDOWN.name,
    });
    expect((await currentActivity(user.id, chat)).id).toBe("project-breakdown");
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
