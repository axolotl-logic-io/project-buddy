// For server tests of chatting: the user's messages, sent through POST
// /api/chat as the chat view sends them, the replies the mock tutor writes,
// and readers of what the route saved. A reply's later work runs in
// next/server's after(), which the setup file (vitest.server-setup.ts)
// mocks with after-test-kit.ts's. sendChatMessage, and what builds on it,
// awaits afterTasksDone() before it answers; a test that reads what a
// postMessage reply saved awaits it first.
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import { POST } from "@/app/api/chat/route.ts";
import { currentUser } from "@/auth/current-user.ts";
import type { BuddyId } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { type ChatId, type MessageId, parseMessageId } from "@/ids.ts";
import { afterTasksDone } from "@/test-database/after-test-kit.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import {
  requestWithSession,
  signIn,
} from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import { CHAT_API_PATH, type ChatRequest } from "@/tutor/chat-protocol.ts";
import { mockReplyText } from "@/tutor/mock-markdown-test-kit.ts";
import { streamChunks } from "@/tutor/stream-body-test-kit.ts";
import {
  CITE_MANUAL_OUTPUT,
  CITE_MANUAL_TOOL,
} from "@/tutor/tools/cite-manual-contract.ts";
import {
  UPDATE_MEMORY_OUTPUT,
  UPDATE_MEMORY_TOOL,
  type UpdateMemoryOutput,
} from "@/tutor/tools/update-memory-contract.ts";

// Where the requests go; the route reads only the body and the cookies.
const CHAT_API_URL = `http://localhost${CHAT_API_PATH}`;

// A citation under a saved reply: the section's label and its link.
type Citation = z.infer<typeof CITE_MANUAL_OUTPUT>["citations"][number];

// A cite_manual call of a saved reply that returned its citations.
const CITE_MANUAL_PART = z.object({
  type: z.literal(`tool-${CITE_MANUAL_TOOL}`),
  state: z.literal("output-available"),
  output: CITE_MANUAL_OUTPUT,
});

// What the route answered to one message, whatever its status.
interface SentMessage {
  readonly status: number;
  // The response body, read to its end.
  readonly body: string;
  // The body's stream chunks, for a reply.
  readonly chunks: ReturnType<typeof streamChunks>;
}

// A saved message as these tests compare them: who wrote it, and its text.
interface SavedLine {
  readonly role: UIMessage["role"];
  readonly text: string;
}

// A new user, and a new chat of theirs in a new project, in the voice of
// buddyId or the default buddy.
async function userWithChat(
  buddyId?: BuddyId,
): Promise<{ user: User; chat: Chat }> {
  const user = await testUser();
  const data = testData(user);
  const chat = await data.chat(await data.project(), buddyId);
  return { user, chat };
}

// A new message id, as the AI SDK makes one in the browser.
function newMessageId(): MessageId {
  const id = parseMessageId(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("A random UUID is not a message id");
  }
  return id;
}

// The user's message saying text, under id or a new one.
function question(
  text: string,
  id: MessageId = newMessageId(),
): ChatRequest["message"] {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

// Posts message to the chat with chatId, with the test's session, as the
// chat view does.
function postToChat(
  chatId: string,
  message: ChatRequest["message"],
  signal: AbortSignal | null = null,
): Promise<Response> {
  return POST(
    requestWithSession(CHAT_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: chatId, message }),
      signal,
    }),
  );
}

// Sends text as the signed-in user's newest message in the chat with chatId,
// and answers once the body is read to its end and every after() task it
// started, and any they start, is done: by then the route has saved all it
// saves, such as the reply and the chat's name.
async function sendChatMessage(
  chatId: string,
  text: string,
): Promise<SentMessage> {
  const response = await postToChat(chatId, question(text));
  const body = await response.text();
  await afterTasksDone();
  return { status: response.status, body, chunks: streamChunks(body) };
}

