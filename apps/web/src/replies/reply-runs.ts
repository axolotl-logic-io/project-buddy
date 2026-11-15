import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { replyRunOpenTo, replyRunOwnedBy } from "@/accounts/owner-scope.ts";
import { type Database, getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { replyRuns } from "@/db/tables/reply-runs.ts";
import type { ChatId, MessageId, QuestId, UserId } from "@/ids.ts";

const RUN_STATUS = z.enum(["active", "completed", "cancelled", "failed"]);
type RunStatus = z.infer<typeof RUN_STATUS>;
const controllers = new Map<string, AbortController>();
const CANCEL_CHECK_MS = 250;

async function beginReplyRun(
  owner: UserId,
  chatId: ChatId,
  messageId: MessageId,
): Promise<string> {
  const [run] = await getDb()
    .insert(replyRuns)
    .values({ userId: owner, chatId, messageId })
    .returning({ id: replyRuns.id });
  return z.uuid().parse(run?.id);
}

// Whether the run should stop: someone asked it to, or its user is no
// longer in the quest, so the run isn't theirs to read (endRepliesOf).
async function cancellationRequested(
  owner: UserId,
  id: string,
): Promise<boolean> {
  const [run] = await getDb()
    .select({
      requested: replyRuns.cancelRequested,
      status: replyRuns.status,
    })
    .from(replyRuns)
    .where(and(replyRunOwnedBy(owner), eq(replyRuns.id, id)));
  return run === undefined || run.requested || run.status === "cancelled";
}

// Ends, in db (the removal's transaction), the active reply runs that
// person started in the quest's conversation, as actor, who removes them
// from the quest: each is marked cancelled, and its worker, which can no
// longer save into the quest, stops at its next check.
async function endRepliesOf(
  db: Database,
  actor: UserId,
  removal: { readonly questId: QuestId; readonly person: UserId },
): Promise<void> {
  await db
    .update(replyRuns)
    .set({ cancelRequested: true, status: "cancelled" })
    .where(
      and(
        replyRunOpenTo(actor),
        eq(replyRuns.userId, removal.person),
        eq(replyRuns.status, "active"),
        inArray(
          replyRuns.chatId,
          db
            .select({ id: chats.id })
            .from(chats)
            .where(eq(chats.questId, removal.questId)),
        ),
      ),
    );
}

// The response only acknowledges the request; cancelled is reported only
// once the worker has saved its partial reply and released its claim.
async function stopReply(
  owner: UserId,
  chatId: ChatId,
  messageId: MessageId,
): Promise<RunStatus | "not-found"> {
  const [run] = await getDb()
    .select()
    .from(replyRuns)
    .where(
      and(
        replyRunOpenTo(owner),
        eq(replyRuns.chatId, chatId),
        eq(replyRuns.messageId, messageId),
      ),
    )
    .orderBy(desc(replyRuns.createdAt))
    .limit(1);
  if (run === undefined) {
    return "not-found";
  }
  const status = RUN_STATUS.parse(run.status);
  if (status !== "active") {
    return status;
  }
  await getDb()
    .update(replyRuns)
    .set({ cancelRequested: true })
    .where(
      and(
        replyRunOpenTo(owner),
        eq(replyRuns.id, run.id),
        eq(replyRuns.status, "active"),
      ),
    );
  controllers.get(run.id)?.abort();
  return "active";
}

async function finishReplyRun(
  owner: UserId,
  id: string,
  status: Exclude<RunStatus, "active">,
): Promise<void> {
  await getDb()
    .update(replyRuns)
    .set({ status })
    .where(and(replyRunOwnedBy(owner), eq(replyRuns.id, id)));
}

// Poll only during an active reply, for cancellation sent to another worker.
// Failed reads abort conservatively; they must never claim a successful Stop.
function watchReplyCancellation(
  owner: UserId,
  id: string,
): {
  readonly signal: AbortSignal;
  readonly check: () => Promise<void>;
  readonly close: () => void;
} {
  const controller = new AbortController();
  controllers.set(id, controller);
  async function check(): Promise<void> {
    if (await cancellationRequested(owner, id)) {
      controller.abort();
    }
    controller.signal.throwIfAborted();
  }
  function failed(): void {
    controller.abort();
  }
  const timer = setInterval(() => check().catch(failed), CANCEL_CHECK_MS);
  return {
    signal: controller.signal,
    check,
    close: (): void => {
      clearInterval(timer);
      controllers.delete(id);
    },
  };
}

export {
  beginReplyRun,
  cancellationRequested,
  endRepliesOf,
  finishReplyRun,
  stopReply,
  watchReplyCancellation,
};
