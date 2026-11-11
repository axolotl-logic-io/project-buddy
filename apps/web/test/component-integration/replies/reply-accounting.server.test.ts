import { describe, expect, test } from "vitest";
import { listMessages, saveMessage } from "@/chats/store.ts";
import { goldOfMicroUsd } from "@/gold/gold.ts";
import { MESSAGE_ID } from "@/ids.ts";
import {
  claimGeneration,
  completeGeneration,
} from "@/images/generation-store.ts";
import {
  completeReplyAccounting,
  readReplyCosts,
  replyUsageRecorder,
} from "@/replies/reply-accounting.ts";
import { beginReplyRun, finishReplyRun } from "@/replies/reply-runs.ts";
import { pngBytes } from "../../support/images/image-fixtures.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const COST = 123;

describe("use_case_see_gold", () => {
  test("reply costs include naming, retain fractions, and are private to the acting user", async () => {
    const [owner, formerMember] = await Promise.all([testUser(), testUser()]);
    const project = await testData(owner).project();
    const chat = await testData(owner).chat(project);
    await signIn(owner);
    await sendChatMessage(chat.id, "Help with this quest.");
    const [cost] = await readReplyCosts(owner.id, chat.id);
    expect(cost?.state).toBe("actual");
    expect(cost?.gold).toBe(goldOfMicroUsd(await goldSpent(owner)));
    expect(cost?.gold).toBeGreaterThan(0);
    if (cost === undefined) {
      throw new Error("Missing cost");
    }
    const request = {
      owner: owner.id,
      chatId: chat.id,
      requestId: `${chat.id}:${cost.messageId}`,
      prompt: "A fox.",
    };
    const claim = await claimGeneration(request);
    if (claim.status !== "claimed") {
      throw new Error("No image claim");
    }
    expect((await readReplyCosts(owner.id, chat.id))[0]?.state).toBe("pending");
    await completeGeneration(owner.id, claim.id, {
      bytes: Buffer.from(pngBytes()),
      mediaType: "image/png",
      costMicroUsd: COST,
    });
    expect((await readReplyCosts(owner.id, chat.id))[0]).toMatchObject({
      state: "actual",
      gold: goldOfMicroUsd(await goldSpent(owner)),
    });
    const billed = await goldSpent(owner);
    expect((await claimGeneration(request)).status).toBe("generated");
    expect(await goldSpent(owner)).toBe(billed);

    expect(await goldSpent(formerMember)).toBe(0);
    expect(await readReplyCosts(formerMember.id, chat.id)).toEqual([]);
    expect((await listMessages(owner.id, chat.id)).at(-1)?.role).toBe(
      "assistant",
    );
  });

  test("pending and unknown operations never mean zero; settlement is idempotent", async () => {
    const user = await testUser();
    const project = await testData(user).project();
    const chat = await testData(user).chat(project);
    const messageId = MESSAGE_ID.parse("accounting-is-idempotent");
    await saveMessage(user.id, chat.id, {
      id: messageId,
      role: "user",
      parts: [{ type: "text", text: "Help." }],
    });
    const run = await beginReplyRun(user.id, chat.id, messageId);
    const record = await replyUsageRecorder(user.id, run).begin();
    await finishReplyRun(user.id, run, "completed");
    await completeReplyAccounting(user.id, run);
    expect((await readReplyCosts(user.id, chat.id))[0]?.state).toBe("pending");
    await record(COST);
    await record(COST);
    expect(await goldSpent(user)).toBe(COST);
    expect((await readReplyCosts(user.id, chat.id))[0]).toEqual({
      messageId,
      state: "actual",
      gold: goldOfMicroUsd(COST),
    });
    const unknown = await replyUsageRecorder(user.id, run).begin();
    await unknown(undefined);
    expect((await readReplyCosts(user.id, chat.id))[0]?.state).toBe("unknown");
    expect(await goldSpent(user)).toBe(COST);
  });
});
