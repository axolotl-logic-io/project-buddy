// Which conversation a chat request asks the tutor to answer. The browser
// may send a message again, such as after a lost connection: a message the
// chat holds unanswered is answered once more, and an answered one gets no
// second reply.
import type { UIMessage } from "ai";
import type { ChatWithProject } from "@/chats/chat-rows.ts";
import { listMessages, saveMessage } from "@/chats/store.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { UserId } from "@/ids.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";

// What a chat request answers: a reply to the conversation that ends with
// its message, or a refusal that gets no reply.
type ConversationToAnswer =
  | { readonly kind: "reply"; readonly conversation: UIMessage[] }
  | { readonly kind: "refused"; readonly response: Response };

// A message the history holds with anything after it has been answered.
// The browser reloads the saved conversation instead. Each refusal is a new
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

// The conversation a reply in the owner's chat answers, with message saved
// as its last message. A message the history holds last, whose reply failed
// or was never saved, is answered again from the history, unsaved a second
// time; one with anything after it is refused as already answered.
async function conversationToAnswer(
  owner: UserId,
  chat: ChatWithProject,
  message: ChatRequest["message"],
): Promise<ConversationToAnswer> {
  const saved = await listMessages(owner, chat.id);
  const held = saved.findIndex(({ id }) => id === message.id);
  if (held === -1) {
    if ((await saveMessage(owner, chat.id, message)) === "id-taken") {
      return idTaken();
    }
    return { kind: "reply", conversation: [...saved, message] };
  }
  if (held < saved.length - 1) {
    return alreadyAnswered();
  }
  return { kind: "reply", conversation: saved };
}

export type { ConversationToAnswer };
export { conversationToAnswer };
