import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  generationOwnedBy,
  replyRunOwnedBy,
  replyUsageOwnedBy,
} from "@/accounts/owner-scope.ts";
import { REPLY_CLAIM_SECONDS } from "@/chats/chat-rows.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { replyRuns } from "@/db/tables/reply-runs.ts";
import { replyUsage } from "@/db/tables/reply-usage.ts";
import { goldOfMicroUsd } from "@/gold/gold.ts";
import { adjustGold, lockGold } from "@/gold/gold-store.ts";
import type { ChatId, UserId } from "@/ids.ts";
import type { UsageRecorder } from "@/quota/usage-recorder.ts";

function replyUsageRecorder(owner: UserId, runId: string): UsageRecorder {
  return {
    begin: async () => {
      const [operation] = await getDb()
        .insert(replyUsage)
        .values({ userId: owner, runId })
        .returning({ id: replyUsage.id });
      const id = z.uuid().parse(operation?.id);
      return async (cost: number | undefined): Promise<void> => {
        let status = "unknown";
        if (cost !== undefined) {
          status = "charged";
        }
        await inTransaction(async (tx) => {
          await lockGold(owner, tx);
          const [pending] = await tx
            .select({ id: replyUsage.id })
            .from(replyUsage)
            .where(
              and(
                replyUsageOwnedBy(owner),
                eq(replyUsage.id, id),
                eq(replyUsage.status, "pending"),
              ),
            )
            .for("update");
          if (pending === undefined) {
            return;
          }
          if (cost !== undefined) {
            await adjustGold(owner, -cost, tx);
          }
          await tx
            .update(replyUsage)
            .set({ status, costMicroUsd: cost ?? null })
            .where(and(replyUsageOwnedBy(owner), eq(replyUsage.id, id)));
        });
      };
    },
  };
}

async function completeReplyAccounting(
  owner: UserId,
  runId: string,
): Promise<void> {
  await getDb()
    .update(replyRuns)
    .set({ accountingComplete: true })
    .where(and(replyRunOwnedBy(owner), eq(replyRuns.id, runId)));
}

const SECONDS_TO_MS = 1000;

interface ReplyCost {
  readonly messageId: string;
  readonly gold: number;
  readonly state: "pending" | "unknown" | "actual";
}

// Only the payer can see their charges. Totals include retries, automatic
// naming and the one idempotent image generation linked to the user message.
async function readReplyCosts(
  owner: UserId,
  chatId: ChatId,
  now: Date = new Date(),
): Promise<ReplyCost[]> {
  const runs = await getDb()
    .select()
    .from(replyRuns)
    .where(and(replyRunOwnedBy(owner), eq(replyRuns.chatId, chatId)));
  if (runs.length === 0) {
    return [];
  }
  const operations = await getDb()
    .select()
    .from(replyUsage)
    .where(
      and(
        replyUsageOwnedBy(owner),
        inArray(
          replyUsage.runId,
          runs.map((run) => run.id),
        ),
      ),
    );
  const images = await getDb()
    .select()
    .from(imageGenerations)
    .where(and(generationOwnedBy(owner), eq(imageGenerations.chatId, chatId)));
  return [...new Set(runs.map((run) => run.messageId))].map(
    (messageId): ReplyCost => {
      const attempts = runs.filter((run) => run.messageId === messageId);
      const ids = new Set(attempts.map((run) => run.id));
      const usage = operations.filter((operation) => ids.has(operation.runId));
      const image = images.find(
        (entry) => entry.requestId === `${chatId}:${messageId}`,
      );
      let state: ReplyCost["state"] = "actual";
      if (
        usage.some((entry) => entry.status === "unknown") ||
        image?.status === "failed"
      ) {
        state = "unknown";
      }
      if (
        attempts.some(
          (run) => run.status === "active" || !run.accountingComplete,
        ) ||
        usage.some((entry) => entry.status === "pending") ||
        image?.status === "pending"
      ) {
        state = "pending";
      }
      if (
        state === "pending" &&
        attempts.every(
          (run) =>
            now.getTime() - run.createdAt.getTime() >
            REPLY_CLAIM_SECONDS * SECONDS_TO_MS,
        )
      ) {
        state = "unknown";
      }
      const cost =
        usage.reduce((sum, entry) => sum + (entry.costMicroUsd ?? 0), 0) +
        (image?.costMicroUsd ?? 0);
      return { messageId, gold: goldOfMicroUsd(cost), state };
    },
  );
}

export type { ReplyCost };
export { completeReplyAccounting, readReplyCosts, replyUsageRecorder };
