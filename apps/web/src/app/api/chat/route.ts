import { currentUser } from "@/auth/current-user.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { readChatRequest } from "@/replies/chat-protocol.ts";
import { replyToChat } from "@/replies/reply.ts";

// The longest a reply may run, in seconds, including the part that finishes
// after the browser disconnects: Vercel Hobby's maximum.
export const maxDuration = 300;

// Replies in the signed-in user's chat. A request without a signed-in user
// answers 401 with the signed-out case, which the chat shows with a sign-in
// link. A body that isn't a chat request answers 400 with the unknown case,
// unlogged: only a broken or forged client sends one. A failure to read the
// user is logged once and answers 500 with its case.
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    const chatRequest = await readChatRequest(request);
    if (chatRequest === undefined) {
      return appErrorResponse("unknown", HTTP_STATUS.badRequest);
    }
    return await replyToChat(user.id, chatRequest);
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "chat request").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}
