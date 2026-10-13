import { describe, expect, test } from "vitest";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  CHAT_API_PATH,
  chatFailureCase,
  isFromNewerBuild,
  quotaUsedUpResponse,
  readChatFailure,
  readChatRequest,
} from "@/tutor/chat-protocol.ts";

const DECEMBER_FIRST = new Date("2026-12-01T00:00:00Z");
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
      "a message with an empty id",
      JSON.stringify({ id: CHAT_ID, message: { ...USER_MESSAGE, id: "" } }),
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

  test("read a case name this build doesn't know as unknown, from a newer build", () => {
    const error = new Error("some-future-case");

    expect(readChatFailure(error)).toEqual({ errorCase: "unknown" });
    expect(isFromNewerBuild(error)).toBe(true);
  });

  test.each([
    ["a case this build knows", "overloaded"],
    ["the unknown case", "unknown"],
    ["JSON", JSON.stringify({ error: "Unauthorized" })],
    ["a network failure", "Failed to fetch"],
  ])("don't take %s to be from a newer build", (_name, text) => {
    expect(isFromNewerBuild(new Error(text))).toBe(false);
  });
});

describe("quota-used-up refusals", () => {
  test("are 429 with the case name and the server's reset instant on its own line", async () => {
    const response = quotaUsedUpResponse(DECEMBER_FIRST);

    expect(response.status).toBe(HTTP_STATUS.tooManyRequests);
    expect(await response.text()).toBe(
      "quota-used-up\n2026-12-01T00:00:00.000Z",
    );
  });

  test("arrive as their case and the server's reset", async () => {
    const response = quotaUsedUpResponse(DECEMBER_FIRST);
    const error = new Error(await response.text());

    expect(readChatFailure(error)).toEqual({
      errorCase: "quota-used-up",
      resetsOn: DECEMBER_FIRST,
    });
    expect(chatFailureCase(error)).toBe("quota-used-up");
  });

  test.each([
    ["no reset", "quota-used-up"],
    ["a reset that is not an instant", "quota-used-up\nDecember 1"],
    ["a reset without its time zone", "quota-used-up\n2026-12-01T00:00:00"],
  ])("arrive with no reset when they have %s", (_name, text) => {
    expect(readChatFailure(new Error(text))).toEqual({
      errorCase: "quota-used-up",
      resetsOn: undefined,
    });
  });

  test.each([
    ["another case with a second line", "overloaded\n2026-12-01T00:00:00.000Z"],
    [
      "a refusal with a third line",
      "quota-used-up\n2026-12-01T00:00:00.000Z\nx",
    ],
  ])("read %s as the unknown case", (_name, text) => {
    expect(readChatFailure(new Error(text))).toEqual({ errorCase: "unknown" });
  });
});
