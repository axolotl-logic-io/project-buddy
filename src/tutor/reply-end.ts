// What happens to a reply once its stream ends: a completed reply is saved
// and the chat named if due; a reply that isn't saved releases its message's
// claim (claimReply in src/chats/store.ts), so the browser can send the
// message again at once.
import type { UIMessage, UIMessageStreamOnEndCallback } from "ai";
import { after } from "next/server";
import type { ChatWithProject } from "@/chats/chat-rows.ts";
import { releaseReply, saveReply } from "@/chats/store.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import type { MessageId, UserId } from "@/ids.ts";
import type { QuotaGrant } from "@/quota/quota.ts";
import { nameChatIfDue } from "@/tutor/chat-naming.ts";
import { withoutProviderBookkeeping } from "@/tutor/provider-bookkeeping.ts";

// The reply that ended: the owner's chat it is in, the grant naming the chat
// is made from, the id of the message it answers, and the conversation it
// answers, which naming reads.
interface EndedReply {
  readonly owner: UserId;
  readonly chat: ChatWithProject;
  readonly grant: QuotaGrant;
  readonly answeredId: MessageId;
  // The conversation the reply answers, ending with the answered message.
  readonly history: readonly UIMessage[];
}

// Releases this request's claim to reply to answeredId. It never rejects: a
// failure is logged, and the claim then lapses after REPLY_CLAIM_SECONDS.
async function releaseClaim(
  owner: UserId,
  chat: ChatWithProject,
  answeredId: MessageId,
): Promise<void> {
  try {
    await releaseReply(owner, chat.id, answeredId);
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
  { owner, chat, grant, answeredId, history }: EndedReply,
  {
    responseMessage,
    outcome,
  }: Parameters<UIMessageStreamOnEndCallback<UIMessage>>[0],
): Promise<void> {
  if (outcome.status !== "completed") {
    await releaseClaim(owner, chat, answeredId);
    return;
  }
  try {
    const savedReply = withoutProviderBookkeeping(responseMessage);
    await saveReply(owner, chat.id, savedReply, answeredId);
    after(() => nameChatIfDue(grant, chat.id, [...history, savedReply]));
  } catch (error) {
    toAppError(error, "save chat reply");
    await releaseClaim(owner, chat, answeredId);
  }
}

export { endReply, releaseClaim };
