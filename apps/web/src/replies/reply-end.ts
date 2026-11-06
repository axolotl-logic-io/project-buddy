// What happens to a reply once its stream ends: a completed reply is saved,
// without its provider bookkeeping or the instructions of an activity it
// entered, and the chat named if due; a reply that isn't saved releases its message's
// claim (claimReply in src/chats/store.ts), so the browser can send the
// message again at once.
import type { UIMessage, UIMessageStreamOnEndCallback } from "ai";
import { after } from "next/server";
import { withoutActivityInstructions } from "@/activities/select-activity-contract.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { releaseReply, saveReply } from "@/chats/store.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import type { MessageId, UserId } from "@/ids.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { nameChatIfDue } from "@/replies/chat-naming.ts";
import { withoutProviderBookkeeping } from "@/replies/provider-bookkeeping.ts";

// The reply that ended: the acting user's chat it is in, the grant naming the chat
// is made from, the id of the message it answers, and the conversation it
// answers, which naming reads.
interface EndedReply {
  readonly cancelled?: boolean;
  readonly accountingFinished?: () => Promise<void>;
  readonly actingUser: UserId;
  readonly chat: Chat;
  readonly grant: QuotaGrant;
  readonly answeredId: MessageId;
  // The conversation the reply answers, ending with the answered message.
  readonly history: readonly UIMessage[];
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
// The stream stays open until this resolves, so naming, which never
// rejects, isn't awaited.
async function endReply(
  {
    actingUser,
    chat,
    grant,
    answeredId,
    history,
    cancelled,
    accountingFinished,
  }: EndedReply,
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
    const savedReply = withoutActivityInstructions(
      withoutProviderBookkeeping(responseMessage),
    );
    await saveReply(actingUser, chat.id, savedReply, answeredId);
    if (cancelled === true) {
      await accountingFinished?.();
    } else {
      after(async (): Promise<void> => {
        try {
          await nameChatIfDue(grant, chat.id, [...history, savedReply]);
        } finally {
          await accountingFinished?.();
        }
      });
    }
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
