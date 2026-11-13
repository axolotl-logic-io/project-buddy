import type {
  LanguageModelV4CallOptions,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";
import { describe, expect, test, vi } from "vitest";
import { listMessages, readStoppedReply, saveReply } from "@/chats/store.ts";
import { MESSAGE_ID } from "@/ids.ts";
import { localConstructModel } from "@/replies/local-model.ts";
import { replyModel } from "@/replies/model.ts";
import { replyToChat } from "@/replies/reply.ts";
import { stopReply } from "@/replies/reply-runs.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";

vi.mock("@/replies/model.ts", { spy: true });
vi.mock("@/chats/store.ts", { spy: true });

// A provider held by an event, rather than timing. Stop must reach the
// provider's abort signal, while a dropped browser response must not.
function heldProvider(): {
  readonly started: Promise<void>;
  readonly aborted: Promise<void>;
  readonly finish: () => void;
} {
  const started = Promise.withResolvers<void>();
  const aborted = Promise.withResolvers<void>();
  let settled = false;
  let output:
    | ReadableStreamDefaultController<LanguageModelV4StreamPart>
    | undefined;
  vi.mocked(replyModel).mockImplementation(() => ({
    ...localConstructModel(),
    doStream: ({
      abortSignal,
    }: LanguageModelV4CallOptions): Promise<LanguageModelV4StreamResult> =>
      Promise.resolve({
        stream: new ReadableStream<LanguageModelV4StreamPart>({
          start(
            controller: ReadableStreamDefaultController<LanguageModelV4StreamPart>,
          ): void {
            output = controller;
            controller.enqueue({ type: "text-start", id: "text" });
            controller.enqueue({
              type: "text-delta",
              id: "text",
              delta: "A partial reply.",
            });
            abortSignal?.addEventListener(
              "abort",
              () => {
                settled = true;
                aborted.resolve();
                controller.error(new DOMException("Stopped", "AbortError"));
              },
              { once: true },
            );
            started.resolve();
          },
        }),
      }),
  }));
  return {
    started: started.promise,
    aborted: aborted.promise,
    finish: (): void => {
      if (settled) {
        return;
      }
      settled = true;
      output?.enqueue({ type: "text-end", id: "text" });
      output?.enqueue({
        type: "finish",
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 0, text: 0, reasoning: undefined },
        },
      });
      output?.close();
    },
  };
}

describe("use_case_stop_reply", () => {
  test("the owner requests provider cancellation; repeated Stop preserves the partial reply and clears retry state", async () => {
    const [user, formerMember] = await Promise.all([testUser(), testUser()]);
    const quest = await testData(user).quest();
    const chat = await testData(user).chat(quest);
    const provider = heldProvider();
    const messageId = MESSAGE_ID.parse("cancel-owner-reply");
    try {
      const response = await replyToChat(user.id, {
        chatId: chat.id,
        message: {
          id: messageId,
          role: "user",
          parts: [{ type: "text", text: "Please help." }],
        },
      });
      const body = response.text();
      await provider.started;
      expect(await stopReply(formerMember.id, chat.id, messageId)).toBe(
        "not-found",
      );
      expect(await stopReply(user.id, chat.id, messageId)).toBe("active");
      await provider.aborted;
      await body;
      await afterTasksDone();
      expect(await stopReply(user.id, chat.id, messageId)).toBe("cancelled");
      expect(await stopReply(formerMember.id, chat.id, messageId)).toBe(
        "not-found",
      );
      const saved = await listMessages(user.id, chat.id);
      expect(JSON.stringify(saved)).toContain(CHAT_COPY.cancelledReply);
      expect(await readStoppedReply(user.id, chat.id)).toBeUndefined();
    } finally {
      provider.finish();
      await afterTasksDone();
      vi.restoreAllMocks();
    }
  });
});

test("ordinary browser disconnect preserves provider completion and its saved reply", async () => {
  const user = await testUser();
  const quest = await testData(user).quest();
  const chat = await testData(user).chat(quest);
  const provider = heldProvider();
  const messageId = MESSAGE_ID.parse("disconnect-keeps-reply");
  try {
    const response = await replyToChat(user.id, {
      chatId: chat.id,
      message: {
        id: messageId,
        role: "user",
        parts: [{ type: "text", text: "Please continue." }],
      },
    });
    await provider.started;
    await response.body?.cancel();
    provider.finish();
    await afterTasksDone();
    const saved = await listMessages(user.id, chat.id);
    expect(JSON.stringify(saved)).toContain("A partial reply.");
    expect(JSON.stringify(saved)).not.toContain(CHAT_COPY.cancelledReply);
    expect(await stopReply(user.id, chat.id, messageId)).toBe("completed");
  } finally {
    provider.finish();
    await afterTasksDone();
    vi.restoreAllMocks();
  }
});

test("failed partial persistence never reports a completed cancellation", async () => {
  const user = await testUser();
  const quest = await testData(user).quest();
  const chat = await testData(user).chat(quest);
  const provider = heldProvider();
  const messageId = MESSAGE_ID.parse("failed-cancel-persistence");
  vi.mocked(saveReply).mockRejectedValueOnce(new Error("Local save failure"));
  try {
    const response = await replyToChat(user.id, {
      chatId: chat.id,
      message: {
        id: messageId,
        role: "user",
        parts: [{ type: "text", text: "Please help." }],
      },
    });
    const body = response.text().catch(() => "");
    await provider.started;
    expect(await stopReply(user.id, chat.id, messageId)).toBe("active");
    await provider.aborted;
    await body;
    await afterTasksDone();
    expect(await stopReply(user.id, chat.id, messageId)).toBe("failed");
    expect(JSON.stringify(await listMessages(user.id, chat.id))).not.toContain(
      CHAT_COPY.cancelledReply,
    );
    expect(await readStoppedReply(user.id, chat.id)).toBe(messageId);
  } finally {
    provider.finish();
    await afterTasksDone();
    vi.restoreAllMocks();
  }
});
