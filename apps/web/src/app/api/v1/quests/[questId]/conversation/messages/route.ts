import { generateId } from "ai";
import { z } from "zod";
import {
  apiData,
  apiNotFound,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { messageView } from "@/api/api-views.ts";
import { listMessages } from "@/chats/store.ts";
import { findConversation } from "@/conversations/conversation-store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { MESSAGE_ID } from "@/ids.ts";
import { replyToChat } from "@/replies/reply.ts";

const SEND_BODY = z.object({ text: z.string().trim().min(1) });

const SPELL_REQUIRED = "Cast a spell in this quest to send messages.";

const REPLY_IN_PROGRESS =
  "A reply is already running in this conversation. Send again once it ends.";

const RATE_LIMITED = "Too many messages at once. Wait, then send again.";

const REPLY_FAILED =
  "The construct couldn't reply. Your message is saved; send it again later.";

// The answer to a reply replyToChat refused, by its status.
function refusal(status: number): Response {
  switch (status) {
    case HTTP_STATUS.badRequest:
      return apiProblem("invalid_input", "The message can't be sent.", "text");
    case HTTP_STATUS.forbidden:
      return apiProblem("spell_required", SPELL_REQUIRED);
    case HTTP_STATUS.notFound:
      return apiNotFound();
    case HTTP_STATUS.conflict:
      return apiProblem("reply_in_progress", REPLY_IN_PROGRESS);
    case HTTP_STATUS.tooManyRequests:
      return apiProblem("rate_limited", RATE_LIMITED);
    default:
      return apiProblem("server_error", REPLY_FAILED);
  }
}

// The longest a reply may run, in seconds, as for the site's chat.
export const maxDuration = 300;

// Sends a message to the active spell and waits for its reply.
// Only one reply runs at a time in a conversation.
export const POST = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, SEND_BODY);
    if (body instanceof Response) {
      return body;
    }
    const conversation = await findConversation(user.id, quest.id);
    if (conversation === undefined) {
      return apiProblem("spell_required", SPELL_REQUIRED);
    }
    const chatId = conversation.id;
    const messageId = MESSAGE_ID.parse(generateId());
    const response = await replyToChat(user.id, {
      chatId,
      message: {
        id: messageId,
        role: "user",
        parts: [{ type: "text", text: body.text }],
      },
    });
    if (!response.ok) {
      return refusal(response.status);
    }
    // The reply is saved before its stream ends.
    await response.text();
    const messages = await listMessages(user.id, chatId);
    const sent = messages.findIndex(({ id }) => id === messageId);
    const reply = messages
      .slice(sent + 1)
      .find(({ role }) => role === "assistant");
    const message = messages[sent];
    if (sent < 0 || message === undefined || reply === undefined) {
      return apiProblem("reply_failed", REPLY_FAILED);
    }
    return apiData({
      state: "completed",
      conversationId: chatId,
      message: messageView(message),
      reply: messageView(reply),
    });
  },
);
