import { describe, expect, test } from "vitest";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  CHAT_API_PATH,
  chatFailureCase,
  readChatRequest,
} from "@/tutor/chat-protocol.ts";

const CHAT_ID = "6F1C0B52-1C6E-4F3A-9A52-0D3C2B7E8A10";
const USER_MESSAGE = {
  id: "m3",
  role: "user",
  parts: [{ type: "text", text: "How do I bevel an edge?" }],
};

function chatRequest(body: string): Request {
  return new Request(`http://localhost${CHAT_API_PATH}`, {
    method: "POST",
    body,
  });
}

describe("readChatRequest accepts", () => {
  test("a chat id and the new user message, with the id lowercased", async () => {
    const request = chatRequest(
      JSON.stringify({ id: CHAT_ID, message: USER_MESSAGE }),
    );

    expect(await readChatRequest(request)).toEqual({
      chatId: CHAT_ID.toLowerCase(),
      message: USER_MESSAGE,
    });
  });

  test("the message without fields the chat does not keep", async () => {
    const request = chatRequest(
      JSON.stringify({
        id: CHAT_ID,
        message: { ...USER_MESSAGE, metadata: { pinned: true } },
      }),
    );

    expect((await readChatRequest(request))?.message).toEqual(USER_MESSAGE);
  });
});

describe("readChatRequest rejects", () => {
  test.each([
    ["a body that is not JSON", "{"],
    ["a missing message", JSON.stringify({ id: CHAT_ID })],
    [
      "a chat id that is not a UUID",
      JSON.stringify({ id: "chat-1", message: USER_MESSAGE }),
    ],
    [
      "a message from the assistant",
      JSON.stringify({
        id: CHAT_ID,
        message: { ...USER_MESSAGE, role: "assistant" },
      }),
    ],
    [
      "a message without text",
      JSON.stringify({ id: CHAT_ID, message: { ...USER_MESSAGE, parts: [] } }),
    ],
  ])("%s", async (_name, body) => {
    expect(await readChatRequest(chatRequest(body))).toBeUndefined();
  });
});

describe("chat failures", () => {
  test("arrive as their case", async () => {
    const response = appErrorResponse(
      "database-unreachable",
      HTTP_STATUS.internalServerError,
    );

    expect(chatFailureCase(new Error(await response.text()))).toBe(
      "database-unreachable",
    );
  });

  test("read any other text as the unknown case", () => {
    expect(
      chatFailureCase(new Error(JSON.stringify({ error: "Unauthorized" }))),
    ).toBe("unknown");
  });
});
