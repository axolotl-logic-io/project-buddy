// Sends her message to POST /api/chat in a server test, as the chat view
// does, and waits for everything the reply does after it, such as saving
// the reply and naming the chat. A test file that uses it mocks next/server's
// after() with after-tasks-test-kit.ts's, so the tasks are kept for it:
//
//   vi.mock("next/server", async (importOriginal) => ({
//     ...(await importOriginal<typeof import("next/server")>()),
//     connection: (): Promise<void> => Promise.resolve(),
//     after: (await import("@/quota/after-tasks-test-kit.ts")).after,
//   }));
import { POST } from "@/app/api/chat/route.ts";
import type { ChatId } from "@/ids.ts";
import { finishAfterTasks } from "@/quota/after-tasks-test-kit.ts";
import { requestWithSession } from "@/test-database/session-test-kit.ts";

// What the route answered: its status, and its body read to the end.
interface ChatResponse {
  readonly status: number;
  readonly body: string;
}

// Sends text as a new message of the signed-in user's in chatId, and
// returns the answer once the reply and its after() tasks are done.
async function sendChatMessage(
  chatId: ChatId,
  text: string,
): Promise<ChatResponse> {
  const response = await POST(
    requestWithSession("http://localhost/api/chat", {
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
  const body = await response.text();
  await finishAfterTasks();
  return { status: response.status, body };
}

export type { ChatResponse };
export { sendChatMessage };
