// Which conversation a chat request asks the buddy to answer. The browser
// may send a message again, such as after a lost connection: a message the
// chat holds unanswered is answered once more, and an answered one gets no
// second reply. Of two requests that send one new message at once, only the
// one that saves it is answered, and a message sent again while another
// request still replies to it is not answered again: each reply is made
// under a claim on its message (claimReply in src/chats/store.ts), which
// the request that answers releases if its reply fails. Nothing is answered
// once the owner's monthly quota is used up (src/quota/quota.ts).
import type { UIMessage } from "ai";
import type { Chat } from "@/chats/chat-rows.ts";
import { claimReply, listMessages, saveMessage } from "@/chats/store.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { UserId } from "@/ids.ts";
import { checkQuota, type QuotaGrant } from "@/quota/quota.ts";
import {
  type ChatRequest,
  quotaUsedUpResponse,
} from "@/replies/chat-protocol.ts";

// What a chat request answers: a reply to the conversation that ends with
// its message, with the quota grant its model calls are made from, or a
// refusal that gets no reply.
type ConversationToAnswer =
  | {
      readonly kind: "reply";
      readonly conversation: UIMessage[];
      readonly grant: QuotaGrant;
    }
  | { readonly kind: "refused"; readonly response: Response };

// A message the history holds with anything after it has been answered, and
// one another request saved or claimed meanwhile is answered by that
// request. The
// browser reloads the saved conversation instead. Each refusal is a new
// response, since a response's body can be read only once.
function alreadyAnswered(): ConversationToAnswer {
  return {
    kind: "refused",
    response: appErrorResponse("already-answered", HTTP_STATUS.conflict),
  };
}

// A message whose id another chat's message has is refused, unlogged, as a
// malformed request is: only a broken or forged client sends one.
function idTaken(): ConversationToAnswer {
  return {
    kind: "refused",
    response: appErrorResponse("unknown", HTTP_STATUS.badRequest),
  };
}

// A message that would be answered once the owner's quota is used up is
// refused, unsaved, as too many requests until the quota resets at
// resetsOn, which the refusal carries for the browser to name.
function quotaUsedUp(resetsOn: Date): ConversationToAnswer {
  return { kind: "refused", response: quotaUsedUpResponse(resetsOn) };
}

// The conversation a reply in the owner's chat answers, with message saved
// as its last message, and claimed for this request's reply. A message the
// history holds last, whose reply failed or was never saved, is answered
// again from the history, unsaved a second time, once this request claims
// it; one another request still replies to is refused as already answered,
// as is one with anything after it, and one missing from the history but
// saved by another request by the time this one saves it, since that
// request answers it. Either is refused, and a new one isn't saved, once the
// quota is used up. The caller releases the claim if its reply fails.
async function conversationToAnswer(
  owner: UserId,
  chat: Chat,
  message: ChatRequest["message"],
): Promise<ConversationToAnswer> {
  const [saved, quota] = await Promise.all([
    listMessages(owner, chat.id),
    checkQuota(owner),
  ]);
  const held = saved.findIndex(({ id }) => id === message.id);
  if (held !== -1 && held < saved.length - 1) {
    return alreadyAnswered();
  }
  if (quota.kind === "usedUp") {
    return quotaUsedUp(quota.resetsOn);
  }
  if (held !== -1) {
    if (!(await claimReply(owner, chat.id, message.id))) {
      return alreadyAnswered();
    }
    return { kind: "reply", conversation: saved, grant: quota.grant };
  }
  const saving = await saveMessage(owner, chat.id, message);
  switch (saving) {
    case "inserted":
      return {
        kind: "reply",
        conversation: [...saved, message],
        grant: quota.grant,
      };
    case "already-saved":
      return alreadyAnswered();
    case "id-taken":
      return idTaken();
    default:
      return saving satisfies never;
  }
}

export type { ConversationToAnswer };
export { conversationToAnswer };
