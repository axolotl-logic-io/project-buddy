import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "@/app/api/chat/route.ts";
import { userMessageForCase } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { chatFailureMessage } from "@/tutor/chat-protocol.ts";
import type { replyToChat } from "@/tutor/reply.ts";

const tutor = vi.hoisted(() => ({ replyToChat: vi.fn<typeof replyToChat>() }));
vi.mock("@/tutor/reply.ts", () => tutor);

const CHAT_ID = "6F1C0B52-1C6E-4F3A-9A52-0D3C2B7E8A10";
const NEW_MESSAGE = {
  id: "m3",
  role: "user",
  parts: [{ type: "text", text: "How do I bevel an edge?" }],
};

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
}

const log = spyOnErrorLog();

beforeEach(() => {
  vi.clearAllMocks();
  tutor.replyToChat.mockResolvedValue(new Response("reply"));
});

describe("POST /api/chat", () => {
  test("hands a chat request to the tutor and returns its response", async () => {
    const response = await post(
      JSON.stringify({ id: CHAT_ID, message: NEW_MESSAGE }),
    );

    expect(await response.text()).toBe("reply");
    expect(tutor.replyToChat).toHaveBeenCalledWith({
      chatId: CHAT_ID.toLowerCase(),
      message: NEW_MESSAGE,
    });
  });

  test.each([
    ["a body that is not JSON", "not json"],
    ["a malformed chat id", JSON.stringify({ id: "1", message: NEW_MESSAGE })],
    ["a missing message", JSON.stringify({ id: CHAT_ID })],
  ])("answers 400 with the unknown case for %s", async (_name, body) => {
    const response = await post(body);

    expect(response.status).toBe(HTTP_STATUS.badRequest);
    expect(chatFailureMessage(new Error(await response.text()))).toBe(
      userMessageForCase("unknown"),
    );
    expect(tutor.replyToChat).not.toHaveBeenCalled();
    expect(log.mock.calls[0]?.[0]).toBe(
      "[app-error] unknown in POST /api/chat",
    );
  });
});
