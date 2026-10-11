import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { chatFailureResponse, readChatRequest } from "@/tutor/chat-protocol.ts";
import { replyToChat } from "@/tutor/reply.ts";

// The longest a reply may run, in seconds, including the part that finishes
// after the browser disconnects: Vercel Hobby's maximum.
export const maxDuration = 300;

// Answers 400 unless the body is a chat request.
export async function POST(request: Request): Promise<Response> {
  const chatRequest = await readChatRequest(request);
  if (chatRequest === undefined) {
    const failure = toAppError(
      new Error("The body is not a chat request."),
      "POST /api/chat",
    );
    return chatFailureResponse(failure.errorCase, HTTP_STATUS.badRequest);
  }
  return replyToChat(chatRequest);
}
