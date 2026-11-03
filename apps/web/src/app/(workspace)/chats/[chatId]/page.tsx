import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { getChat, listMessages, markChatRead } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";

// An on-screen keyboard shrinks the page rather than covering its bottom, so
// the pinned header and the composer both stay above it. Other pages keep
// the browser's default.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// One of the user's chats, in a project or standalone, by its id, with its
// saved messages as people see them, each with its author; not found if
// the chat is unknown or another user's.
// Opening a chat unread for the user, such as a check-in, marks it read for
// them alone.
export default async function ChatPage({
  params,
}: PageProps<"/chats/[chatId]">): Promise<JSX.Element> {
  const { chatId } = await params;
  const user = await requireUser();
  const chat = await getChat(user.id, chatId);
  if (chat === undefined) {
    notFound();
  }
  const [messages] = await Promise.all([
    listMessages(user.id, chat.id),
    chat.unread && markChatRead(user.id, chat.id),
  ]);
  return <ChatScreen chat={chat} messages={messages} viewer={user.id} />;
}
