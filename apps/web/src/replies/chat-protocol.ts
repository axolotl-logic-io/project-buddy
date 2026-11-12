// The wire protocol between the chat view and /api/chat, shared by both
// sides. A request carries the chat id and only the new user message; the
// server loads the history. A failure travels as app-error.ts encodes it: as
// the body of a failed response before the reply streams, and as the
// stream's error text after. The browser imports this module, so it
// imports nothing server-only.

import { DefaultChatTransport, type UIMessage } from "ai";
import { z } from "zod";
import {
  type AppErrorCase,
  appErrorResponse,
  isUnrecognisedCaseName,
  readAppErrorCase,
} from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { type ChatId, MESSAGE_ID, parseChatId } from "@/ids.ts";
import {
  IMAGE_FILE_PART,
  MAX_MESSAGE_IMAGES,
} from "@/images/image-contract.ts";

const CHAT_API_PATH = "/api/chat";

// The user's new message. Unknown fields are dropped, so only these are
// saved. Its id is the AI SDK's, made in the browser.
const USER_MESSAGE = z.object({
  id: MESSAGE_ID,
  role: z.literal("user"),
  parts: z
    .array(
      z.union([
        z.object({ type: z.literal("text"), text: z.string().min(1) }),
        IMAGE_FILE_PART,
      ]),
    )
    .min(1)
    .refine(
      (parts) =>
        parts.filter((part) => part.type === "file").length <=
        MAX_MESSAGE_IMAGES,
    ),
});

const CHAT_REQUEST_BODY = z.object({ id: z.string(), message: USER_MESSAGE });

// A request to reply in a chat, as the server reads it.
interface ChatRequest {
  readonly chatId: ChatId;
  readonly message: z.infer<typeof USER_MESSAGE>;
}

// The request body ChatView sends: the chat id and its newest message.
function newMessageBody({
  id,
  messages,
}: {
  id: string;
  messages: UIMessage[];
}): { body: { id: string; message: UIMessage | undefined } } {
  return { body: { id, message: messages.at(-1) } };
}

// The transport ChatView's useChat sends requests through.
const CHAT_TRANSPORT = new DefaultChatTransport<UIMessage>({
  api: CHAT_API_PATH,
  prepareSendMessagesRequest: newMessageBody,
});

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

// The request's chat id and new message, or undefined unless the body is
// JSON in this protocol's shape with a UUID chat id.
async function readChatRequest(
  request: Request,
): Promise<ChatRequest | undefined> {
  const parsed = CHAT_REQUEST_BODY.safeParse(await readJson(request));
  if (!parsed.success) {
    return undefined;
  }
  const chatId = parseChatId(parsed.data.id);
  if (chatId === undefined) {
    return undefined;
  }
  return { chatId, message: parsed.data.message };
}

// The refusal of a message once the acting user is out of gold: 429, with the
// out-of-gold case as its body.
function outOfGoldResponse(): Response {
  return appErrorResponse("out-of-gold", HTTP_STATUS.tooManyRequests);
}

// The case of a failed request or reply. useChat raises both as an Error
// whose message is the text the server or the proxy sent: a case name.
// Any other text is the unknown case.
function chatFailureCase(error: Error): AppErrorCase {
  return readAppErrorCase(error.message);
}

// Whether a failed request or reply names a case this build doesn't know,
// so came from a newer build; chatFailureCase reads it as the unknown case.
function isFromNewerBuild(error: Error): boolean {
  return isUnrecognisedCaseName(error.message);
}

export type { ChatRequest };
export {
  CHAT_API_PATH,
  CHAT_TRANSPORT,
  chatFailureCase,
  isFromNewerBuild,
  outOfGoldResponse,
  readChatRequest,
};
