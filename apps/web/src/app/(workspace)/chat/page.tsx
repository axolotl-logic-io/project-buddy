import type { Viewport } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { getOrCreateCentralChat } from "@/chats/central-chat.ts";
import { listMessages } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";

// An on-screen keyboard shrinks the page rather than covering its bottom, so
// the pinned header and the composer both stay above it. Every page but the
// two chat pages keeps the browser's default.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// The user's central chat, the one in no project, made on the first visit.
export default async function CentralChatPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const chat = await getOrCreateCentralChat(user.id);
  const messages = await listMessages(user.id, chat.id);
  return <ChatScreen chat={chat} messages={messages} />;
}
