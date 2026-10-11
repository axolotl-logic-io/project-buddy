import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { readChatRequest } from "@/tutor/chat-protocol.ts";
import { replyToChat } from "@/tutor/reply.ts";

// The longest a reply may run, in seconds, including the part that finishes
// after the browser disconnects: Vercel Hobby's maximum.
export const maxDuration = 300;

// Answers 400 with the unknown case, unlogged, unless the body is a chat
// request: only a broken or forged client sends one.
export async function POST(request: Request): Promise<Response> {
  const chatRequest = await readChatRequest(request);
  if (chatRequest === undefined) {
    return appErrorResponse("unknown", HTTP_STATUS.badRequest);
  }
  return replyToChat(chatRequest);
}