// Sends text in the chat as the signed-in user, as sendChatMessage does, and
// returns the reply as saved. Rejects unless the route took the message.
async function tutorReply(chatId: ChatId, text: string): Promise<UIMessage> {
  const user = await currentUser();
  if (user === undefined) {
    throw new Error("Sign the test user in before chatting");
  }
  const { status } = await sendChatMessage(chatId, text);
  if (status !== HTTP_STATUS.ok) {
    throw new Error(`The chat answered ${status}`);
  }
  const reply = (await listMessages(user.id, chatId)).at(-1);
  if (reply?.role !== "assistant") {
    throw new Error("The tutor's reply was not saved");
  }
  return reply;
}

// The words of a message: its text parts, joined, or none for no message.
function messageText(message: UIMessage | undefined): string {
  return (message?.parts ?? [])
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("");
}

// The tutor's system prompt in the chat, as the mock tutor quotes it.
async function tutorPrompt(chatId: ChatId): Promise<string> {
  return messageText(await tutorReply(chatId, "/mock-system-prompt"));
}

// Has the mock tutor in the chat change the project's memory, replacing
// oldText with newText (an empty oldText adds newText at the end), and
// returns what the update_memory tool answered.
async function tutorEdits(
  chatId: ChatId,
  oldText: string,
  newText: string,
): Promise<UpdateMemoryOutput> {
  const edit = JSON.stringify({ oldText, newText });
  const reply = await tutorReply(
    chatId,
    `/mock-tool ${UPDATE_MEMORY_TOOL} ${edit}`,
  );
  const call = reply.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === UPDATE_MEMORY_TOOL,
  );
  if (call === undefined || !("output" in call)) {
    throw new Error("The tutor didn't change the memory");
  }
  return UPDATE_MEMORY_OUTPUT.parse(call.output);
}

// Sends message to the chat as user, signed in, as the chat view does. It
// resolves once the server has claimed the message and the reply has
// started streaming in the response's body; reading the body to its end
// waits for the reply to be saved. Calls run one at a time: each signs in
// through the test's one cookie jar.
async function postMessage(
  user: User,
  chat: Pick<Chat, "id">,
  message: ChatRequest["message"],
  signal: AbortSignal | null = null,
): Promise<Response> {
  await signIn(user);
  return postToChat(chat.id, message, signal);
}

// Sends text to the chat as user, as postMessage does, and reads the reply
// to its end, by which time the reply is saved. Rejects unless the server
// took the message.
async function sendToEnd(
  user: User,
  chat: Pick<Chat, "id">,
  text: string,
): Promise<void> {
  const response = await postMessage(user, chat, question(text));
  if (response.status !== HTTP_STATUS.ok) {
    throw new Error(`Sending "${text}" answered ${response.status}`);
  }
  await response.text();
}

// A form's data, as the browser posts it to a Server Action.
function formOf(fields: Readonly<Record<string, string>>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

// The messages saved in user's chat, oldest first, as lines.
async function savedConversation(
  user: User,
  chat: Pick<Chat, "id">,
): Promise<SavedLine[]> {
  return (await listMessages(user.id, chat.id)).map((message) => ({
    role: message.role,
    text: messageText(message),
  }));
}

// The user's message userText and the mock tutor's reply to it, as lines.
function exchange(userText: string): SavedLine[] {
  return [
    { role: "user", text: userText },
    { role: "assistant", text: mockReplyText(userText) },
  ];
}

// The sections a saved reply cites, in its order, from its cite_manual
// calls.
function citedSections(message: UIMessage): Citation[] {
  return message.parts.flatMap((part) => {
    const cited = CITE_MANUAL_PART.safeParse(part);
    if (cited.success) {
      return cited.data.output.citations;
    }
    return [];
  });
}

export type { Citation, SavedLine, SentMessage };
export {
  citedSections,
  exchange,
  formOf,
  messageText,
  newMessageId,
  postMessage,
  question,
  savedConversation,
  sendChatMessage,
  sendToEnd,
  tutorEdits,
  tutorPrompt,
  tutorReply,
  userWithChat,
};
