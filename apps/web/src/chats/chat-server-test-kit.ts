// For server tests of chatting: her messages, sent through POST /api/chat
// as the chat view sends them, the replies the mock tutor writes, and her
// monthly spend. These are what src/test-database/'s kit lacks; #341's last
// part merges the two. A test file that calls postMessage replaces
// next/server's after() with next-server-test-kit.ts's, and awaits its
// settleAfterTasks() to read what a reply's later work saved.
import type { UIMessage } from "ai";
import type { User } from "@/accounts/users-store.ts";
import { POST } from "@/app/api/chat/route.ts";
import type { BuddyId } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { type MessageId, parseMessageId } from "@/ids.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import { quotaResetsOn } from "@/quota/quota-terms.ts";
import { readMonthlyUsage, recordSpend } from "@/quota/spend-store.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import {
  requestWithSession,
  signIn,
} from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import { CHAT_API_PATH, type ChatRequest } from "@/tutor/chat-protocol.ts";
import {
  defaultMockScript,
  type MockConversation,
} from "@/tutor/mock-script.ts";

// Where the requests go; the route reads only the body and the cookies.
const CHAT_API_URL = `http://localhost${CHAT_API_PATH}`;

// A conversation with nothing before her message, as the mock reads it.
const NO_CONVERSATION: MockConversation = {
  systemTexts: [],
  earlierTexts: [],
  toolResults: [],
  answerNow: false,
};

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

// Her message saying text, under id or a new one.
function question(
  text: string,
  id: MessageId = newMessageId(),
): ChatRequest["message"] {
  return { id, role: "user", parts: [{ type: "text", text }] };
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
  return POST(
    requestWithSession(CHAT_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: chat.id, message }),
      signal,
    }),
  );
}

// The text of message's text parts, joined.
function replyText(message: UIMessage | undefined): string {
  return (message?.parts ?? [])
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("");
}

// The whole of the mock tutor's reply to her message userText, in a chat
// with no tool calls.
function mockReplyText(userText: string): string {
  return defaultMockScript(userText, NO_CONVERSATION)
    .map(({ text }) => text)
    .join("");
}

// A saved message as these tests compare them: who wrote it, and its text.
interface SavedLine {
  readonly role: UIMessage["role"];
  readonly text: string;
}

// The messages saved in user's chat, oldest first, as lines.
async function savedConversation(
  user: User,
  chat: Pick<Chat, "id">,
): Promise<SavedLine[]> {
  return (await listMessages(user.id, chat.id)).map((message) => ({
    role: message.role,
    text: replyText(message),
  }));
}

// Her message userText and the mock tutor's reply to it, as lines.
function exchange(userText: string): SavedLine[] {
  return [
    { role: "user", text: userText },
    { role: "assistant", text: mockReplyText(userText) },
  ];
}

// Adds microUsd to user's spend this month (UTC), as their model calls
// would, and the same to next month's, so a test that crosses a month's end
// still finds it, as e2e/fixtures.ts's spend does.
async function spend(user: User, microUsd: number): Promise<void> {
  const now = new Date();
  await recordSpend(user.id, microUsd, now);
  await recordSpend(user.id, microUsd, quotaResetsOn(now));
}

// What user's model calls have cost this month (UTC), in micro-dollars.
async function spentThisMonth(user: User): Promise<number> {
  return (await readMonthlyUsage(user.id, new Date())).spentMicroUsd;
}

// A section of a made-up manual page, for a test's own sections
// (testData.manualSections), with the URL the app links its citation to.
function manualSection(
  page: string,
  anchor: string,
  title: string,
  text: string,
): ManualSection {
  const filePath = `manual/${page}.rst`;
  return { title, text, filePath, anchor, url: manualUrl(filePath, anchor) };
}

export type { SavedLine };
export {
  exchange,
  manualSection,
  mockReplyText,
  newMessageId,
  postMessage,
  question,
  replyText,
  savedConversation,
  spend,
  spentThisMonth,
  userWithChat,
};
