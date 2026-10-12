// Which conversation a chat request asks the tutor to answer. The browser
// may send a message again, such as after a lost connection: a message the
// chat holds unanswered is answered once more, and an answered one gets no
// second reply. Of two requests that send one new message at once, only the
// one that saves it is answered. Nothing is answered once the owner's monthly quota is used
// up (src/quota/quota.ts).
import type { UIMessage } from "ai";
import type { ChatWithProject } from "@/chats/chat-rows.ts";
import { listMessages, saveMessage } from "@/chats/store.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { UserId } from "@/ids.ts";
import { checkQuota } from "@/quota/quota.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";

// What a chat request answers: a reply to the conversation that ends with
// its message, or a refusal that gets no reply.
type ConversationToAnswer =
  | { readonly kind: "reply"; readonly conversation: UIMessage[] }
  | { readonly kind: "refused"; readonly response: Response };

// A message the history holds with anything after it has been answered, and
// one another request saved meanwhile is answered by that request. The
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
// refused, unsaved, as too many requests until the quota resets. The
// browser names the reset day (src/quota/quota-terms.ts).
function quotaUsedUp(): ConversationToAnswer {
  return {
    kind: "refused",
    response: appErrorResponse("quota-used-up", HTTP_STATUS.tooManyRequests),
  };
}

// The conversation a reply in the owner's chat answers, with message saved
// as its last message. A message the history holds last, whose reply failed
// or was never saved, is answered again from the history, unsaved a second
// time; one with anything after it is refused as already answered, and so is
// one missing from the history but saved by another request by the time this
// one saves it, since that request answers it. Either is refused, and a new
// one isn't saved, once the quota is used up.
async function conversationToAnswer(
  owner: UserId,
  chat: ChatWithProject,
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
    return quotaUsedUp();
  }
  if (held !== -1) {
    return { kind: "reply", conversation: saved };
  }
  const saving = await saveMessage(owner, chat.id, message);
  switch (saving) {
    case "inserted":
      return { kind: "reply", conversation: [...saved, message] };
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
