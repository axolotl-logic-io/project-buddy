// For server tests: the signed-in test user chats with the mock tutor
// through POST /api/chat, as the chat view does, and gets the reply the
// route saved. A test file that uses it replaces next/server with
// after-tasks-test-kit.ts, whose after() the reply is saved in:
//   vi.mock("next/server", () => import("@/tutor/after-tasks-test-kit.ts"));
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { POST } from "@/app/api/chat/route.ts";
import { currentUser } from "@/auth/current-user.ts";
import { listMessages } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { ChatId } from "@/ids.ts";
import { requestWithSession } from "@/test-database/session-test-kit.ts";
import { finishAfterTasks } from "@/tutor/after-tasks-test-kit.ts";
import {
  UPDATE_MEMORY_OUTPUT,
  UPDATE_MEMORY_TOOL,
  type UpdateMemoryOutput,
} from "@/tutor/tools/update-memory-contract.ts";

const CHAT_URL = "http://localhost/api/chat";

// Sends text in the chat as the signed-in user, reads the streamed reply to
// its end, waits for the route to save it, and returns the reply as saved.
async function tutorReply(chatId: ChatId, text: string): Promise<UIMessage> {
  const user = await currentUser();
  if (user === undefined) {
    throw new Error("Sign the test user in before chatting");
  }
  const response = await POST(
    requestWithSession(CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: chatId,
        message: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text }],
        },
      }),
    }),
  );
  if (response.status !== HTTP_STATUS.ok) {
    throw new Error(`The chat answered ${response.status}`);
  }
  await response.text();
  await finishAfterTasks();
  const reply = (await listMessages(user.id, chatId)).at(-1);
  if (reply?.role !== "assistant") {
    throw new Error("The tutor's reply was not saved");
  }
  return reply;
}

// The words of a message: its text parts, joined.
function messageText({ parts }: UIMessage): string {
  return parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      return "";
    })
    .join("");
}

// The tutor's system prompt in the chat, as the mock tutor quotes it.
async function tutorPrompt(chatId: ChatId): Promise<string> {
  return messageText(await tutorReply(chatId, "/mock-system-prompt"));
}

// Has the mock tutor in the chat change the project's memory, replacing
// oldText with newText (an empty oldText adds newText at the end), and
// returns what the update_memory tool answered.
async function tutorEdits(
  chatId: ChatId,
  oldText: string,
  newText: string,
): Promise<UpdateMemoryOutput> {
  const edit = JSON.stringify({ oldText, newText });
  const reply = await tutorReply(
    chatId,
    `/mock-tool ${UPDATE_MEMORY_TOOL} ${edit}`,
  );
  const call = reply.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === UPDATE_MEMORY_TOOL,
  );
  if (call === undefined || !("output" in call)) {
    throw new Error("The tutor didn't change the memory");
  }
  return UPDATE_MEMORY_OUTPUT.parse(call.output);
}

export { messageText, tutorEdits, tutorPrompt, tutorReply };
