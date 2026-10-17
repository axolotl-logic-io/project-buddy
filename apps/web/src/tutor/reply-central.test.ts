// How replyToChat answers in the user's central chat, which is in no
// project: as in a project chat, but with the manual's tools and
// create_project, whose context names no project, and no project memory. The real tools run here, not the kit's
// stand-ins.
import type { LanguageModelV4FunctionTool } from "@ai-sdk/provider";
import type * as aiModule from "ai";
import { streamText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { HTTP_STATUS } from "@/http-status.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CENTRAL_CHAT,
  CHAT_ID,
  checkQuota,
  finishReply,
  getChat,
  NEW_MESSAGE,
  OWNER,
  REPLY,
  readMemory,
  resetReplyTestKit,
  savedReply,
  saveMessage,
  saveReply,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";
import { streamedText } from "@/tutor/stream-body-test-kit.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { CREATE_PROJECT_TOOL } from "@/tutor/tools/create-project-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

vi.mock("@/chats/store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("next/server", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock(
  "@/accounts/users-store.ts",
  () => import("@/accounts/users-store-test-kit.ts"),
);
vi.mock("@/tutor/chat-naming.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("@/tutor/reply-test-kit.ts"));
// The real streamText, recording the settings each model call gets.
vi.mock("ai", async (importOriginal) => {
  const ai = await importOriginal<typeof aiModule>();
  return { ...ai, streamText: vi.fn(ai.streamText) };
});

function reply(): Promise<Response> {
  return replyToChat(OWNER, { chatId: CHAT_ID, message: NEW_MESSAGE });
}

// A model that replies REPLY and records what each call sent.
function recordingTutor(): MockLanguageModelV4 {
  const recorder = new MockLanguageModelV4({
    doStream: mockTutorModel(() => [{ text: REPLY, toolCalls: [] }]).doStream,
  });
  tutorModel.mockReturnValue(recorder);
  return recorder;
}

// The function tools the model's first call was sent, in order.
function sentTools(
  recorder: MockLanguageModelV4,
): LanguageModelV4FunctionTool[] {
  return (recorder.doStreamCalls[0]?.tools ?? []).flatMap((tool) => {
    if (tool.type === "function") {
      return [tool];
    }
    return [];
  });
}

beforeEach(() => {
  resetReplyTestKit();
  getChat.mockResolvedValue(CENTRAL_CHAT);
});

describe("replyToChat in the central chat", () => {
  test("streams the tutor's reply and saves it through the chat's id", async () => {
    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(streamedText(await finishReply(response))).toBe(REPLY);
    expect(saveMessage).toHaveBeenCalledWith(OWNER, CHAT_ID, NEW_MESSAGE);
    expect(saveReply).toHaveBeenCalledWith(
      OWNER,
      CHAT_ID,
      savedReply(),
      expect.anything(),
    );
  });

  test("refuses with 409 a message another request saved first", async () => {
    saveMessage.mockResolvedValue("already-saved");

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.conflict);
    expect(await response.text()).toBe("already-answered");
    expect(saveReply).not.toHaveBeenCalled();
  });

  test("refuses with 429 once the owner's quota is used up", async () => {
    checkQuota.mockResolvedValue({
      kind: "usedUp",
      resetsOn: new Date("2026-11-01T00:00:00Z"),
    });

    const response = await reply();

    expect(response.status).toBe(HTTP_STATUS.tooManyRequests);
    expect(tutorModel).not.toHaveBeenCalled();
    expect(saveMessage).not.toHaveBeenCalled();
  });
});

describe("the model call of a reply in the central chat", () => {
  test("sends the manual's tools and create_project, the last one a cache breakpoint", async () => {
    const recorder = recordingTutor();

    await finishReply(await reply());

    const tools = sentTools(recorder);
    expect(tools.map(({ name }) => name)).toEqual([
      CITE_MANUAL_TOOL,
      SEARCH_MANUAL_TOOL,
      CREATE_PROJECT_TOOL,
    ]);
    expect(tools.at(-1)?.providerOptions).toEqual(PROMPT_CACHE_BREAKPOINT);
    for (const tool of tools.slice(0, -1)) {
      expect(tool.providerOptions).toBeUndefined();
    }
  });

  test("gives create_project the owner, the chat and its buddy, and no project", async () => {
    recordingTutor();

    await finishReply(await reply());

    const settings = vi.mocked(streamText).mock.calls.map(([call]) => call);
    expect(settings).not.toHaveLength(0);
    for (const call of settings) {
      expect(call.toolsContext).toEqual({
        [CREATE_PROJECT_TOOL]: {
          owner: OWNER,
          chatId: CHAT_ID,
          buddy: CENTRAL_CHAT.buddy,
        },
      });
      expect(JSON.stringify(call.toolsContext)).not.toContain("projectId");
    }
  });

  test("opens the chat's prompt with the central chat part and reads no memory", async () => {
    const recorder = recordingTutor();

    await finishReply(await reply());

    const system = (recorder.doStreamCalls[0]?.prompt ?? []).flatMap(
      (message) => {
        if (message.role === "system") {
          return [message.content];
        }
        return [];
      },
    );
    expect(system[1]?.startsWith(CENTRAL_CHAT.buddy.parts.centralChat)).toBe(
      true,
    );
    expect(readMemory).not.toHaveBeenCalled();
  });
});
