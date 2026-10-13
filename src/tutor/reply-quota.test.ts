// How replyToChat answers once the owner's monthly quota is used up: the
// message is refused before it is saved or sent to Claude, and each reply
// is made by a model charged to the owner. conversation-to-answer.test.ts
// tests each case of the refusal.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { HTTP_STATUS } from "@/http-status.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CHAT_ID,
  checkQuota,
  finishReply,
  NEW_MESSAGE,
  OWNER,
  resetReplyTestKit,
  saveMessage,
  saveReply,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/tools/index.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("@/tutor/reply-test-kit.ts"));

function reply(): Promise<Response> {
  return replyToChat(OWNER, { chatId: CHAT_ID, message: NEW_MESSAGE });
}

beforeEach(() => {
  resetReplyTestKit();
});

describe("replyToChat once the owner's quota is used up", () => {
  test("refuses with 429 and the quota-used-up case, saving nothing and asking Claude nothing", async () => {
    checkQuota.mockResolvedValue({
      kind: "usedUp",
      resetsOn: new Date("2026-11-01T00:00:00Z"),
    });

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.tooManyRequests);
    expect(await response.text()).toBe(
      "quota-used-up\n2026-11-01T00:00:00.000Z",
    );
    expect(checkQuota).toHaveBeenCalledWith(OWNER);
    expect(saveMessage).not.toHaveBeenCalled();
    expect(tutorModel).not.toHaveBeenCalled();
    expect(saveReply).not.toHaveBeenCalled();
  });
});

describe("replyToChat within the owner's quota", () => {
  test("replies with a model charged to the owner", async () => {
    await finishReply(await reply());

    expect(tutorModel).toHaveBeenCalledWith(OWNER);
    expect(saveReply).toHaveBeenCalledTimes(1);
  });
});
