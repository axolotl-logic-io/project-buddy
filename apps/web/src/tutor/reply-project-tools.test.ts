// How replyToChat hands a project chat's tools their context, with the real
// tools of tools/index.ts rather than the kit's stand-ins: the project
// counterpart of reply-central.test.ts.
import type * as aiModule from "ai";
import { streamText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { replyToChat } from "@/tutor/reply.ts";
import {
  CHAT_ID,
  finishReply,
  NEW_MESSAGE,
  OWNER,
  PROJECT_ID,
  resetReplyTestKit,
} from "@/tutor/reply-test-kit.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

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

beforeEach(() => {
  resetReplyTestKit();
});

describe("the model call of a reply in a project chat", () => {
  test("gives update_memory the owner, the loaded chat and its project", async () => {
    await finishReply(
      await replyToChat(OWNER, { chatId: CHAT_ID, message: NEW_MESSAGE }),
    );

    const settings = vi.mocked(streamText).mock.calls.map(([call]) => call);
    expect(settings).not.toHaveLength(0);
    for (const call of settings) {
      expect(call.toolsContext).toEqual({
        [UPDATE_MEMORY_TOOL]: {
          owner: OWNER,
          chatId: CHAT_ID,
          projectId: PROJECT_ID,
        },
      });
    }
  });
});
