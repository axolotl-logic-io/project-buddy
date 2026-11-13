import type { UIMessage, UIMessageStreamOnEndCallback } from "ai";
import type { Chat } from "@/chats/chat-rows.ts";
import { releaseReply, saveReply } from "@/chats/store.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import type { MessageId, UserId } from "@/ids.ts";
import { withoutProviderBookkeeping } from "@/replies/provider-bookkeeping.ts";

// The reply that ended: the acting user's chat it is in and the id of the
// message it answers.
interface EndedReply {
  readonly cancelled?: boolean;
  readonly accountingFinished?: () => Promise<void>;
  readonly actingUser: UserId;
  readonly chat: Chat;
  readonly answeredId: MessageId;
}

// Releases this request's claim to reply to answeredId. It never rejects: a
// failure is logged, and the claim then lapses after REPLY_CLAIM_SECONDS.
async function releaseClaim(
  actingUser: UserId,
  chat: Chat,
  answeredId: MessageId,
): Promise<void> {
  try {
    await releaseReply(actingUser, chat.id, answeredId);
  } catch (error) {
    toAppError(error, "release reply claim");
  }
}

// Saves a completed reply, or releases the claim of one that isn't saved. A
// saved reply keeps its claim, since the reply saved after the message
// already makes it answered. The browser's copy of the reply shares the
// stream, so a failed save is logged here rather than failing the stream.
// The stream stays open until this resolves.
async function endReply(
  { actingUser, chat, answeredId, cancelled, accountingFinished }: EndedReply,
  {
    responseMessage,
    outcome,
  }: Parameters<UIMessageStreamOnEndCallback<UIMessage>>[0],
): Promise<boolean> {
  if (outcome.status !== "completed") {
    await releaseClaim(actingUser, chat, answeredId);
    await accountingFinished?.();
    return false;
  }
  try {
    const savedReply = withoutProviderBookkeeping(responseMessage);
    await saveReply(actingUser, chat.id, savedReply, answeredId);
    await accountingFinished?.();
    return true;
  } catch (error) {
    toAppError(error, "save chat reply");
    await releaseClaim(actingUser, chat, answeredId);
    if (cancelled === true) {
      throw error;
    }
    await accountingFinished?.();
    return false;
  }
}

export { endReply, releaseClaim };
