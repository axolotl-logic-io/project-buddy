// The wire protocol between the chat view and /api/chat, shared by both
// sides. A request carries the chat id and only the new user message; the
// server loads the history. A failure travels as app-error.ts encodes it: as
// the body of a failed response before the reply streams, and as the
// stream's error text after. The browser imports this module, so it imports
// nothing server-only.
import { DefaultChatTransport, type UIMessage } from "ai";
import { z } from "zod";
import { type AppErrorCase, readAppErrorCase } from "@/errors/app-error.ts";
import { type ChatId, parseChatId } from "@/ids.ts";

const CHAT_API_PATH = "/api/chat";

// The user's new message. Unknown fields are dropped, so only these are
// saved.
const USER_MESSAGE = z.object({
  id: z.string().min(1),
  role: z.literal("user"),
  parts: z
    .array(z.object({ type: z.literal("text"), text: z.string().min(1) }))
    .min(1),
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

// The case of a failed request or reply. useChat raises both as an Error
// whose message is the text the server or the proxy sent.
function chatFailureCase(error: Error): AppErrorCase {
  return readAppErrorCase(error.message);
}

export type { ChatRequest };
export { CHAT_API_PATH, CHAT_TRANSPORT, chatFailureCase, readChatRequest };
