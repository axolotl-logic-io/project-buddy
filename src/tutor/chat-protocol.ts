// The wire protocol between the chat view and /api/chat, shared by both
// sides. A request carries the chat id and only the new user message; the
// server loads the history. A failure travels as app-error.ts encodes it: as
// the body of a failed response before the reply streams, and as the
// stream's error text after. A quota-used-up refusal adds the day the
// quota resets, as the server decided it (quotaUsedUpResponse). The browser
// imports this module, so it imports nothing server-only.
import { DefaultChatTransport, type UIMessage } from "ai";
import { z } from "zod";
import {
  type AppErrorCase,
  isUnrecognisedCaseName,
  readAppErrorCase,
} from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { type ChatId, MESSAGE_ID, parseChatId } from "@/ids.ts";

const CHAT_API_PATH = "/api/chat";

// The user's new message. Unknown fields are dropped, so only these are
// saved. Its id is the AI SDK's, made in the browser.
const USER_MESSAGE = z.object({
  id: MESSAGE_ID,
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

// A failed request or reply, as the browser reads it: its case and, for a
// used-up quota, when the quota resets, or undefined if the server didn't
// say.
type ChatFailure =
  | {
      readonly errorCase: "quota-used-up";
      readonly resetsOn: Date | undefined;
    }
  | { readonly errorCase: Exclude<AppErrorCase, "quota-used-up"> };

// Separates a failure's case from the reset instant after it.
const FAILURE_LINE_BREAK = "\n";

// An ISO 8601 instant in UTC, such as "2026-11-01T00:00:00.000Z".
const RESET_INSTANT = z.iso.datetime();

// The refusal of a message once the owner's quota is used up: 429, with a
// body of two lines, the case name, which app-error.ts reads as it reads
// any other, and resetsOn as an ISO 8601 instant in UTC, such as
// "quota-used-up\n2026-11-01T00:00:00.000Z".
function quotaUsedUpResponse(resetsOn: Date): Response {
  const errorCase: AppErrorCase = "quota-used-up";
  return new Response(
    `${errorCase}${FAILURE_LINE_BREAK}${resetsOn.toISOString()}`,
    {
      status: HTTP_STATUS.tooManyRequests,
      headers: { "content-type": "text/plain; charset=utf-8" },
    },
  );
}

// The reset instant of a quota-used-up failure, or undefined unless line
// is one.
function readResetInstant(line: string | undefined): Date | undefined {
  const parsed = RESET_INSTANT.safeParse(line);
  if (!parsed.success) {
    return undefined;
  }
  return new Date(parsed.data);
}

// A failed request or reply. useChat raises both as an Error whose message
// is the text the server or the proxy sent: a case name alone, or a
// quota-used-up refusal's two lines (quotaUsedUpResponse). Any other text
// is the unknown case, and a quota-used-up refusal whose second line isn't
// an instant has no reset.
function readChatFailure(error: Error): ChatFailure {
  const [caseLine, resetLine, ...rest] =
    error.message.split(FAILURE_LINE_BREAK);
  const errorCase = readAppErrorCase(caseLine);
  if (errorCase === "quota-used-up") {
    if (rest.length > 0) {
      return { errorCase: "unknown" };
    }
    return { errorCase, resetsOn: readResetInstant(resetLine) };
  }
  if (resetLine !== undefined) {
    return { errorCase: "unknown" };
  }
  return { errorCase };
}

// The case of a failed request or reply (readChatFailure).
function chatFailureCase(error: Error): AppErrorCase {
  return readChatFailure(error).errorCase;
}

// Whether a failed request or reply names a case this build doesn't know,
// so came from a newer build; readChatFailure reads it as the unknown case.
function isFromNewerBuild(error: Error): boolean {
  return isUnrecognisedCaseName(error.message);
}

export type { ChatFailure, ChatRequest };
export {
  CHAT_API_PATH,
  CHAT_TRANSPORT,
  chatFailureCase,
  isFromNewerBuild,
  quotaUsedUpResponse,
  readChatFailure,
  readChatRequest,
};
